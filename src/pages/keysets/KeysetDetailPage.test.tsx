import { act, type ReactElement } from "react";
import { PreferencesProvider } from "@bitcredit/ui-library";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router";
import KeysetDetailPage from "./KeysetDetailPage";

interface QueryKeyEntry {
  _id: string;
}

interface QueryOptions {
  queryKey: QueryKeyEntry[];
}

interface QueryResult {
  data: unknown;
  isLoading: boolean;
}

interface InfiniteQueryResult {
  data: unknown;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

interface UseQueriesArgs {
  queries: { queryKey?: { _id?: string; path?: { qid?: string } }[] }[];
}

interface UseQueriesResultItem {
  isLoading: boolean;
  isError?: boolean;
  data?: unknown;
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();
const mockUseQueries = vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>();
const mockUseInfiniteQuery = vi.fn<(options: QueryOptions) => InfiniteQueryResult>();

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  return {
    ...actual,
    toast: vi.fn(() => ({
      id: "toast-id",
      dismiss: vi.fn(),
      update: vi.fn(),
    })),
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
    useInfiniteQuery: (options: QueryOptions) => mockUseInfiniteQuery(options),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosOptions: () => ({ queryKey: [{ _id: "listKeysetInfos" }] }),
  listQuotesOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
  listQuotesInfiniteOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({
    queryKey: [{ _id: "getQuote", path }],
  }),
  listKeysetInfosQueryKey: () => [{ _id: "listKeysetInfos" }],
}));

vi.mock("@/lib/ebill-mint-complete", () => ({
  getEbillMintCompleteQueryOptions: ({ billId }: { billId: string }) => ({
    queryKey: [{ _id: "getEbillMintComplete", path: { bid: billId } }],
  }),
}));

const TARGET_KEYSET_ID = "00aabb";
const TARGET_KEYSET_ID_OBJECT = { version: "Version00", id: { V1: [0xaa, 0xbb] } };
const OTHER_KEYSET_ID_OBJECT = { version: "Version00", id: { V1: [0xcc, 0xdd] } };
// The keyset expires on the same day the bills mature, which is exactly the coincidence
// the old date-based matching relied on.
const KEYSET_FINAL_EXPIRY = 1771545600;
const BILL_MATURITY_DATE = "2026-02-20";

interface QuoteFixture {
  id: string;
  status: string;
  sum: number;
  details?: unknown;
  detailsLoading?: boolean;
  detailsError?: boolean;
}

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

function renderPage(route: string): HTMLDivElement {
  return renderIntoDom(
    <PreferencesProvider>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/keysets/:keysetId" element={<KeysetDetailPage />} />
            <Route path="/keysets" element={<KeysetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </PreferencesProvider>
  );
}

/** Wires the keyset, ebill and quote-list queries plus one detail result per quote. */
function setupQueries(
  quotes: QuoteFixture[],
  keysets: unknown[] = [{ id: TARGET_KEYSET_ID, final_expiry: KEYSET_FINAL_EXPIRY, active: true, unit: "sat" }]
) {
  mockUseQuery.mockImplementation((opts: QueryOptions) => {
    const id = opts.queryKey[0]._id;
    if (id === "listKeysetInfos") {
      return { data: { data: keysets, total: keysets.length }, isLoading: false };
    }
    if (id === "listEbills") {
      return { data: [], isLoading: false };
    }
    return { data: undefined, isLoading: false };
  });

  mockUseInfiniteQuery.mockImplementation(() => ({
    data: { pages: [{ data: quotes.map(({ id, status, sum }) => ({ id, status, sum })), total: quotes.length }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }));

  mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) => {
    const id = queries[0]?.queryKey?.[0]?._id;
    if (id === "getQuote") {
      return queries.map((query) => {
        const quote = quotes.find((candidate) => candidate.id === query.queryKey?.[0]?.path?.qid);
        return {
          isLoading: quote?.detailsLoading ?? false,
          isError: quote?.detailsError ?? false,
          data: quote?.detailsError ? undefined : quote?.details,
        };
      });
    }
    if (id === "getEbillMintComplete") {
      return queries.map(() => ({ isLoading: false, data: { complete: true } }));
    }
    return [];
  });
}

function quoteDetails(keysetIdObject: unknown, billId: string): unknown {
  return {
    id: "quote",
    status: "Accepted",
    bill: { id: billId, maturity_date: BILL_MATURITY_DATE },
    keyset_id: keysetIdObject,
    discounted: 1,
  };
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
});

describe("KeysetDetailPage", () => {
  it("shows invalid keyset id when route has no :keysetId", () => {
    setupQueries([]);
    const page = renderPage("/keysets");
    expect(page.textContent).toContain("Invalid keyset ID");
  });

  it("shows not found when keyset does not exist", () => {
    setupQueries([], [{ id: "other-keyset" }]);

    const page = renderPage(`/keysets/${TARGET_KEYSET_ID}`);
    expect(page.textContent).toContain("Keyset not found");
  });

  it("lists the quotes offered under this keyset", () => {
    setupQueries([
      {
        id: "quote-match",
        status: "Accepted",
        sum: 100,
        details: quoteDetails(TARGET_KEYSET_ID_OBJECT, "bill-match"),
      },
    ]);

    const page = renderPage(`/keysets/${TARGET_KEYSET_ID}`);
    expect(page.textContent).toContain("All quotes (1)");
    expect(page.textContent).toContain("quote-match");
  });

  it("excludes a quote signed by another keyset even when its bill matures on the keyset expiry day", () => {
    setupQueries([
      {
        id: "quote-other-keyset",
        status: "Accepted",
        sum: 100,
        details: quoteDetails(OTHER_KEYSET_ID_OBJECT, "bill-other"),
      },
    ]);

    const page = renderPage(`/keysets/${TARGET_KEYSET_ID}`);
    expect(page.textContent).toContain("No quotes available");
    expect(page.textContent).not.toContain("quote-other-keyset");
  });

  it("does not request details for quotes that cannot carry a keyset id", () => {
    setupQueries([
      { id: "quote-pending", status: "Pending", sum: 10 },
      { id: "quote-canceled", status: "Canceled", sum: 20 },
      {
        id: "quote-accepted",
        status: "Accepted",
        sum: 30,
        details: quoteDetails(TARGET_KEYSET_ID_OBJECT, "bill-accepted"),
      },
    ]);

    renderPage(`/keysets/${TARGET_KEYSET_ID}`);

    const detailCall = mockUseQueries.mock.calls.find(([args]) => args.queries[0]?.queryKey?.[0]?._id === "getQuote");
    expect(detailCall?.[0].queries.map((query) => query.queryKey?.[0]?.path?.qid)).toEqual(["quote-accepted"]);
  });

  it("keeps loading rather than claiming there are no quotes while details are pending", () => {
    setupQueries([{ id: "quote-loading", status: "Accepted", sum: 100, detailsLoading: true }]);

    const page = renderPage(`/keysets/${TARGET_KEYSET_ID}`);
    expect(page.textContent).not.toContain("No quotes available");
  });

  it("warns when a quote's details failed to load", () => {
    setupQueries([
      {
        id: "quote-match",
        status: "Accepted",
        sum: 100,
        details: quoteDetails(TARGET_KEYSET_ID_OBJECT, "bill-match"),
      },
      { id: "quote-broken", status: "Accepted", sum: 50, detailsError: true },
    ]);

    const page = renderPage(`/keysets/${TARGET_KEYSET_ID}`);
    expect(page.textContent).toContain("1 quote could not be loaded");
  });
});
