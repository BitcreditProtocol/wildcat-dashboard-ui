import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import React from "react";

interface QueryOptions {
  queryKey: { _id: string }[];
}
interface QueryResult {
  data: unknown;
  isLoading: boolean;
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();
let nextSearchQuery = "";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosOptions: () => ({ queryKey: [{ _id: "listKeysetInfos" }] }),
}));

vi.mock("@/components/ui/search", () => ({
  default: ({
    onChange,
    onSearch,
  }: {
    onChange?: (value: string) => void;
    onSearch: (value: string) => void;
  }) => (
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
  HighlightText: ({ text }: { text: string }) => <>{text}</>,
}));

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
        <button
          key={option.field}
          onClick={() => onSortChange(option.field)}
          type="button"
        >
          {`sort-${option.field}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const SelectContext = React.createContext<(value: string) => void>(vi.fn());

  return {
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
    SelectTrigger: ({ children }: { children: ReactElement | string }) => (
      <div>{children}</div>
    ),
    SelectValue: () => <span>SelectValue</span>,
    SelectContent: ({
      children,
    }: {
      children: ReactElement | ReactElement[];
    }) => <div>{children}</div>,
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactElement | string | number;
    }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button
          type="button"
          data-select-item={value}
          onClick={() => onValueChange(value)}
        >
          {children}
        </button>
      );
    },
  };
});

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
    </IntlProvider>,
  );
}

function clickButtonByText(page: HTMLDivElement, label: string) {
  const button = Array.from(page.querySelectorAll("button")).find(
    (node) => node.textContent === label,
  );
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
  const hrefs = Array.from(page.querySelectorAll('a[href^="/keysets/"]')).map(
    (node) => node.getAttribute("href") ?? "",
  );
  const unique: string[] = [];
  for (const href of hrefs) {
    if (!unique.includes(href)) {
      unique.push(href);
    }
  }
  return unique;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-20T00:00:00.000Z"));
  nextSearchQuery = "";

  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("KeysetsPage", () => {
  it("shows empty state when no keysets are returned", () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
    });

    const page = renderPage();
    expect(page.textContent).toContain("No keysets found");
  });

  it("renders inactive keyset without expiry", () => {
    mockUseQuery.mockReturnValue({
      data: {
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
      isLoading: false,
    });

    const page = renderPage();
    expect(page.textContent).toContain("Inactive");
    expect(page.textContent).toContain("No expiry");
    expect(page.textContent).toContain("usd");
  });

  it("filters out all rows and shows no-match state from search", () => {
    mockUseQuery.mockReturnValue({
      data: {
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
      isLoading: false,
    });
    nextSearchQuery = "definitely-missing";

    const page = renderPage();
    clickButtonByText(page, "SearchMock");

    expect(page.textContent).toContain("No keysets match your search criteria");
  });

  it("sorts by maturity, then currency, then status via sort controls", () => {
    mockUseQuery.mockReturnValue({
      data: {
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
      isLoading: false,
    });

    const page = renderPage();

    // Default maturity-asc: expired first, no-expiry last.
    expect(orderedKeysetHrefs(page)).toEqual([
      "/keysets/keyset-expired",
      "/keysets/keyset-future",
      "/keysets/keyset-no-expiry",
    ]);

    // Currency-asc: eur, sat, usd.
    clickButtonByText(page, "sort-currency");
    expect(orderedKeysetHrefs(page)).toEqual([
      "/keysets/keyset-no-expiry",
      "/keysets/keyset-expired",
      "/keysets/keyset-future",
    ]);

    // Status-asc in this implementation sorts active first.
    clickButtonByText(page, "sort-status");
    expect(orderedKeysetHrefs(page)[0]).toBe("/keysets/keyset-expired");
  });

  it("filters keysets through the dropdown", () => {
    mockUseQuery.mockReturnValue({
      data: {
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
      isLoading: false,
    });

    const page = renderPage();
    clickSelectItem(page, "inactive");

    expect(orderedKeysetHrefs(page)).toEqual(["/keysets/keyset-inactive"]);
  });
});
