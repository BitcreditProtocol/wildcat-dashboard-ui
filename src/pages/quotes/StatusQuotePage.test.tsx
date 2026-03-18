import { act, type ReactElement } from "react";
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
  queries: { queryKey?: { path?: { qid: string } }[] }[];
}
interface UseQueriesResultItem {
  data: unknown;
  isLoading: boolean;
}

const mockUseQuery =
  vi.fn<
    (
      options: GetQuoteQueryOptions | ListEbillsQueryOptions,
    ) => GetQuoteQueryResult
  >();
const mockUseInfiniteQuery = vi.fn<() => InfiniteQueryResult>();
const mockUseQueries =
  vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>();
const fetchNextPageSpy = vi.fn<() => Promise<unknown>>();

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactElement | ReactElement[];
  }) => (
    <div data-select-value={value}>
      <button
        type="button"
        onClick={() => onValueChange("50")}
      >
        SelectMock
      </button>
      {children}
    </div>
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
  }) => <div data-select-item={value}>{children}</div>,
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
    <IntlProvider locale="en">
      <MemoryRouter>
        <StatusQuotePage status={status} />
      </MemoryRouter>
    </IntlProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchNextPageSpy.mockResolvedValue(undefined);
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
      return {
        data: {
          bill: {
            id: `bill-${opts.queryKey[0].path?.qid ?? "x"}`,
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
    queries.map((query) => ({
      data: {
        bill: {
          id: `bill-${query.queryKey?.[0]?.path?.qid ?? "x"}`,
          maturity_date: "2026-02-20",
        },
      },
      isLoading: false,
    })),
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
    const loadMoreButton = Array.from(page.querySelectorAll("button")).find(
      (button) => button.textContent === "Load more",
    );
    expect(loadMoreButton).not.toBeUndefined();
    act(() => {
      loadMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fetchNextPageSpy).toHaveBeenCalled();
  });
});
