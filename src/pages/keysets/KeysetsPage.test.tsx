import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";

interface KeysetPage {
  data: unknown[];
  total: number;
}
interface QueryOptions {
  queryKey: { _id: string; query?: { limit?: number } }[];
}
interface InfiniteQueryResult {
  data: { pages: KeysetPage[] } | undefined;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => Promise<unknown>;
}

const mockUseInfiniteQuery = vi.fn<(options: QueryOptions) => InfiniteQueryResult>();
const fetchNextPageSpy = vi.fn<() => Promise<unknown>>();
let nextSearchQuery = "";

function mockKeysetPages(pages: KeysetPage[], options: { hasNextPage?: boolean } = {}) {
  mockUseInfiniteQuery.mockReturnValue({
    data: { pages },
    isLoading: false,
    hasNextPage: options.hasNextPage ?? false,
    isFetchingNextPage: false,
    fetchNextPage: fetchNextPageSpy,
  });
}

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: (options: QueryOptions) => mockUseInfiniteQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosInfiniteOptions: (options: { query?: { limit?: number } }) => ({
    queryKey: [{ _id: "listKeysetInfos", query: options.query }],
  }),
}));

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  const React = await vi.importActual<typeof import("react")>("react");
  const SelectContext = React.createContext<(value: string) => void>(vi.fn());

  return {
    ...actual,
    Search: ({ onChange, onSearch }: { onChange?: (value: string) => void; onSearch: (value: string) => void }) => (
      <button
        onClick={() => {
          onChange?.(nextSearchQuery);
          onSearch(nextSearchQuery);
        }}
        type="button"
      >
        SearchMock
      </button>
    ),
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: ReactElement | ReactElement[];
    }) => (
      <SelectContext.Provider value={onValueChange}>
        <div data-select-value={value}>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: ReactElement | string }) => <div>{children}</div>,
    SelectValue: () => <span>SelectValue</span>,
    SelectContent: ({ children }: { children: ReactElement | ReactElement[] }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: ReactElement | string | number }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button type="button" data-select-item={value} onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock("@/components/SortButtons", () => ({
  SortButtons: ({
    options,
    onSortChange,
  }: {
    options: { field: "maturity" | "status" | "currency"; label: string }[];
    onSortChange: (field: "maturity" | "status" | "currency") => void;
  }) => (
    <div>
      {options.map((option) => (
        <button key={option.field} onClick={() => onSortChange(option.field)} type="button">
          {`sort-${option.field}`}
        </button>
      ))}
    </div>
  ),
}));

import KeysetsPage from "./KeysetsPage";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderPage(): HTMLDivElement {
  return renderIntoDom(
    <IntlProvider locale="en">
      <MemoryRouter>
        <KeysetsPage />
      </MemoryRouter>
    </IntlProvider>
  );
}

function clickButtonByText(page: HTMLDivElement, label: string) {
  const button = Array.from(page.querySelectorAll("button")).find((node) => node.textContent === label);
  expect(button).not.toBeUndefined();
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickSelectItem(page: HTMLDivElement, value: string) {
  const button = page.querySelector(`[data-select-item="${value}"]`);
  expect(button).not.toBeNull();
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing select item: ${value}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function orderedKeysetHrefs(page: HTMLDivElement): string[] {
  const hrefs = Array.from(page.querySelectorAll('a[href^="/keysets/"]')).map((node) => node.getAttribute("href") ?? "");
  const unique: string[] = [];
  for (const href of hrefs) {
    if (!unique.includes(href)) {
      unique.push(href);
    }
  }
  return unique;
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
  vi.setSystemTime(new Date("2026-02-20T00:00:00.000Z"));
  nextSearchQuery = "";
  fetchNextPageSpy.mockResolvedValue(undefined);
});

describe("KeysetsPage", () => {
  it("shows empty state when no keysets are returned", () => {
    mockKeysetPages([{ data: [], total: 0 }]);

    const page = renderPage();
    expect(page.textContent).toContain("No keysets found");
  });

  it("renders inactive keyset without expiry", () => {
    mockKeysetPages([
      {
        data: [
          {
            id: "keyset-no-expiry",
            active: false,
            final_expiry: null,
            unit: { Custom: "usd" },
          },
        ],
        total: 1,
      },
    ]);

    const page = renderPage();
    expect(page.textContent).toContain("Inactive");
    expect(page.textContent).toContain("No expiry");
    expect(page.textContent).toContain("usd");
  });

  it("filters out all rows and shows no-match state from search", () => {
    mockKeysetPages([
      {
        data: [
          {
            id: "keyset-aaa",
            active: true,
            final_expiry: 1771545600,
            unit: "sat",
          },
          {
            id: "keyset-bbb",
            active: false,
            final_expiry: 1771632000,
            unit: { Custom: "usd" },
          },
        ],
        total: 2,
      },
    ]);
    nextSearchQuery = "definitely-missing";

    const page = renderPage();
    clickButtonByText(page, "SearchMock");

    expect(page.textContent).toContain("No keysets match your search criteria");
  });

  it("sorts by maturity, then currency, then status via sort controls", () => {
    mockKeysetPages([
      {
        data: [
          {
            id: "keyset-expired",
            active: true,
            final_expiry: 1735689600,
            unit: "sat",
          },
          {
            id: "keyset-future",
            active: false,
            final_expiry: 1798761600,
            unit: { Custom: "usd" },
          },
          {
            id: "keyset-no-expiry",
            active: false,
            final_expiry: null,
            unit: { Custom: "eur" },
          },
        ],
        total: 3,
      },
    ]);

    const page = renderPage();

    // Default maturity-asc: expired first, no-expiry last.
    expect(orderedKeysetHrefs(page)).toEqual(["/keysets/keyset-expired", "/keysets/keyset-future", "/keysets/keyset-no-expiry"]);

    // Currency-asc: eur, sat, usd.
    clickButtonByText(page, "sort-currency");
    expect(orderedKeysetHrefs(page)).toEqual(["/keysets/keyset-no-expiry", "/keysets/keyset-expired", "/keysets/keyset-future"]);

    // Status-asc in this implementation sorts active first.
    clickButtonByText(page, "sort-status");
    expect(orderedKeysetHrefs(page)[0]).toBe("/keysets/keyset-expired");
  });

  it("filters keysets through the dropdown", () => {
    mockKeysetPages([
      {
        data: [
          {
            id: "keyset-active",
            active: true,
            final_expiry: 1798761600,
            unit: "sat",
          },
          {
            id: "keyset-inactive",
            active: false,
            final_expiry: null,
            unit: { Custom: "usd" },
          },
        ],
        total: 2,
      },
    ]);

    const page = renderPage();
    clickSelectItem(page, "inactive");

    expect(orderedKeysetHrefs(page)).toEqual(["/keysets/keyset-inactive"]);
  });

  it("searches keysets that live on a later page", () => {
    mockKeysetPages([
      {
        data: [
          {
            id: "keyset-first-page",
            active: true,
            final_expiry: 1798761600,
            unit: "sat",
          },
        ],
        total: 2,
      },
      {
        data: [
          {
            id: "keyset-second-page",
            active: true,
            final_expiry: 1798761600,
            unit: { Custom: "usd" },
          },
        ],
        total: 2,
      },
    ]);
    nextSearchQuery = "keyset-second-page";

    const page = renderPage();
    clickButtonByText(page, "SearchMock");

    expect(orderedKeysetHrefs(page)).toEqual(["/keysets/keyset-second-page"]);
  });

  it("keeps loading keyset pages while the mint has more of them", () => {
    mockKeysetPages(
      [
        {
          data: [
            {
              id: "keyset-first-page",
              active: true,
              final_expiry: 1798761600,
              unit: "sat",
            },
          ],
          total: 2,
        },
      ],
      { hasNextPage: true }
    );
    nextSearchQuery = "keyset-second-page";

    const page = renderPage();
    clickButtonByText(page, "SearchMock");

    expect(fetchNextPageSpy).toHaveBeenCalled();
    expect(page.textContent).toContain("Loading all keysets...");
    // The no-match state would be wrong while pages are still on their way in.
    expect(page.textContent).not.toContain("No keysets match your search criteria");
  });

  it("requests keysets in pages", () => {
    mockKeysetPages([{ data: [], total: 0 }]);

    renderPage();

    expect(mockUseInfiniteQuery.mock.calls[0]?.[0]?.queryKey?.[0]?.query).toMatchObject({ limit: 100 });
  });
});
