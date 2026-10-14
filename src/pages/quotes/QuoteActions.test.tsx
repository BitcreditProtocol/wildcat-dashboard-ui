import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillHistoryBlock } from "@/generated/client/types.gen";
import { IntlProvider } from "react-intl";
import { QuoteActions } from "./QuoteActions";

interface MockQueryOptions {
  queryKey: [{ _id: string; path?: { bid: string } }];
  enabled?: boolean;
}

interface MockQueryResult {
  data: unknown;
  error: Error | null;
}

const seenQueryOptions: MockQueryOptions[] = [];
const mockUseQuery = vi.fn<(options: MockQueryOptions) => MockQueryResult>();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: MockQueryOptions) => {
      seenQueryOptions.push(options);
      return mockUseQuery(options);
    },
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getEbillOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbill", path }],
  }),
  getMintInfoOptions: () => ({
    queryKey: [{ _id: "getMintInfo" }],
  }),
  // The payment check the request box carries; its mutation only needs to exist to render.
  checkBillPaymentMutation: () => ({ mutationFn: vi.fn() }),
  getEbillHistoryOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: [{ _id: "getEbillHistory", path }] }),
  getEbillPaymentstatusOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: [{ _id: "getEbillPaymentstatus", path }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({ queryKey: [{ _id: "getQuote", path }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
}));

vi.mock("./components/OfferFormDrawer", () => ({
  OfferFormDrawer: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./components/DenyConfirmDrawer", () => ({
  DenyConfirmDrawer: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./components/OfferConfirmation", () => ({
  OfferConfirmation: () => null,
}));

vi.mock("./components/RequestToPayConfirmation", () => ({
  RequestToPayConfirmation: () => null,
}));

vi.mock("./components/useQuoteMutations", () => ({
  useQuoteMutations: () => ({
    denyQuote: { isPending: false },
    offerQuote: { isPending: false },
    requestToPayMutation: { isPending: false },
    handleDenyQuote: vi.fn(),
    handleOfferQuote: vi.fn(),
    handleRequestToPay: vi.fn(),
  }),
}));

vi.mock("@/utils/local-storage", () => ({
  removeItem: vi.fn(),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const quoteValue = {
  id: "quote-1",
  status: "Accepted",
  keyset_id: "keyset-1",
  bill: {
    id: "bill-1",
    sum: 100,
    maturity_date: "2026-03-01",
    drawee: {},
    drawer: {},
    payee: {},
    endorsees: [],
  },
} as never;

function renderComponent(historyBlocks?: BillHistoryBlock[]) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <QuoteActions
          value={quoteValue}
          isFetching={false}
          ebillPaid={false}
          isMintComplete={false}
          requestedToPay={false}
          historyBlocks={historyBlocks}
        />
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
  seenQueryOptions.length = 0;
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe("QuoteActions", () => {
  it("builds a mempool link from tx_id and requests mint info", () => {
    mockUseQuery.mockImplementation((options: { queryKey: [{ _id: string }] }) => {
      if (options.queryKey[0]._id === "getEbill") {
        return {
          data: {
            status: {
              payment: { requested_to_pay: true, paid: false },
            },
            current_waiting_state: {
              Payment: {
                payment_data: {
                  time_of_request: 1,
                  currency: "sat",
                  sum: "100",
                  address_to_pay: "tb1address",
                  tx_id: "abc",
                  in_mempool: false,
                  confirmations: 0,
                  payment_deadline: 2,
                },
              },
            },
          },
          error: null,
        };
      }

      if (options.queryKey[0]._id === "getMintInfo") {
        return { data: { network: "testnet" }, error: null };
      }

      return { data: undefined, error: null };
    });

    const page = renderComponent();
    const link = page.querySelector('a[href="https://esplora.minibill.tech/testnet/tx/abc"]');

    expect(link).not.toBeNull();
    expect(seenQueryOptions[1]?.enabled).toBe(true);
  });

  it("carries the payment check in the payment request box", () => {
    mockUseQuery.mockImplementation((options: { queryKey: [{ _id: string }] }) =>
      options.queryKey[0]._id === "getEbill"
        ? { data: { status: { payment: { requested_to_pay: true, paid: false } } }, error: null }
        : { data: undefined, error: null }
    );

    const page = renderComponent();
    const heading = Array.from(page.querySelectorAll("h2")).find((entry) => entry.textContent?.includes("Payment request"));

    expect(heading).toBeDefined();
    // Beside the box's own title, rather than up in the page's action row.
    expect(heading?.parentElement?.querySelector("button")?.textContent).toContain("Check payment");
  });

  it("offers no payment check before the mint has asked for payment", () => {
    mockUseQuery.mockImplementation((options: { queryKey: [{ _id: string }] }) =>
      options.queryKey[0]._id === "getEbill"
        ? { data: { status: { payment: { requested_to_pay: false, paid: false } } }, error: null }
        : { data: undefined, error: null }
    );

    const page = renderComponent();

    expect(page.textContent).not.toContain("Payment request");
    expect(page.textContent).not.toContain("Check payment");
  });

  it("keeps the requested payment details after the payer rejected to pay", () => {
    // A rejection ends the waiting state, so the bill itself no longer carries the address.
    mockUseQuery.mockImplementation((options: { queryKey: [{ _id: string }] }) =>
      options.queryKey[0]._id === "getEbill"
        ? { data: { status: { payment: { requested_to_pay: false, rejected_to_pay: true, paid: false } } }, error: null }
        : { data: undefined, error: null }
    );

    const signed = { data: { Anon: { node_id: "node" } } } as BillHistoryBlock["signed"];
    const page = renderComponent([
      { block_id: 1, block_type: "Issue", signed, signing_timestamp: 1_000 },
      {
        block_id: 2,
        block_type: "RequestToPay",
        signed,
        signing_timestamp: 1_767_225_600,
        request_deadline: 1_767_830_400,
        payment_data: { sum: "100", currency: "sat", payment_address: "tb1qrequested" },
      },
      { block_id: 3, block_type: "RejectToPay", signed, signing_timestamp: 1_767_312_000 },
    ]);

    expect(page.textContent).toContain("Payment request");
    expect(page.textContent).toContain("tb1qrequested");
    expect(page.textContent).toContain("Deadline");
    expect(page.textContent).toContain("The payer rejected to pay this bill.");
  });

  it("drops the payment check once the bill is paid", () => {
    mockUseQuery.mockImplementation((options: { queryKey: [{ _id: string }] }) =>
      options.queryKey[0]._id === "getEbill"
        ? { data: { status: { payment: { requested_to_pay: true, paid: true } } }, error: null }
        : { data: undefined, error: null }
    );

    const page = renderComponent();

    // The box stays — it is the record of the request — but there is nothing left to check.
    expect(page.textContent).toContain("Payment request");
    expect(page.textContent).not.toContain("Check payment");
  });
});
