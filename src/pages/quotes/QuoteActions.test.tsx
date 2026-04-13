import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: (options: MockQueryOptions) => {
      seenQueryOptions.push(options);
      return mockUseQuery(options);
    },
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getEbillOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbill", path }],
  }),
  getMintInfoOptions: () => ({
    queryKey: [{ _id: "getMintInfo" }],
  }),
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

function renderComponent() {
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
        />
      </IntlProvider>,
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
}

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
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("QuoteActions", () => {
  it("does not request mint info when backend mempool link is present", () => {
    mockUseQuery.mockImplementation(
      (options: { queryKey: [{ _id: string }] }) => {
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
                    link_to_pay: "",
                    address_to_pay: "tb1address",
                    mempool_link_for_address_to_pay:
                      "https://backend.example/tx/abc",
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

        return { data: undefined, error: null };
      },
    );

    const page = renderComponent();

    expect(page.textContent).toContain("https://backend.example/tx/abc");
    expect(mockUseQuery).toHaveBeenCalledTimes(2);
    expect(seenQueryOptions[1]?.enabled).toBe(false);
  });

  it("builds a fallback mempool link when backend value is blank", () => {
    mockUseQuery.mockImplementation(
      (options: { queryKey: [{ _id: string }] }) => {
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
                    link_to_pay: "",
                    address_to_pay: "tb1address",
                    mempool_link_for_address_to_pay: "",
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
      },
    );

    const page = renderComponent();
    const link = page.querySelector(
      'a[href="https://esplora.minibill.tech/testnet/tx/abc"]',
    );

    expect(link).not.toBeNull();
    expect(seenQueryOptions[1]?.enabled).toBe(true);
  });
});
