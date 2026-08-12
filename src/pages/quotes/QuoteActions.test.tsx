import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { QuoteActions } from "./QuoteActions";
import type { OfferFormResult } from "./components/OfferFormDrawer";
import type { DecisionCase } from "@/pages/credit/decision-types";
import type { InfoReply } from "@/generated/client/types.gen";
import Big from "big.js";

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
const mockInvalidateQueries = vi.fn();
const mockRecordOperatorDecision = vi.fn<(input: unknown) => Promise<{ ok: true } | { ok: false; error: string }>>();
const mockHandleDenyQuote = vi.fn<() => Promise<boolean>>();
const mockHandleOfferQuote = vi.fn<(data: OfferFormResult) => Promise<boolean>>();
const mockHandleRequestToPay = vi.fn();
const mockRemoveItem = vi.fn();
let decisionCase: DecisionCase | undefined;
let offerFormSubmit: ((data: OfferFormResult) => void) | undefined;
let offerConfirmationSubmit: ((data: OfferFormResult) => void) | undefined;
let offerConfirmationOpen = false;
let offerConfirmationOpenChange: ((open: boolean) => void) | undefined;
let denySubmit: ((writtenBasis: string) => void) | undefined;
let returnInfoSubmit: ((writtenBasis: string) => void) | undefined;
let returnInfoOpen = false;
let returnInfoOpenChange: ((open: boolean) => void) | undefined;

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: MockQueryOptions) => {
      seenQueryOptions.push(options);
      return mockUseQuery(options);
    },
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
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
  OfferFormDrawer: ({ children, onSubmit }: { children: ReactNode; onSubmit: (data: OfferFormResult) => void }) => {
    offerFormSubmit = onSubmit;
    return children;
  },
}));

vi.mock("./components/DenyConfirmDrawer", () => ({
  DenyConfirmDrawer: ({
    children,
    mode,
    onSubmit,
    onOpenChange,
    open,
  }: {
    children: ReactNode;
    mode?: "deny" | "return_for_information";
    onSubmit: (writtenBasis: string) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
  }) => {
    if (mode === "return_for_information") {
      returnInfoSubmit = onSubmit;
      returnInfoOpenChange = onOpenChange;
      returnInfoOpen = open;
    } else {
      denySubmit = onSubmit;
    }
    return children;
  },
}));

vi.mock("./components/OfferConfirmation", () => ({
  OfferConfirmation: ({
    onSubmit,
    onOpenChange,
    open,
  }: {
    onSubmit: (data: OfferFormResult) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
  }) => {
    offerConfirmationSubmit = onSubmit;
    offerConfirmationOpenChange = onOpenChange;
    offerConfirmationOpen = open;
    return null;
  },
}));

vi.mock("./components/RequestToPayConfirmation", () => ({
  RequestToPayConfirmation: () => null,
}));

vi.mock("./components/useQuoteMutations", () => ({
  governedOfferTtl: (result: OfferFormResult) => {
    const governedExpiry = result.governedOfferExpiresAt;
    return governedExpiry !== undefined && result.ttl.ttl.getTime() > Date.now() && result.ttl.ttl.getTime() <= governedExpiry.getTime()
      ? result.ttl.ttl.toISOString()
      : null;
  },
  useQuoteMutations: () => ({
    denyQuote: { isPending: false },
    offerQuote: { isPending: false },
    requestToPayMutation: { isPending: false },
    handleDenyQuote: mockHandleDenyQuote,
    handleOfferQuote: mockHandleOfferQuote,
    handleRequestToPay: mockHandleRequestToPay,
  }),
}));

vi.mock("@/pages/credit/use-credit-assessment", () => ({
  useCreditAssessmentForBill: () => ({
    decisionCase,
    isLoading: false,
    error: null,
    isAbsent: decisionCase === undefined,
    isUnavailable: false,
  }),
}));

vi.mock("@/pages/credit/record-operator-decision", () => ({
  operatorMayRecordDecision: () => true,
  recordOperatorDecision: (input: unknown) => mockRecordOperatorDecision(input),
}));

vi.mock("@/utils/local-storage", () => ({
  removeItem: (key: string) => mockRemoveItem(key),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const acceptedQuote = {
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
} as unknown as InfoReply;

const pendingQuote = { ...acceptedQuote, status: "Pending" } as InfoReply;

const governedOffer = {
  snapshot: { caseId: "case-offer", bill: { billId: "bill-1" } },
  result: { assessmentStatus: "ready_for_decision", recommendation: "offer_available", terms: { discountedSat: "95" } },
  resultDigest: `sha256:${"a".repeat(64)}`,
} as unknown as DecisionCase;

const governedNoFit = {
  ...governedOffer,
  snapshot: { ...governedOffer.snapshot, caseId: "case-no-fit" },
  result: { ...governedOffer.result, recommendation: "no_current_product_fit", terms: null },
  resultDigest: `sha256:${"b".repeat(64)}`,
} as unknown as DecisionCase;

const governedVerification = {
  ...governedOffer,
  result: {
    ...governedOffer.result,
    assessmentStatus: "blocked_pending_verification",
    recommendation: null,
    terms: null,
    verificationRequests: [
      { code: "invoice_delivery", axis: "transaction_integrity", requiredItem: "Signed delivery receipt" },
      { code: "acceptor_financials", axis: "acceptor_repayment_risk", requiredItem: "Current acceptor financials" },
    ],
  },
} as unknown as DecisionCase;

const offerData = {
  governance: {
    billId: "bill-1",
    caseId: "case-offer",
    decisionResultDigest: `sha256:${"a".repeat(64)}`,
    action: "confirm_proposed_quote",
    reasonCode: "operator_confirmed_governed_terms",
    writtenBasis: "Offered the governed amount from the dashboard quote actions.",
  },
  discount: {
    days: 30,
    discountRate: new Big(5),
    net: { value: new Big(95), currency: "sat" },
    gross: { value: new Big(100), currency: "sat" },
  },
  ttl: { ttl: new Date("2099-09-01T12:00:00.000Z") },
  governedOfferExpiresAt: new Date("2099-09-02T23:59:59.999Z"),
} satisfies OfferFormResult;

function renderComponent(value = acceptedQuote) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <QuoteActions value={value} isFetching={false} ebillPaid={false} isMintComplete={false} requestedToPay={false} />
      </IntlProvider>
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReset();
  mockUseQuery.mockReturnValue({ data: undefined, error: null });
  seenQueryOptions.length = 0;
  decisionCase = undefined;
  offerFormSubmit = undefined;
  offerConfirmationSubmit = undefined;
  offerConfirmationOpen = false;
  offerConfirmationOpenChange = undefined;
  denySubmit = undefined;
  returnInfoSubmit = undefined;
  returnInfoOpen = false;
  returnInfoOpenChange = undefined;
  mockRecordOperatorDecision.mockResolvedValue({ ok: true });
  mockHandleDenyQuote.mockResolvedValue(true);
  mockHandleOfferQuote.mockResolvedValue(true);
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

  it("records nothing when the operator cancels the final offer confirmation", () => {
    decisionCase = governedOffer;
    const page = renderComponent(pendingQuote);

    expect(page.textContent).toContain("Offer");
    expect(page.textContent).toContain("Deny");
    act(() => {
      offerFormSubmit?.(offerData);
    });
    expect(offerConfirmationOpen).toBe(true);

    act(() => {
      offerConfirmationOpenChange?.(false);
    });
    expect(mockRecordOperatorDecision).not.toHaveBeenCalled();
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
  });

  it("fails closed at final confirmation and lets the operator retry", async () => {
    decisionCase = governedOffer;
    mockRecordOperatorDecision.mockResolvedValueOnce({ ok: false, error: "stale case" }).mockResolvedValueOnce({ ok: true });
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenCalledWith(offerData.governance);
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
    expect(offerConfirmationOpen).toBe(true);

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenCalledTimes(2);
    expect(mockHandleOfferQuote).toHaveBeenCalledOnce();
    expect(mockHandleOfferQuote).toHaveBeenCalledWith(offerData);
    expect(offerConfirmationOpen).toBe(false);
  });

  it("keeps the exact governed offer available when the Mint update fails", async () => {
    decisionCase = governedOffer;
    mockHandleOfferQuote.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(offerConfirmationOpen).toBe(true);
    expect(mockRemoveItem).not.toHaveBeenCalled();

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenNthCalledWith(1, offerData.governance);
    expect(mockRecordOperatorDecision).toHaveBeenNthCalledWith(2, offerData.governance);
    expect(mockHandleOfferQuote).toHaveBeenNthCalledWith(1, offerData);
    expect(mockHandleOfferQuote).toHaveBeenNthCalledWith(2, offerData);
    expect(mockRemoveItem).toHaveBeenCalledWith("offer-form-quote-1");
    expect(offerConfirmationOpen).toBe(false);
  });

  it("does not record governance or reach the Mint when the governed offer has expired", async () => {
    decisionCase = governedOffer;
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.({
        ...offerData,
        ttl: { ttl: new Date("2026-01-01T00:00:00.000Z") },
        governedOfferExpiresAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).not.toHaveBeenCalled();
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
    expect(offerConfirmationOpen).toBe(true);
  });

  it("does not reach the Mint when governance unexpectedly rejects", async () => {
    decisionCase = governedOffer;
    mockRecordOperatorDecision.mockRejectedValue(new Error("network failure"));
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
    });
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
    expect(offerConfirmationOpen).toBe(true);
  });

  it("coalesces rapid final confirmations into one governance and Mint action", async () => {
    decisionCase = governedOffer;
    let resolveRecord: ((result: { ok: true }) => void) | undefined;
    mockRecordOperatorDecision.mockReturnValue(
      new Promise((resolve) => {
        resolveRecord = resolve;
      })
    );
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      offerConfirmationSubmit?.(offerData);
      expect(mockRecordOperatorDecision).toHaveBeenCalledOnce();
      resolveRecord?.({ ok: true });
      await Promise.resolve();
    });
    expect(mockHandleOfferQuote).toHaveBeenCalledOnce();
  });

  it("governs no-fit denial and fails closed", async () => {
    decisionCase = governedNoFit;
    mockRecordOperatorDecision.mockResolvedValueOnce({ ok: false, error: "adapter unavailable" }).mockResolvedValueOnce({ ok: true });
    const page = renderComponent(pendingQuote);

    expect(page.textContent).toContain("Deny");
    expect(page.textContent).not.toContain("Offer");
    await act(async () => {
      denySubmit?.("Reviewed the deterministic no-fit result and confirmed it.");
      await Promise.resolve();
    });
    expect(mockHandleDenyQuote).not.toHaveBeenCalled();

    await act(async () => {
      denySubmit?.("Reviewed the deterministic no-fit result and confirmed it.");
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenLastCalledWith({
      billId: "bill-1",
      caseId: "case-no-fit",
      decisionResultDigest: `sha256:${"b".repeat(64)}`,
      action: "confirm_no_current_product_fit",
      reasonCode: "operator_confirmed_no_current_product_fit",
      writtenBasis: "Reviewed the deterministic no-fit result and confirmed it.",
    });
    expect(mockHandleDenyQuote).toHaveBeenCalledOnce();
  });

  it("shows and governs Deny for an available offer", async () => {
    decisionCase = governedOffer;
    const offerPage = renderComponent(pendingQuote);
    expect(offerPage.textContent).toContain("Deny");

    await act(async () => {
      denySubmit?.("Reviewed the governed offer and declined this application.");
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenCalledWith({
      billId: "bill-1",
      caseId: "case-offer",
      decisionResultDigest: `sha256:${"a".repeat(64)}`,
      action: "decline_application",
      reasonCode: "operator_declined_governed_offer",
      writtenBasis: "Reviewed the governed offer and declined this application.",
    });
    expect(mockHandleDenyQuote).toHaveBeenCalledOnce();
  });

  it("shows fail-closed Deny and governs Return for information with the named verification items", async () => {
    decisionCase = governedVerification;
    mockRecordOperatorDecision.mockResolvedValueOnce({ ok: false, error: "adapter unavailable" }).mockResolvedValueOnce({ ok: true });
    const page = renderComponent(pendingQuote);
    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));

    expect(denyButton?.disabled).toBe(true);
    expect(denyButton?.title).toBe("Deny is unavailable until the governed assessment is ready.");
    expect(page.textContent).not.toContain("Offer");
    expect(page.textContent).toContain("Record required information");

    act(() => {
      returnInfoOpenChange?.(true);
    });
    await act(async () => {
      returnInfoSubmit?.("The named verification items must be supplied before a decision.");
      await Promise.resolve();
    });
    expect(returnInfoOpen).toBe(true);

    await act(async () => {
      returnInfoSubmit?.("The named verification items must be supplied before a decision.");
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenLastCalledWith({
      billId: "bill-1",
      caseId: "case-offer",
      decisionResultDigest: `sha256:${"a".repeat(64)}`,
      action: "return_for_information",
      reasonCode: "operator_returned_for_information",
      writtenBasis: "The named verification items must be supplied before a decision.",
      requiredItems: ["Signed delivery receipt", "Current acceptor financials"],
    });
    expect(mockHandleDenyQuote).not.toHaveBeenCalled();
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
    expect(returnInfoOpen).toBe(false);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["ai-credit", "decisions"] });
  });
});
