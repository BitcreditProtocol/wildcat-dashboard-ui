import { act, type ReactElement } from "react";
import { PreferencesProvider } from "@bitcredit/ui-library";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router";
import QuotePage from "./QuotePage";

interface QueryKeyEntry {
  _id: string;
  path?: { qid?: string; bid?: string };
}
interface QueryOptions {
  queryKey: QueryKeyEntry[];
}
interface QueryResult {
  data: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  error: Error | null;
}
interface MutationResult {
  mutate: (value: { body: { token: string } }) => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: unknown;
}

const { mockClientGet } = vi.hoisted(() => ({
  mockClientGet: vi.fn(),
}));
const { mockGetEbillAttachment, mockGetEbillFileFromRequestToMint } = vi.hoisted(() => ({
  mockGetEbillAttachment: vi.fn(),
  mockGetEbillFileFromRequestToMint: vi.fn(),
}));

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();
const mockUseMutation = vi.fn<() => MutationResult>();

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

vi.mock("./QuoteActions", () => ({
  QuoteActions: () => <div>QuoteActionsMock</div>,
}));

vi.mock("@/lib/api-client", () => ({
  client: {
    get: mockClientGet,
  },
}));

vi.mock("@/generated/client/sdk.gen", () => ({
  getEbillAttachment: mockGetEbillAttachment,
  getEbillFileFromRequestToMint: mockGetEbillFileFromRequestToMint,
}));

vi.mock("@/lib/ebill-mint-complete", () => ({
  getEbillMintCompleteQueryOptions: ({ billId }: { billId: string }) => ({
    queryKey: [{ _id: "getEbillMintComplete", path: { bid: billId } }],
  }),
}));

vi.mock("@/components/EndorsementChain", () => ({
  EndorsementChain: () => <div>EndorsementChainMock</div>,
}));

vi.mock("@/components/ParticipantsOverview", () => ({
  ParticipantsOverviewCard: () => <div>ParticipantsOverviewMock</div>,
  ParticipantDetail: () => <div>ParticipantDetailMock</div>,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
    useMutation: () => mockUseMutation(),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({
    queryKey: [{ _id: "getQuote", path }],
  }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getEbillEndorsementsOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbillEndorsements", path }],
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

function renderPage(entry: string | { pathname: string; state?: Record<string, unknown> }): HTMLDivElement {
  return renderIntoDom(
    <PreferencesProvider>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/quotes/:id" element={<QuotePage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </PreferencesProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }

  mockUseMutation.mockReturnValue({
    mutate: vi.fn<(value: { body: { token: string } }) => void>(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
  });
  mockClientGet.mockReset();
  mockGetEbillAttachment.mockReset();
  mockGetEbillFileFromRequestToMint.mockReset();
  mockGetEbillAttachment.mockResolvedValue(new Blob(["attachment"]));
  mockGetEbillFileFromRequestToMint.mockResolvedValue(new Blob(["request-to-mint"]));
  vi.stubGlobal(
    "open",
    vi.fn(() => ({ closed: false }) as Window)
  );
  globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
  globalThis.URL.revokeObjectURL = vi.fn();

  mockUseQuery.mockImplementation((opts: QueryOptions) => {
    const id = opts.queryKey[0]._id;
    if (id === "getQuote") {
      return {
        data: {
          id: opts.queryKey[0].path?.qid ?? "quote-1",
          status: "Accepted",
          keyset_id: "keyset-from-quote",
          bill: {
            id: "bill-1",
            sum: 100,
            maturity_date: "2026-03-01",
            drawee: {},
            drawer: {},
            payee: {},
            endorsees: [],
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
      };
    }

    if (id === "listEbills") {
      return {
        data: [
          {
            id: "bill-1",
            data: {
              files: [
                {
                  name: "invoice.pdf",
                  hash: "hash-1",
                  nostr_hash: "nostr-hash-1",
                },
              ],
            },
            status: {
              payment: { paid: true },
            },
          },
        ],
        isLoading: false,
        error: null,
      };
    }

    if (id === "getEbillEndorsements") {
      return { data: [], isLoading: false, error: null };
    }

    if (id === "getEbillMintComplete") {
      return { data: { complete: true }, isLoading: false, error: null };
    }

    return {
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    };
  });
});

describe("QuotePage", () => {
  it("shows back-to-keyset action when navigated from a keyset page", () => {
    const page = renderPage({
      pathname: "/quotes/quote-1",
      state: { from: "/keysets/keyset-1234" },
    });
    const link = page.querySelector('a[href="/keysets/keyset-1234"]');
    expect(link?.textContent).toContain("Back to keyset");
  });

  it("shows go-to-keyset action from quote data when no navigation state is provided", () => {
    const page = renderPage("/quotes/quote-1");
    const link = page.querySelector('a[href="/keysets/keyset-from-quote"]');
    expect(link?.textContent).toContain("Go to keyset");
  });

  it("shows quote load error state", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        return {
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: new Error("boom"),
        };
      }
      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });

    const page = renderPage("/quotes/quote-error");
    expect(page.textContent).toContain("Failed to load quote");
    expect(page.textContent).toContain("boom");
  });

  it("shows empty quote state when bill data is missing", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        return {
          data: { id: "quote-1", status: "Pending" },
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

    const page = renderPage("/quotes/quote-1");
    expect(page.textContent).toContain("No quote data available");
  });

  it("does not render keyset action when quote does not expose keyset id", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "getQuote") {
        return {
          data: {
            id: opts.queryKey[0].path?.qid ?? "quote-2",
            status: "Pending",
            bill: {
              id: "bill-2",
              sum: 50,
              maturity_date: "2026-03-10",
              drawee: {},
              drawer: {},
              payee: {},
              endorsees: [],
            },
          },
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

    const page = renderPage("/quotes/quote-2");
    const keysetLink = page.querySelector('a[href^="/keysets/"]');
    expect(keysetLink).toBeNull();
  });

  it("shows a collapsible documents section", () => {
    const page = renderPage("/quotes/quote-1");
    expect(page.textContent).toContain("Documents");
    expect(page.textContent).toContain("Show documents");
    expect(page.textContent).not.toContain("invoice.pdf");
  });

  it("opens minted bill documents with the attachment endpoint", async () => {
    const page = renderPage("/quotes/quote-1");
    const toggleButton = page.querySelector('button[aria-expanded="false"]');

    act(() => {
      toggleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const buttons = Array.from(page.querySelectorAll("button"));
    const viewButton = buttons.find((button) => button.textContent === "View");

    await act(async () => {
      viewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockGetEbillAttachment).toHaveBeenCalledWith({
      path: {
        bid: "bill-1",
        fname: "invoice.pdf",
      },
      responseStyle: "data",
      parseAs: "blob",
    });
    expect(mockGetEbillFileFromRequestToMint).not.toHaveBeenCalled();
  });

  it("opens request-to-mint documents with the file-url endpoint before minting", async () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      const id = opts.queryKey[0]._id;
      if (id === "getQuote") {
        return {
          data: {
            id: opts.queryKey[0].path?.qid ?? "quote-1",
            status: "Pending",
            bill: {
              id: "bill-1",
              sum: 100,
              maturity_date: "2026-03-01",
              drawee: {},
              drawer: {},
              payee: {},
              endorsees: [],
              file_urls: ["https://files.example.com/invoices/invoice-preview.pdf"],
            },
          },
          isLoading: false,
          isFetching: false,
          error: null,
        };
      }

      if (id === "listEbills") {
        return {
          data: [],
          isLoading: false,
          error: null,
        };
      }

      if (id === "getEbillEndorsements") {
        return { data: [], isLoading: false, error: null };
      }

      if (id === "getEbillMintComplete") {
        return { data: { complete: false }, isLoading: false, error: null };
      }

      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      };
    });

    const page = renderPage("/quotes/quote-1");
    const toggleButton = page.querySelector('button[aria-expanded="false"]');

    act(() => {
      toggleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.textContent).toContain("invoice-preview.pdf");

    const buttons = Array.from(page.querySelectorAll("button"));
    const viewButton = buttons.find((button) => button.textContent === "View");

    await act(async () => {
      viewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockGetEbillFileFromRequestToMint).toHaveBeenCalledWith({
      query: {
        file_url: "https://files.example.com/invoices/invoice-preview.pdf",
      },
      responseStyle: "data",
      parseAs: "blob",
    });
    expect(mockGetEbillAttachment).not.toHaveBeenCalled();
  });
});
