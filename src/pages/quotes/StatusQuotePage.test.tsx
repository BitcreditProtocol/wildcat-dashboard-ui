import { act, type ReactElement } from "react";
import { PreferencesProvider } from "@bitcredit/ui-library";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import StatusQuotePage from "./StatusQuotePage";
import type { FilterGroup } from "@/components/ListFilters";

interface QueryKeyEntry {
  _id: string;
  path?: { qid: string };
}
interface GetQuoteQueryOptions {
  queryKey: QueryKeyEntry[];
}
interface GetQuoteQueryResult {
  data: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  error: Error | null;
}
interface ListEbillsQueryOptions {
  queryKey: QueryKeyEntry[];
}
interface InfiniteQueryResult {
  data:
    | {
        pages: {
          data?: { id: string; status: string; sum: number }[];
          quotes?: { id: string; status: string; sum: number }[];
          total?: number;
        }[];
      }
    | undefined;
  isLoading: boolean;
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage: () => Promise<unknown>;
  error: Error | null;
}
interface ListQuotesInfiniteOptions {
  query?: {
    limit?: number;
    sort?: string;
    status?: string;
    bill_holder_id?: string;
    bill_drawee_id?: string;
  };
}
interface InfiniteQueryOptions {
  queryKey?: {
    _id: string;
    query?: ListQuotesInfiniteOptions["query"];
  }[];
}
interface UseQueriesArgs {
  queries: { queryKey?: unknown[] }[];
}
interface UseQueriesResultItem {
  data: unknown;
  isLoading: boolean;
  error?: unknown;
}

const mockUseQuery = vi.fn<(options: GetQuoteQueryOptions | ListEbillsQueryOptions) => GetQuoteQueryResult>();
const mockUseInfiniteQuery = vi.fn<(options: InfiniteQueryOptions) => InfiniteQueryResult>();
const mockUseQueries = vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>();
const fetchNextPageSpy = vi.fn<() => Promise<unknown>>();

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  const React = await vi.importActual<typeof import("react")>("react");
  const SelectContext = React.createContext<(value: string) => void>(vi.fn());

  return {
    ...actual,
    toast: vi.fn(() => ({
      id: "toast-id",
      dismiss: vi.fn(),
      update: vi.fn(),
    })),
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

// The real panel lives in a drawer; the groups it is given are what the page wires up,
// so the mock renders them flat and keeps the drawer itself out of the test.
vi.mock("@/components/ListFilters", async () => {
  const actual = await vi.importActual<typeof import("@/components/ListFilters")>("@/components/ListFilters");
  return {
    ...actual,
    ListFilters: ({ groups, onReset }: { groups: FilterGroup[]; onReset?: () => void }) => (
      <div>
        {groups.map((group) => (
          <div key={group.id} data-filter-group={group.id} data-filter-value={group.value}>
            {group.options.map((option) => (
              <button
                key={option.value}
                type="button"
                data-filter-option={option.value}
                onClick={() => {
                  group.onSelect(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}
        {onReset && (
          <button type="button" onClick={onReset}>
            Reset all
          </button>
        )}
      </div>
    ),
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: GetQuoteQueryOptions) => mockUseQuery(options),
    useInfiniteQuery: (options: InfiniteQueryOptions) => mockUseInfiniteQuery(options),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesInfiniteOptions: (options: ListQuotesInfiniteOptions) => ({
    queryKey: [{ _id: "listQuotes", query: options.query }],
  }),
  listQuotesOptions: (options: ListQuotesInfiniteOptions) => ({
    queryKey: [{ _id: "listPartyQuotes", query: options.query }],
  }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({
    queryKey: [{ _id: "getQuote", path }],
  }),
}));

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

function renderPage(status?: "Accepted" | "Pending", url = "/quotes"): HTMLDivElement {
  return renderIntoDom(
    <PreferencesProvider>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[url]}>
          <StatusQuotePage status={status} />
        </MemoryRouter>
      </IntlProvider>
    </PreferencesProvider>
  );
}

function changeSearchValue(page: HTMLDivElement, value: string) {
  const input = page.querySelector('input[type="text"]');
  expect(input).not.toBeNull();
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing search input");
  }
  // React tracks the last value it wrote, so assigning `input.value` directly would make
  // it skip the change event. Go through the native setter to look like real typing.
  const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.bind(input);
  if (!setNativeValue) {
    throw new Error("Missing native input value setter");
  }

  act(() => {
    setNativeValue(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clickFilterOption(page: HTMLDivElement, value: string) {
  const button = page.querySelector(`[data-filter-option="${value}"]`);
  expect(button, `Filter option "${value}" not found`).not.toBeNull();
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing filter option: ${value}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function filterGroupValue(page: HTMLDivElement, groupId: string) {
  return page.querySelector(`[data-filter-group="${groupId}"]`)?.getAttribute("data-filter-value");
}

function clickButtonByText(page: HTMLDivElement, text: string) {
  const button = Array.from(page.querySelectorAll("button")).find((item) => item.textContent?.trim() === text);
  expect(button).not.toBeUndefined();
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function orderedQuoteIds(page: HTMLDivElement): string[] {
  // The status chips link under /quotes too, so skip them and keep the card links.
  const ids = Array.from(page.querySelectorAll('a[href^="/quotes/"]:not([data-quote-status-chip])')).map(
    (node) => node.getAttribute("href")?.replace("/quotes/", "") ?? ""
  );
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function lastQuotesQuery() {
  return mockUseInfiniteQuery.mock.calls[mockUseInfiniteQuery.mock.calls.length - 1]?.[0]?.queryKey?.[0]?.query;
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
  fetchNextPageSpy.mockResolvedValue(undefined);

  mockUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        {
          data: [
            { id: "quote-accepted", status: "Accepted", sum: 300 },
            { id: "quote-pending", status: "Pending", sum: 100 },
          ],
          total: 2,
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: fetchNextPageSpy,
    error: null,
  });

  mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
    if (opts.queryKey[0]._id === "getQuote") {
      const quoteId = opts.queryKey[0].path?.qid ?? "x";
      return {
        data: {
          id: quoteId,
          status: quoteId === "quote-accepted" ? "Accepted" : quoteId === "quote-pending" ? "Pending" : "MintingEnabled",
          bill: {
            id: `bill-${quoteId}`,
            maturity_date: "2026-02-20",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
        error: null,
      };
    }

    if (opts.queryKey[0]._id === "listEbills") {
      return {
        data: [],
        isLoading: false,
        isFetching: false,
        error: null,
      };
    }

    return {
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    };
  });

  mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
    queries.map((query) => {
      const firstKey = query.queryKey?.[0];

      if (firstKey === "quote-fee-token-status") {
        return {
          data: { state: "Spent" },
          isLoading: false,
        };
      }

      const qid =
        typeof firstKey === "object" &&
        firstKey !== null &&
        "path" in firstKey &&
        typeof firstKey.path === "object" &&
        firstKey.path !== null &&
        "qid" in firstKey.path
          ? String(firstKey.path.qid)
          : "x";

      return {
        data: {
          id: qid,
          status: qid === "quote-accepted" ? "Accepted" : qid === "quote-pending" ? "Pending" : "MintingEnabled",
          bill: {
            id: `bill-${qid}`,
            maturity_date: "2026-02-20",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
      };
    })
  );
});

describe("StatusQuotePage", () => {
  it("shows all quotes page title when no status filter is passed", () => {
    const page = renderPage();
    expect(page.textContent).toContain("All quotes");
    expect(filterGroupValue(page, "rowsPerPage")).toBe("25");
    // Priority is the default rather than an option, so no sort field is selected, and it
    // needs the pages in arrival order to rank them.
    expect(filterGroupValue(page, "sort")).toBe("");
    expect(lastQuotesQuery()).toMatchObject({ sort: "submitted_asc" });
  });

  it("links every status from the tabs, working stages first and closed ones after, with an All tab", () => {
    const page = renderPage("Pending");
    const tabs = Array.from(page.querySelectorAll("[data-quote-status-chip]"));

    expect(tabs.map((tab) => tab.getAttribute("data-quote-status-chip"))).toEqual([
      "Pending",
      "Offered",
      "Accepted",
      "MintingEnabled",
      "OfferExpired",
      "Denied",
      "Rejected",
      "Canceled",
    ]);

    const pendingTab = tabs.find((tab) => tab.getAttribute("data-quote-status-chip") === "Pending");
    expect(pendingTab?.getAttribute("aria-current")).toBe("page");
    expect(pendingTab?.getAttribute("href")).toBe("/quotes/pending");
    expect(tabs.find((tab) => tab.getAttribute("data-quote-status-chip") === "Denied")?.getAttribute("href")).toBe("/quotes/denied");
    const all = Array.from(page.querySelectorAll('nav a[href="/quotes"]')).find((link) => link.textContent === "All");
    expect(all?.getAttribute("aria-current")).toBeNull();
  });

  it("shows no quick filter until one is picked, keeps a picked one visible, and picking it again clears it", () => {
    const page = renderPage();
    const options = () => Array.from(page.querySelectorAll('[data-filter-group="show"] [data-filter-option]'));
    const needsAction = () => Array.from(page.querySelectorAll("button")).find((button) => button.textContent === "Needs your action");

    // Nothing selected is what shows every quote, so there is no "All quotes" option. "Needs your action" is its own toggle.
    expect(options().map((option) => option.textContent)).toEqual([
      "Requested to pay",
      "Ready to request to pay",
      "Paid",
      "Fees ready to collect",
      "Maturity today",
    ]);
    expect(filterGroupValue(page, "show")).toBe("all");
    expect(needsAction()?.getAttribute("aria-pressed")).toBe("false");

    clickFilterOption(page, "requested-to-pay");
    expect(filterGroupValue(page, "show")).toBe("requested-to-pay");
    // A filter picked inside the panel stays visible beside it, removable in one click.
    const chip = Array.from(page.querySelectorAll("button")).find(
      (button) => button.textContent?.startsWith("Requested to pay") && !button.hasAttribute("data-filter-option")
    );
    expect(chip?.textContent).toBe("Requested to payRemove filter");

    clickFilterOption(page, "requested-to-pay");
    expect(filterGroupValue(page, "show")).toBe("all");
  });

  it("cycles a sort field through ascending, descending and back to the default", () => {
    const page = renderPage();

    clickFilterOption(page, "maturity");
    expect(lastQuotesQuery()).toMatchObject({ sort: "bill_maturity_date_asc" });

    clickFilterOption(page, "maturity");
    expect(lastQuotesQuery()).toMatchObject({ sort: "bill_maturity_date_desc" });

    clickFilterOption(page, "maturity");
    expect(filterGroupValue(page, "sort")).toBe("");
    expect(lastQuotesQuery()).toMatchObject({ sort: "submitted_asc" });
  });

  it('offers "Needs your action" only where a quote can wait on the operator\'s decision', () => {
    const needsAction = (page: HTMLDivElement) =>
      Array.from(page.querySelectorAll("button")).some((button) => button.textContent === "Needs your action");

    expect(needsAction(renderPage())).toBe(true);
    act(() => root?.unmount());
    root = null;
    expect(needsAction(renderPage("Pending"))).toBe(true);
    act(() => root?.unmount());
    root = null;
    expect(needsAction(renderPage("Accepted"))).toBe(false);
  });

  it("does not offer priority as a sort field, since it is where sorting starts", () => {
    const page = renderPage();

    expect(page.querySelector('[data-filter-option="priority"]')).toBeNull();
    expect(
      Array.from(page.querySelectorAll('[data-filter-group="sort"] [data-filter-option]')).map((option) => option.textContent)
    ).toEqual(["Amount", "Maturity", "Status", "Last status change"]);
  });

  it("puts every filter back with reset all", () => {
    const page = renderPage();

    clickFilterOption(page, "paid");
    clickFilterOption(page, "50");
    clickFilterOption(page, "status");
    expect(lastQuotesQuery()).toMatchObject({ limit: 50 });

    clickButtonByText(page, "Reset all");

    expect(filterGroupValue(page, "show")).toBe("all");
    expect(filterGroupValue(page, "sort")).toBe("");
    expect(filterGroupValue(page, "rowsPerPage")).toBe("25");
    expect(lastQuotesQuery()).toMatchObject({ limit: 25, sort: "submitted_asc" });
  });

  it("offers sorting from the column headers too, and page size in the filters panel", () => {
    const page = renderPage();
    const amountHeader = () => Array.from(page.querySelectorAll("thead th")).find((cell) => cell.textContent === "Bill amount");

    expect(amountHeader()?.getAttribute("aria-sort")).toBe("none");
    act(() => {
      amountHeader()
        ?.querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(amountHeader()?.getAttribute("aria-sort")).toBe("ascending");
    expect(filterGroupValue(page, "sort")).toBe("sum");

    expect(filterGroupValue(page, "rowsPerPage")).toBe("25");
    clickFilterOption(page, "50");
    expect(filterGroupValue(page, "rowsPerPage")).toBe("50");
    expect(lastQuotesQuery()).toMatchObject({ limit: 50 });
  });

  it("passes backend quote sort order for maturity and last status change", () => {
    const page = renderPage();

    clickFilterOption(page, "maturity");
    expect(lastQuotesQuery()).toMatchObject({ sort: "bill_maturity_date_asc" });

    // Picking the field already sorted on flips the direction.
    clickFilterOption(page, "maturity");
    expect(lastQuotesQuery()).toMatchObject({ sort: "bill_maturity_date_desc" });

    clickFilterOption(page, "statusChange");
    expect(lastQuotesQuery()).toMatchObject({ sort: "submitted_asc" });
    expect(filterGroupValue(page, "sort")).toBe("statusChange");

    clickFilterOption(page, "statusChange");
    expect(lastQuotesQuery()).toMatchObject({ sort: "submitted_desc" });
  });

  it("puts quotes waiting on a decision first by default, the longest wait at the top", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: "quote-denied", status: "Denied", sum: 100 },
              { id: "quote-pending-new", status: "Pending", sum: 200 },
              { id: "quote-accepted", status: "Accepted", sum: 300 },
              { id: "quote-pending-old", status: "Pending", sum: 400 },
              { id: "quote-offered", status: "Offered", sum: 500 },
            ],
            total: 5,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    const timestamps: Record<string, string> = {
      "quote-denied": "2026-02-19T10:00:00.000Z",
      "quote-pending-new": "2026-02-18T10:00:00.000Z",
      "quote-accepted": "2026-02-17T10:00:00.000Z",
      "quote-pending-old": "2026-02-10T10:00:00.000Z",
      "quote-offered": "2026-02-16T10:00:00.000Z",
    };

    const statuses: Record<string, string> = {
      "quote-denied": "Denied",
      "quote-pending-new": "Pending",
      "quote-accepted": "Accepted",
      "quote-pending-old": "Pending",
      "quote-offered": "Offered",
    };

    mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
      queries.map((query) => {
        const firstKey = query.queryKey?.[0];
        const qid =
          typeof firstKey === "object" &&
          firstKey !== null &&
          "path" in firstKey &&
          typeof firstKey.path === "object" &&
          firstKey.path !== null &&
          "qid" in firstKey.path
            ? String(firstKey.path.qid)
            : "x";
        const status = statuses[qid] ?? "Pending";

        return {
          data: {
            id: qid,
            status,
            // A pending quote carries its arrival time; the rest carry their last change.
            ...(status === "Pending" ? { submitted: timestamps[qid] } : { tstamp: timestamps[qid] }),
            bill: {
              id: `bill-${qid}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
        };
      })
    );

    const page = renderPage();

    expect(orderedQuoteIds(page)).toEqual(["quote-pending-old", "quote-pending-new", "quote-offered", "quote-accepted", "quote-denied"]);
  });

  it("keeps amount and status sorting local, without a backend sort order", () => {
    const page = renderPage();

    clickButtonByText(page, "Amount");
    expect(lastQuotesQuery()?.sort).toBeUndefined();

    clickButtonByText(page, "Status");
    expect(lastQuotesQuery()?.sort).toBeUndefined();
  });

  it("filters cards by status", () => {
    const page = renderPage("Accepted");
    expect(page.textContent).toContain("Accepted quotes");
    expect(orderedQuoteIds(page)).toContain("quote-accepted");
    expect(orderedQuoteIds(page)).not.toContain("quote-pending");
  });

  it("treats quotes with accepted ebills as accepted in dashboard filters", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: "quote-ebill-accepted", status: "Pending", sum: 300 }],
            total: 1,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        return {
          data: {
            bill: {
              id: "bill-quote-ebill-accepted",
              maturity_date: "2026-02-20",
              drawee: {},
              drawer: {},
              payee: {},
              endorsees: [],
            },
          },
          isLoading: false,
          error: null,
        };
      }

      if (opts.queryKey[0]._id === "listEbills") {
        return {
          data: [
            {
              id: "bill-quote-ebill-accepted",
              status: {
                acceptance: {
                  accepted: true,
                },
              },
            },
          ],
          isLoading: false,
          isFetching: false,
          error: null,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });
    mockUseQueries.mockReturnValue([
      {
        data: {
          id: "quote-ebill-accepted",
          status: "Pending",
          bill: {
            id: "bill-quote-ebill-accepted",
            maturity_date: "2026-02-20",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage("Accepted");
    expect(orderedQuoteIds(page)).toContain("quote-ebill-accepted");
    expect(page.textContent).toContain("Accepted");
  });

  it("shows API error state when quotes query fails", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: new Error("network down"),
    });
    mockUseQueries.mockReturnValue([]);

    const page = renderPage();
    expect(page.textContent).toContain("Failed to load quotes");
    expect(page.textContent).toContain("network down");
  });

  it("shows empty state when quotes list is empty", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [{ data: [], total: 0 }] },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });
    mockUseQueries.mockReturnValue([]);

    const page = renderPage();
    expect(page.textContent).toContain("No quotes available.");
  });

  it("falls back to rendering legacy quotes response shape", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            quotes: [
              { id: "quote-legacy", status: "Pending", sum: 1000 },
              { id: "quote-legacy-2", status: "Accepted", sum: 2000 },
            ],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });
    mockUseQueries.mockReturnValue([
      {
        data: {
          bill: {
            id: "bill-quote-legacy",
            maturity_date: "2026-02-20",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
      },
      {
        data: {
          bill: {
            id: "bill-quote-legacy-2",
            maturity_date: "2026-02-21",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage();
    expect(orderedQuoteIds(page)).toContain("quote-legacy");
    expect(orderedQuoteIds(page)).toContain("quote-legacy-2");
    expect(page.querySelector('[data-filter-group="rowsPerPage"]')).toBeNull();
  });

  it("loads the next page when load more is clicked", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: "quote-accepted", status: "Accepted", sum: 300 }],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });
    mockUseQueries.mockReturnValue([
      {
        data: {
          bill: {
            id: "bill-quote-accepted",
            maturity_date: "2026-02-20",
            drawee: { name: "Alice", node_id: "drawee-node" },
            drawer: { name: "Bob", node_id: "drawer-node" },
            payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
            endorsees: [],
          },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage();
    expect(page.textContent).toContain("Showing 1 of 2 quotes");
    const loadMoreButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent === "Load more");
    expect(loadMoreButton).not.toBeUndefined();
    expect(loadMoreButton?.className).toContain("min-h-12");
    expect(loadMoreButton?.className).toContain("w-full");
    expect(loadMoreButton?.className).toContain("max-w-sm");
    act(() => {
      loadMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fetchNextPageSpy).toHaveBeenCalled();
  });

  it("loads the remaining pages so a search covers quotes that are not loaded yet", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: "quote-accepted", status: "Accepted", sum: 300 }],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    const page = renderPage();
    expect(fetchNextPageSpy).not.toHaveBeenCalled();

    changeSearchValue(page, "quote-pending");

    expect(fetchNextPageSpy).toHaveBeenCalled();
    expect(page.textContent).toContain("Searching all quotes...");
    // The manual control and the no-match state would both be wrong mid auto-load.
    expect(page.textContent).not.toContain("Load more");
    expect(page.textContent).not.toContain("No quotes match your search criteria");
  });

  it("loads the remaining pages so a quick filter covers quotes that are not loaded yet", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: "quote-accepted", status: "Accepted", sum: 300 }],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    const page = renderPage();
    clickFilterOption(page, "maturity-today");

    expect(fetchNextPageSpy).toHaveBeenCalled();
  });

  it("keeps the load more control when no search or filter is active", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [{ id: "quote-accepted", status: "Accepted", sum: 300 }],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    const page = renderPage();

    expect(fetchNextPageSpy).not.toHaveBeenCalled();
    expect(page.textContent).toContain("Load more");
    expect(page.textContent).not.toContain("Searching all quotes...");
  });

  it("counts search matches separately from the quotes that were searched", () => {
    const page = renderPage();
    expect(page.textContent).toContain("Showing 2 of 2 quotes");

    changeSearchValue(page, "quote-accepted");

    expect(orderedQuoteIds(page)).toEqual(["quote-accepted"]);
    expect(page.textContent).toContain("1 match among 2 quotes");
    expect(page.textContent).not.toContain("Showing");
  });

  it("does not claim unloaded quotes were searched while pages are still loading", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: "quote-accepted", status: "Accepted", sum: 300 },
              { id: "quote-pending", status: "Pending", sum: 100 },
            ],
            total: 3,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    const page = renderPage();
    changeSearchValue(page, "quote-accepted");

    expect(page.textContent).toContain("1 match among 2 of 3 quotes loaded so far");
  });

  it("searches by participant name", () => {
    const page = renderPage();
    changeSearchValue(page, "Charlie");

    expect(orderedQuoteIds(page)).toContain("quote-accepted");
    expect(orderedQuoteIds(page)).toContain("quote-pending");

    changeSearchValue(page, "Dorothy");

    expect(orderedQuoteIds(page)).not.toContain("quote-accepted");
    expect(orderedQuoteIds(page)).not.toContain("quote-pending");
  });

  it("filters quotes that were requested to pay", () => {
    mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        const quoteId = opts.queryKey[0].path?.qid ?? "x";
        return {
          data: {
            id: quoteId,
            status: "Accepted",
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${quoteId}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
          error: null,
        };
      }

      if (opts.queryKey[0]._id === "listEbills") {
        return {
          data: [
            {
              id: "bill-quote-accepted",
              status: { payment: { requested_to_pay: true, paid: false } },
            },
            {
              id: "bill-quote-pending",
              status: { payment: { requested_to_pay: false, paid: false } },
            },
          ],
          isLoading: false,
          isFetching: false,
          error: null,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });

    const page = renderPage();
    clickFilterOption(page, "requested-to-pay");

    expect(orderedQuoteIds(page)).toContain("quote-accepted");
    expect(orderedQuoteIds(page)).not.toContain("quote-pending");
  });

  it("filters quotes whose e-bill is paid, whatever stage the quote is at", () => {
    mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        const quoteId = opts.queryKey[0].path?.qid ?? "x";
        return {
          data: {
            id: quoteId,
            status: quoteId === "quote-accepted" ? "Accepted" : "Pending",
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${quoteId}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
          error: null,
        };
      }

      if (opts.queryKey[0]._id === "listEbills") {
        return {
          data: [
            {
              id: "bill-quote-accepted",
              status: { payment: { requested_to_pay: true, paid: true } },
            },
            {
              id: "bill-quote-pending",
              status: { payment: { requested_to_pay: true, paid: false } },
            },
          ],
          isLoading: false,
          isFetching: false,
          error: null,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });

    const page = renderPage();
    clickFilterOption(page, "paid");

    expect(orderedQuoteIds(page)).toContain("quote-accepted");
    expect(orderedQuoteIds(page)).not.toContain("quote-pending");
  });

  it("filters quotes that are ready to request to pay", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: "quote-ready", status: "Accepted", sum: 300 },
              { id: "quote-requested", status: "Accepted", sum: 100 },
            ],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        const quoteId = opts.queryKey[0].path?.qid ?? "x";
        return {
          data: {
            id: quoteId,
            status: "Accepted",
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${quoteId}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
          error: null,
        };
      }

      if (opts.queryKey[0]._id === "listEbills") {
        return {
          data: [
            {
              id: "bill-quote-ready",
              status: { payment: { requested_to_pay: false, paid: false } },
            },
            {
              id: "bill-quote-requested",
              status: { payment: { requested_to_pay: true, paid: false } },
            },
          ],
          isLoading: false,
          isFetching: false,
          error: null,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });

    mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
      queries.map((query) => {
        const firstKey = query.queryKey?.[0];
        const qid =
          typeof firstKey === "object" &&
          firstKey !== null &&
          "path" in firstKey &&
          typeof firstKey.path === "object" &&
          firstKey.path !== null &&
          "qid" in firstKey.path
            ? String(firstKey.path.qid)
            : "x";

        return {
          data: {
            id: qid,
            status: "Accepted",
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${qid}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
        };
      })
    );

    const page = renderPage();
    clickFilterOption(page, "ready-to-request-to-pay");

    expect(orderedQuoteIds(page)).toContain("quote-ready");
    expect(orderedQuoteIds(page)).not.toContain("quote-requested");
  });

  it("filters quotes with active fee tokens", async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: "quote-active-fee", status: "MintingEnabled", sum: 300 },
              { id: "quote-spent-fee", status: "MintingEnabled", sum: 100 },
            ],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
      queries.map((query) => {
        const firstKey = query.queryKey?.[0];
        const qid =
          typeof firstKey === "object" &&
          firstKey !== null &&
          "path" in firstKey &&
          typeof firstKey.path === "object" &&
          firstKey.path !== null &&
          "qid" in firstKey.path
            ? String(firstKey.path.qid)
            : "x";

        return {
          data: {
            id: qid,
            status: "MintingEnabled",
            fee: 1000,
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${qid}`,
              maturity_date: "2026-02-20",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
        };
      })
    );

    const page = renderPage();
    await act(async () => {
      clickFilterOption(page, "active-fee-token");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(orderedQuoteIds(page)).not.toContain("quote-active-fee");
    expect(orderedQuoteIds(page)).not.toContain("quote-spent-fee");
    expect(page.textContent).toContain("No quotes match your search criteria");
  });

  it("filters quotes maturing today", () => {
    const today = new Date().toISOString().split("T")[0];

    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: "quote-today", status: "Accepted", sum: 300 },
              { id: "quote-later", status: "Accepted", sum: 100 },
            ],
            total: 2,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: fetchNextPageSpy,
      error: null,
    });

    mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
      queries.map((query) => {
        const firstKey = query.queryKey?.[0];
        const qid =
          typeof firstKey === "object" &&
          firstKey !== null &&
          "path" in firstKey &&
          typeof firstKey.path === "object" &&
          firstKey.path !== null &&
          "qid" in firstKey.path
            ? String(firstKey.path.qid)
            : "x";

        return {
          data: {
            id: qid,
            status: "Accepted",
            keyset_id: "keyset-1",
            bill: {
              id: `bill-${qid}`,
              maturity_date: qid === "quote-today" ? today : "2026-12-31",
              drawee: { name: "Alice", node_id: "drawee-node" },
              drawer: { name: "Bob", node_id: "drawer-node" },
              payee: { Ident: { name: "Charlie", node_id: "payee-node" } },
              endorsees: [],
            },
          },
          isLoading: false,
        };
      })
    );

    const page = renderPage();
    clickFilterOption(page, "maturity-today");

    expect(orderedQuoteIds(page)).toContain("quote-today");
    expect(orderedQuoteIds(page)).not.toContain("quote-later");
  });
  describe("applicants with several cases", () => {
    const billFor = (qid: string) => ({
      id: `bill-${qid}`,
      maturity_date: "2026-02-20",
      drawee: { name: qid === "quote-c" ? "Other payer" : "Alice", node_id: "drawee-node" },
      drawer: { name: "Bob", node_id: "drawer-node" },
      payee: {
        Ident: { name: qid === "quote-b" ? "Second applicant" : "First applicant", node_id: qid === "quote-b" ? "holder-2" : "holder-1" },
      },
      endorsees: [],
    });

    beforeEach(() => {
      mockUseInfiniteQuery.mockReturnValue({
        data: {
          pages: [
            {
              data: [
                { id: "quote-a", status: "Accepted", sum: 100 },
                { id: "quote-b", status: "Accepted", sum: 200 },
                { id: "quote-c", status: "Accepted", sum: 300 },
              ],
              total: 3,
            },
          ],
        },
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        fetchNextPage: fetchNextPageSpy,
        error: null,
      });
      mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
        queries.map((query) => {
          const key = query.queryKey?.[0] as { path?: { qid: string } } | undefined;
          const qid = key?.path?.qid ?? "x";
          return { data: { id: qid, status: "Accepted", bill: billFor(qid) }, isLoading: false };
        })
      );
    });

    it("asks the Mint for one applicant's quotes by holder, and one payer's by drawee", () => {
      renderPage(undefined, "/quotes?applicant=holder-1");
      expect(lastQuotesQuery()).toMatchObject({ bill_holder_id: "holder-1", bill_drawee_id: undefined });

      act(() => root?.unmount());
      root = null;
      renderPage(undefined, "/quotes?payer=drawee-node");
      expect(lastQuotesQuery()).toMatchObject({ bill_holder_id: undefined, bill_drawee_id: "drawee-node" });
    });

    it("names how many cases an applicant has in the list and links to all of them", () => {
      const page = renderPage();
      const links = Array.from(page.querySelectorAll('a[href="/quotes?applicant=holder-1"]'));

      expect(links.map((link) => link.textContent)).toEqual(["2 cases here", "2 cases here"]);
      expect(page.querySelector('a[href="/quotes?applicant=holder-2"]')).toBeNull();
    });

    it("groups quotes under their applicant, keeping the list order", () => {
      const page = renderPage(undefined, "/quotes?view=applicant");
      const groups = Array.from(page.querySelectorAll("tbody")).map((body) => ({
        header: body.querySelector('th[scope="rowgroup"]')?.textContent ?? "",
        quotes: Array.from(body.querySelectorAll('a[href^="/quotes/"]')).map((link) => link.getAttribute("href")),
      }));

      expect(groups).toHaveLength(2);
      expect(groups[0].header).toContain("First applicant");
      expect(groups[0].header).toContain("2 cases here");
      expect(groups[0].quotes).toEqual(["/quotes/quote-a", "/quotes/quote-c"]);
      expect(groups[1].header).toContain("Second applicant");
      expect(groups[1].quotes).toEqual(["/quotes/quote-b"]);
      expect(page.querySelector('[aria-label="View"] [data-state="on"]')?.textContent).toBe("By applicant");
    });

    it("leads with the payer once the list is filtered to one applicant", () => {
      const page = renderPage(undefined, "/quotes?applicant=holder-1");
      const headers = Array.from(page.querySelectorAll("thead th")).map((cell) => cell.textContent);

      expect(headers[0]).toBe("Payer");
      expect(headers).not.toContain("Applicant");
      expect(page.querySelector('th[scope="rowgroup"]')).toBeNull();
      // Grouping by applicant means nothing for a single applicant, so the view choice is not offered.
      expect(page.querySelector('[aria-label="View"]')).toBeNull();
    });

    it("applies one party filter at a time, ignoring an empty one", () => {
      renderPage(undefined, "/quotes?applicant=holder-1&payer=drawee-node");
      expect(lastQuotesQuery()).toMatchObject({ bill_holder_id: "holder-1", bill_drawee_id: undefined });

      act(() => root?.unmount());
      root = null;
      const page = renderPage(undefined, "/quotes?applicant=&view=applicant");
      expect(lastQuotesQuery()).toMatchObject({ bill_holder_id: undefined });
      expect(page.querySelector('[data-quote-status-chip="Pending"]')?.getAttribute("href")).toBe("/quotes/pending?view=applicant");
    });

    it("names a quote whose record could not be read instead of loading forever", () => {
      mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
        queries.map(() => ({ data: undefined, isLoading: false, error: new Error("boom") }))
      );
      const page = renderPage();

      expect(page.textContent).toContain("Bill details unavailable");
      expect(page.textContent).not.toContain("Loading…");
    });

    it("keeps the applicant filter and view when switching status pages", () => {
      const page = renderPage(undefined, "/quotes?applicant=holder-1&view=applicant");

      expect(page.querySelector('[data-quote-status-chip="Pending"]')?.getAttribute("href")).toBe(
        "/quotes/pending?applicant=holder-1&view=applicant"
      );
    });
  });

  describe("quotes that need the operator", () => {
    const pendingBill = (qid: string) => ({
      id: `bill-${qid}`,
      maturity_date: "2026-02-20",
      drawee: { name: "Alice", node_id: "drawee-node" },
      drawer: { name: "Bob", node_id: "drawer-node" },
      payee: { Ident: { name: `Applicant ${qid}`, node_id: `holder-${qid}` } },
      endorsees: [],
    });
    const waitingOnApplicant = (qid: string) => ({
      mintQuoteId: qid,
      assessmentCurrency: "current",
      snapshot: { bill: { billId: `bill-${qid}` }, contradictions: [] },
      result: { recommendation: "offer_available", verificationRequests: [], terms: null },
      casePreparation: {
        schemaVersion: "case-preparation-v1",
        status: "awaiting_applicant",
        approvable: false,
        reasons: [],
        automaticRequests: { policyVersion: "synthetic-agent-follow-up-v2", used: 0, budget: 3, consent: "absent", enabled: false },
        rounds: [],
        openObjectives: [],
      },
    });

    beforeEach(() => {
      mockUseInfiniteQuery.mockReturnValue({
        data: {
          pages: [
            {
              data: [
                // Oldest first under the default order, so the reordering below is visible.
                { id: "quote-waiting", status: "Pending", sum: 100 },
                { id: "quote-mine", status: "Pending", sum: 200 },
              ],
              total: 2,
            },
          ],
        },
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        fetchNextPage: fetchNextPageSpy,
        error: null,
      });
      mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
        queries.map((query) => {
          const qid = (query.queryKey?.[0] as { path?: { qid: string } } | undefined)?.path?.qid ?? "x";
          const submitted = qid === "quote-waiting" ? "2026-01-01T00:00:00Z" : "2026-01-02T00:00:00Z";
          return { data: { id: qid, status: "Pending", submitted, bill: pendingBill(qid) }, isLoading: false };
        })
      );
      const baseQuery = mockUseQuery.getMockImplementation();
      mockUseQuery.mockImplementation((opts: GetQuoteQueryOptions) => {
        const key: unknown = opts.queryKey[0];
        if (key === "ai-credit") {
          return { data: { cases: [waitingOnApplicant("quote-waiting")], issues: [] }, isLoading: false, error: null };
        }
        return baseQuery ? baseQuery(opts) : { data: undefined, isLoading: false, error: null };
      });
    });

    it("puts pending quotes waiting on the operator before those waiting on the applicant", () => {
      expect(orderedQuoteIds(renderPage())).toEqual(["quote-mine", "quote-waiting"]);
    });

    it("filters to quotes that need the operator, counting a quote without a case as a manual decision", () => {
      const page = renderPage();
      clickButtonByText(page, "Needs your action");

      expect(orderedQuoteIds(page)).toEqual(["quote-mine"]);
    });
  });
});
