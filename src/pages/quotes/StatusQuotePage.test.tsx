import { act, type ReactElement } from "react";
import { PreferencesProvider } from "@bitcredit/ui-library";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import StatusQuotePage from "./StatusQuotePage";

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
interface UseQueriesArgs {
  queries: { queryKey?: unknown[] }[];
}
interface UseQueriesResultItem {
  data: unknown;
  isLoading: boolean;
}

const mockUseQuery = vi.fn<(options: GetQuoteQueryOptions | ListEbillsQueryOptions) => GetQuoteQueryResult>();
const mockUseInfiniteQuery = vi.fn<() => InfiniteQueryResult>();
const mockUseQueries = vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>();
const fetchNextPageSpy = vi.fn<() => Promise<unknown>>();
const postTokenStatusMock = vi.fn<(args: { body: { token: string } }) => Promise<{ data: { state: string } }>>();

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

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: GetQuoteQueryOptions) => mockUseQuery(options),
    useInfiniteQuery: () => mockUseInfiniteQuery(),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesInfiniteOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({
    queryKey: [{ _id: "getQuote", path }],
  }),
}));

vi.mock("@/generated/client/sdk.gen", () => ({
  postTokenStatus: (args: { body: { token: string } }) => postTokenStatusMock(args),
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

function renderPage(status?: "Accepted" | "Pending"): HTMLDivElement {
  return renderIntoDom(
    <PreferencesProvider>
      <IntlProvider locale="en">
        <MemoryRouter>
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
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
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

beforeEach(() => {
  vi.clearAllMocks();
  fetchNextPageSpy.mockResolvedValue(undefined);
  postTokenStatusMock.mockResolvedValue({ data: { state: "Spent" } });
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }

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
    expect(page.textContent).toContain("Items per page");
    expect(page.textContent).toContain("All");
  });

  it("filters cards by status", () => {
    const page = renderPage("Accepted");
    expect(page.textContent).toContain("Accepted quotes");
    expect(page.textContent).toContain("quote-accepted");
    expect(page.textContent).not.toContain("quote-pending");
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
          },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage("Accepted");
    expect(page.textContent).toContain("quote-ebill-accepted");
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
          bill: { id: "bill-quote-legacy", maturity_date: "2026-02-20" },
        },
        isLoading: false,
      },
      {
        data: {
          bill: { id: "bill-quote-legacy-2", maturity_date: "2026-02-21" },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage();
    expect(page.textContent).toContain("quote-legacy");
    expect(page.textContent).toContain("quote-legacy-2");
    expect(page.textContent).not.toContain("Items per page");
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
          bill: { id: "bill-quote-accepted", maturity_date: "2026-02-20" },
        },
        isLoading: false,
      },
    ]);

    const page = renderPage();
    expect(page.textContent).toContain("Showing 1 of 2 quotes");
    const loadMoreButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent === "Load more");
    expect(loadMoreButton).not.toBeUndefined();
    act(() => {
      loadMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fetchNextPageSpy).toHaveBeenCalled();
  });

  it("searches by participant name", () => {
    const page = renderPage();
    changeSearchValue(page, "Charlie");

    expect(page.textContent).toContain("quote-accepted");
    expect(page.textContent).toContain("quote-pending");
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
    clickSelectItem(page, "requested-to-pay");

    expect(page.textContent).toContain("quote-accepted");
    expect(page.textContent).not.toContain("quote-pending");
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
    clickSelectItem(page, "ready-to-request-to-pay");

    expect(page.textContent).toContain("quote-ready");
    expect(page.textContent).not.toContain("quote-requested");
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
            fee: qid === "quote-active-fee" ? "token-a" : "token-b",
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
    postTokenStatusMock.mockImplementation(({ body }: { body: { token: string } }) =>
      Promise.resolve({
        data: {
          state: body.token === "token-a" ? "Unspent" : "Spent",
        },
      })
    );

    const page = renderPage();
    await act(async () => {
      clickSelectItem(page, "active-fee-token");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(page.textContent).toContain("quote-active-fee");
    expect(page.textContent).not.toContain("quote-spent-fee");
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
    clickSelectItem(page, "maturity-today");

    expect(page.textContent).toContain("quote-today");
    expect(page.textContent).not.toContain("quote-later");
  });
});
