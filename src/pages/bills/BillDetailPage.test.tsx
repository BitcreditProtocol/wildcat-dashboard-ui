import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router";

interface QueryOptions {
  queryKey: { _id: string; path?: { bid?: string }; query?: { bill_id?: string } }[];
}
interface QueryResult {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();
const billId = "bitcrtFPUa5QAPNeJ57qNQykbA5vJ56qZsRrJvYdmuLYKcMRt6";
const quoteId = "97e45adf-fc86-4b30-9322-afae434c3287";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
  };
});

const syncSpy = vi.fn<(value: { body: Record<string, unknown> }) => void>();

vi.mock("@/pages/quotes/components/useSyncBillChain", () => ({
  useSyncBillChain: ({ billId, quoteId }: { billId?: string; quoteId?: string }) => ({
    syncBillChain: () => {
      syncSpy({ body: { bill_id: billId, quote_id: quoteId } });
    },
    isSyncing: false,
    canSync: true,
    hasSyncableBill: true,
  }),
}));

const checkPaymentSpy = vi.fn<(value: { body: Record<string, unknown> }) => void>();

vi.mock("@/hooks/use-check-bill-payment", () => ({
  useCheckBillPayment: ({ billId }: { billId?: string }) => ({
    checkBillPayment: () => {
      checkPaymentSpy({ body: { bill_id: billId } });
    },
    isCheckingPayment: false,
    canCheckPayment: true,
  }),
}));

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getEbillOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: [{ _id: "getEbill", path }] }),
  getEbillHistoryOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: [{ _id: "getEbillHistory", path }] }),
  getEbillPaymentstatusOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: [{ _id: "getEbillPaymentstatus", path }] }),
  listQuotesOptions: ({ query }: { query: { bill_id: string } }) => ({ queryKey: [{ _id: "listQuotes", query }] }),
}));

import BillDetailPage from "./BillDetailPage";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderPage(): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[`/bills/${billId}`]}>
          <Routes>
            <Route path="/bills/:billId" element={<BillDetailPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
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
  mockUseQuery.mockImplementation((opts: QueryOptions) => {
    const id = opts.queryKey[0]._id;

    if (id === "getEbill") {
      return {
        data: {
          id: billId,
          data: {
            sum: "50000",
            currency: "sat",
            issue_date: "2026-09-01",
            maturity_date: "2026-09-16",
            city_of_issuing: "Vienna",
            country_of_issuing: "AT",
            city_of_payment: "Vienna",
            country_of_payment: "AT",
            files: [],
          },
          participants: {
            drawee: { name: "Test user ff 13", node_id: "drawee-node", type: "Person", country: "AS", city: "asd", address: "street" },
            drawer: { name: "Julian Hiess", node_id: "drawer-node", type: "Person", country: "AS", city: "asd", address: "street" },
            payee: {
              Ident: { name: "Julian Hiess", node_id: "drawer-node", type: "Person", country: "AS", city: "asd", address: "street" },
            },
            endorsements: [],
            endorsements_count: 0,
            all_participant_node_ids: [],
          },
          status: {
            acceptance: { accepted: true, requested_to_accept: true, request_to_accept_timed_out: false, rejected_to_accept: false },
            payment: { paid: false, requested_to_pay: false, request_to_pay_timed_out: false, rejected_to_pay: false },
            redeemed_funds_available: false,
            has_requested_funds: false,
            last_block_time: 1_768_000_000,
          },
        },
        isLoading: false,
        error: null,
      };
    }

    if (id === "getEbillHistory") {
      return {
        data: [
          {
            block_id: 1,
            block_type: "Issue",
            signed: {
              data: { Ident: { name: "Julian Hiess", node_id: "drawer-node", type: "Person", country: "AS", city: "asd", address: "s" } },
            },
            signing_timestamp: 1_768_000_000,
          },
        ],
        isLoading: false,
        error: null,
      };
    }

    if (id === "listQuotes") {
      return { data: { data: [{ id: quoteId, status: "Pending", sum: 50_000 }], total: 1 }, isLoading: false, error: null };
    }

    return { data: undefined, isLoading: false, error: null };
  });
});

describe("BillDetailPage", () => {
  it("shows the bill details and its chain for a bill opened on its own page", () => {
    const page = renderPage();

    expect(page.textContent).toContain("50000 sat");
    expect(page.textContent).toContain("Test user ff 13");
    expect(page.textContent).toContain("Bill history");
    expect(page.textContent).toContain("Issue");
  });

  it("links back to the quote the bill was quoted for", () => {
    const page = renderPage();
    expect(page.querySelector(`a[href="/quotes/${quoteId}"]`)).not.toBeNull();
  });

  it("re-syncs the bill chain from nostr when refresh is clicked", () => {
    const page = renderPage();
    const refreshButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh bill"));

    expect(refreshButton).not.toBeUndefined();
    act(() => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(syncSpy).toHaveBeenCalledWith({ body: { bill_id: billId, quote_id: quoteId } });
  });

  it("offers a payment check once payment has been requested and not yet received", () => {
    const page = renderPage();
    const checkButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Check payment"));

    // The fixture has not been requested to pay, so there is nothing to check yet.
    expect(checkButton).toBeUndefined();

    const previous = mockUseQuery.getMockImplementation();
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      const result = previous?.(opts) ?? { data: undefined, isLoading: false, error: null };
      if (opts.queryKey[0]._id === "getEbill") {
        const bill = result.data as { status: { payment: Record<string, boolean> } };
        return { ...result, data: { ...bill, status: { ...bill.status, payment: { ...bill.status.payment, requested_to_pay: true } } } };
      }
      return result;
    });

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;

    const requestedPage = renderPage();
    const requestedButton = Array.from(requestedPage.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Check payment")
    );
    expect(requestedButton).not.toBeUndefined();

    act(() => {
      requestedButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(checkPaymentSpy).toHaveBeenCalledWith({ body: { bill_id: billId } });
  });

  it("leaves the quote link out while no quote references the bill", () => {
    const previous = mockUseQuery.getMockImplementation();
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "listQuotes") {
        return { data: { data: [], total: 0 }, isLoading: false, error: null };
      }
      return previous?.(opts) ?? { data: undefined, isLoading: false, error: null };
    });

    const page = renderPage();
    expect(page.querySelector('a[href^="/quotes/"]')).toBeNull();
    expect(page.textContent).toContain("50000 sat");
  });
});
