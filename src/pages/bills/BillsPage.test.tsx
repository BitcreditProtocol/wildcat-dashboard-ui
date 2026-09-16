import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";

interface QueryOptions {
  queryKey: { _id: string }[];
}
interface QueryResult {
  data: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  error: Error | null;
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();
let nextSearchQuery = "";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
}));

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  return {
    ...actual,
    Search: ({ onChange, onSearch }: { onChange?: (value: string) => void; onSearch: (value: string) => void }) => (
      <button
        type="button"
        onClick={() => {
          onChange?.(nextSearchQuery);
          onSearch(nextSearchQuery);
        }}
      >
        SearchMock
      </button>
    ),
  };
});

import BillsPage from "./BillsPage";

function bill(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: { sum: "100", currency: "sat", maturity_date: "2026-03-01", files: [] },
    participants: {
      drawee: { name: "Alice", node_id: "drawee-node", type: "Company", country: "AT", city: "Vienna", address: "Ring 1" },
      drawer: { name: "Bob", node_id: "drawer-node", type: "Person", country: "AT", city: "Graz", address: "Hauptplatz 2" },
      payee: { Anon: { node_id: "payee-node", nostr_relays: [] } },
      endorsements: [],
      endorsements_count: 0,
      all_participant_node_ids: [],
    },
    status: { acceptance: { accepted: false }, payment: { paid: false, requested_to_pay: false } },
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderPage(): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      (
        <IntlProvider locale="en">
          <MemoryRouter>
            <BillsPage />
          </MemoryRouter>
        </IntlProvider>
      ) as ReactElement
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function clickSearch(page: HTMLDivElement) {
  const button = Array.from(page.querySelectorAll("button")).find((node) => node.textContent === "SearchMock");
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-16T08:00:00.000Z"));
  nextSearchQuery = "";
  mockUseQuery.mockReturnValue({
    data: [
      bill("bill-late", {
        data: { sum: "500", currency: "sat", maturity_date: "2027-05-01", files: [] },
        status: {
          acceptance: { accepted: true },
          payment: { paid: false, requested_to_pay: true },
          mint: { has_mint_requests: true },
          last_block_time: 1_780_000_000,
        },
      }),
      bill("bill-soon", {
        data: { sum: "100", currency: "sat", maturity_date: "2026-03-01", files: [] },
        status: { acceptance: { accepted: false }, payment: { paid: false, requested_to_pay: false }, last_block_time: 1_700_000_000 },
      }),
    ],
    isLoading: false,
    isFetching: false,
    error: null,
  });
});

function chip(page: HTMLDivElement, group: string, label: string) {
  return Array.from(page.querySelectorAll(`[role="group"][aria-label="${group}"] button`)).find((node) =>
    node.textContent?.trim().startsWith(label)
  );
}

function clickChip(page: HTMLDivElement, group: string, label: string) {
  const button = chip(page, group, label);
  expect(button, `Chip "${label}" not found`).not.toBeUndefined();
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function billOrder(page: HTMLDivElement) {
  return Array.from(page.querySelectorAll('a[href^="/bills/"]')).map((node) => node.getAttribute("href"));
}

describe("BillsPage", () => {
  it("lists bills with the soonest maturity first and links each to its detail page", () => {
    const page = renderPage();
    const links = Array.from(page.querySelectorAll('a[href^="/bills/"]')).map((node) => node.getAttribute("href"));

    expect(links).toEqual(["/bills/bill-soon", "/bills/bill-late"]);
    expect(page.textContent).toContain("Showing 2 of 2 bills");
    expect(page.textContent).toContain("Alice");
  });

  it("filters bills by the search query", () => {
    const page = renderPage();

    nextSearchQuery = "bill-late";
    clickSearch(page);

    expect(Array.from(page.querySelectorAll('a[href^="/bills/"]')).map((node) => node.getAttribute("href"))).toEqual(["/bills/bill-late"]);
  });

  it("filters to the bills that matured without being paid", () => {
    const page = renderPage();

    clickChip(page, "Show", "Matured, unpaid");
    expect(billOrder(page)).toEqual(["/bills/bill-soon"]);

    // Picking the active filter again clears it.
    clickChip(page, "Show", "Matured, unpaid");
    expect(billOrder(page)).toEqual(["/bills/bill-soon", "/bills/bill-late"]);
  });

  it("filters to the bills quoted at this mint", () => {
    const page = renderPage();

    clickChip(page, "Show", "Quoted at this mint");
    expect(billOrder(page)).toEqual(["/bills/bill-late"]);
  });

  it("cycles the sort field through ascending, descending and back to maturity", () => {
    const page = renderPage();

    clickChip(page, "Sort by", "Last activity");
    expect(billOrder(page)).toEqual(["/bills/bill-soon", "/bills/bill-late"]);

    clickChip(page, "Sort by", "Last activity");
    expect(billOrder(page)).toEqual(["/bills/bill-late", "/bills/bill-soon"]);

    clickChip(page, "Sort by", "Last activity");
    expect(chip(page, "Sort by", "Maturity")?.getAttribute("aria-pressed")).toBe("true");
    expect(billOrder(page)).toEqual(["/bills/bill-soon", "/bills/bill-late"]);
  });

  it("shows an empty state when no bills come back", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, isFetching: false, error: null });

    const page = renderPage();
    expect(page.textContent).toContain("No bills available.");
  });
});
