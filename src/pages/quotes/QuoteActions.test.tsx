import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { QuoteActions } from "./QuoteActions";
import type { OfferFormResult } from "./components/OfferFormDrawer";
import type { ApplicantHumanReviewRecord, DecisionCase, OperatorMaterialEvidenceSelection } from "@/pages/credit/decision-types";
import type {
  MintRiskAssessmentInput,
  MintAuthorityEvidenceInput,
  OperatorCapability,
  OperatorDecisionInput,
  OperatorDecisionSuccess,
  SignedOfferAuthorization,
  VerifiedAuthorizationReceipt,
} from "@/pages/credit/record-operator-decision";
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
const mockRecordOperatorDecision =
  vi.fn<(input: OperatorDecisionInput) => Promise<OperatorDecisionSuccess | { ok: false; error: string }>>();
const mockRecordMintRiskAssessment =
  vi.fn<
    (input: MintRiskAssessmentInput, capability: OperatorCapability | undefined) => Promise<{ ok: true } | { ok: false; error: string }>
  >();
const mockRecordMintCapacityAssessment =
  vi.fn<
    (input: MintAuthorityEvidenceInput, capability: OperatorCapability | undefined) => Promise<{ ok: true } | { ok: false; error: string }>
  >();
const mockRetryOperatorVerificationSources =
  vi.fn<
    (
      input: Pick<MintRiskAssessmentInput, "billId" | "caseId" | "decisionResultDigest">,
      capability: OperatorCapability | undefined
    ) => Promise<{ ok: true } | { ok: false; error: string }>
  >();
const mockHandleDenyQuote = vi.fn<() => Promise<boolean>>();
const mockHandleOfferQuote = vi.fn<(authorization: SignedOfferAuthorization) => Promise<boolean>>();
const mockHandleRequestToPay = vi.fn();
const mockRemoveItem = vi.fn();
let decisionCase: DecisionCase | undefined;
let offerFormSubmit: ((data: OfferFormResult) => void) | undefined;
let offerConfirmationSubmit: ((data: OfferFormResult) => void) | undefined;
let offerConfirmationOpen = false;
let offerConfirmationOpenChange: ((open: boolean) => void) | undefined;
let denySubmit: ((writtenBasis: string, materialEvidence: OperatorMaterialEvidenceSelection[]) => void) | undefined;
let returnInfoSubmit: ((writtenBasis: string) => void) | undefined;
let returnInfoOpen = false;
let returnInfoOpenChange: ((open: boolean) => void) | undefined;
let closeUnableSubmit: ((writtenBasis: string) => void) | undefined;
let mintRiskSubmit: ((value: { signedEvidence: Record<string, unknown>; writtenBasis: string }) => void) | undefined;
let mintCapacitySubmit: ((value: { signedEvidence: Record<string, unknown>; writtenBasis: string }) => void) | undefined;
let operatorCapability: OperatorCapability | undefined = { ready: true, operatorId: "operator-123", operatorRole: "approver" };
let operatorCapabilityError: string | null = null;
let creditAssessmentUnavailable = false;

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
    mode?: "deny" | "return_for_information" | "close_unable_to_assess";
    onSubmit: (writtenBasis: string, materialEvidence: OperatorMaterialEvidenceSelection[]) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
  }) => {
    if (mode === "return_for_information") {
      returnInfoSubmit = (writtenBasis) => {
        onSubmit(writtenBasis, []);
      };
      returnInfoOpenChange = onOpenChange;
      returnInfoOpen = open;
    } else if (mode === "close_unable_to_assess") {
      closeUnableSubmit = (writtenBasis) => {
        onSubmit(writtenBasis, []);
      };
    } else {
      denySubmit = onSubmit;
    }
    return children;
  },
}));

vi.mock("./components/MintRiskAssessmentDrawer", () => ({
  MintRiskAssessmentDrawer: ({
    children,
    kind = "risk",
    onSubmit,
  }: {
    children: ReactNode;
    kind?: "risk" | "capacity";
    onSubmit: typeof mintRiskSubmit;
  }) => {
    if (kind === "capacity") mintCapacitySubmit = onSubmit;
    else mintRiskSubmit = onSubmit;
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
    isUnavailable: creditAssessmentUnavailable,
  }),
}));

vi.mock("@/pages/credit/record-operator-decision", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/pages/credit/record-operator-decision")>()),
  operatorMayRecordDecision: (capability: OperatorCapability | undefined, action: string) =>
    capability?.operatorRole === "approver" || (capability?.operatorRole === "reviewer" && action === "return_for_information"),
  recordOperatorDecision: (input: OperatorDecisionInput) => mockRecordOperatorDecision(input),
  recordMintRiskAssessment: (input: MintRiskAssessmentInput, capability: OperatorCapability | undefined) =>
    mockRecordMintRiskAssessment(input, capability),
  recordMintCapacityAssessment: (input: MintAuthorityEvidenceInput, capability: OperatorCapability | undefined) =>
    mockRecordMintCapacityAssessment(input, capability),
  retryOperatorVerificationSources: (
    input: Pick<MintRiskAssessmentInput, "billId" | "caseId" | "decisionResultDigest">,
    capability: OperatorCapability | undefined
  ) => mockRetryOperatorVerificationSources(input, capability),
}));

vi.mock("@/pages/credit/use-operator-capability", () => ({
  useOperatorCapability: () => ({ capability: operatorCapability, error: operatorCapabilityError, isLoading: false }),
}));

vi.mock("@/utils/local-storage", () => ({
  removeItem: (key: string) => {
    mockRemoveItem(key);
  },
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
  mintQuoteId: "quote-1",
  snapshot: { caseId: "case-offer", bill: { billId: "bill-1" } },
  creditProgram: {
    schemaVersion: "credit-program-v1",
    creditProgramId: "gt_coffee_accepted_bill",
    creditProgramVersion: "gt-coffee-program-v1",
  },
  creditProgramAssignment: {
    schemaVersion: "mint-credit-program-selection-v1",
    mintQuoteId: "quote-1",
    billId: "bill-1",
    creditProgramVersion: "gt-coffee-program-v1",
    creditProgramDigest: `sha256:${"c".repeat(64)}`,
  },
  result: { assessmentStatus: "ready_for_decision", recommendation: "offer_available", terms: { discountedSat: "95" } },
  resultDigest: `sha256:${"a".repeat(64)}`,
  availableMaterialEvidence: [
    { kind: "bill_state", reference: `sha256:${"d".repeat(64)}` },
    { kind: "submitted_document", reference: "invoice-a", label: "commercial-invoice.pdf" },
  ],
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
      {
        code: "invoice_delivery",
        axis: "transaction_integrity",
        requiredItem: "Signed delivery receipt",
        reasonCode: "verification_invoice_delivery_required",
        owner: "applicant",
        resolutionAction: "request_applicant_information",
      },
      {
        code: "acceptor_financials",
        axis: "acceptor_repayment_risk",
        requiredItem: "Current acceptor financials",
        reasonCode: "verification_acceptor_financials_required",
        owner: "applicant",
        resolutionAction: "request_applicant_information",
      },
    ],
  },
} as unknown as DecisionCase;

const governedMintRiskVerification = {
  ...governedVerification,
  result: {
    ...governedVerification.result,
    verificationRequests: [
      {
        code: "acceptor",
        axis: "acceptor_repayment_risk",
        requiredItem: "Current governed acceptor probability of default and loss given default",
        reasonCode: "verification_acceptor_loss_parameters_required",
        owner: "mint_risk",
        resolutionAction: "record_acceptor_risk_assessment",
      },
    ],
  },
} as unknown as DecisionCase;

const governedMintCapacityVerification = {
  ...governedVerification,
  result: {
    ...governedVerification.result,
    verificationRequests: [
      {
        code: "mint_capacity",
        axis: "mint_exposure_capacity",
        requiredItem: "Current Mint exposure and capacity snapshot",
        reasonCode: "verification_mint_capacity_required",
        owner: "mint_operations",
        resolutionAction: "refresh_mint_capacity",
      },
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

const signedAuthorization = {
  authorization: {
    schemaVersion: "credit-authorization-v7",
    keyId: "synthetic-testnet-key-1",
    mintId: "mint-demo",
    mintQuoteId: "quote-1",
    billId: "bill-1",
    action: "request_to_mint",
    expiresAt: "2099-09-02T23:59:59.999Z",
    synthetic: true,
    terms: { discountedSat: "95", offerExpiresOn: "2099-09-02" },
  },
  authorizationDigest: `sha256:${"c".repeat(64)}`,
  signatureAlgorithm: "Ed25519",
  signature: "synthetic-signature",
} satisfies SignedOfferAuthorization;

function renderComponent(value = acceptedQuote, onAuthorizationVerified?: (receipt: VerifiedAuthorizationReceipt) => void) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <QuoteActions
          value={value}
          isFetching={false}
          ebillPaid={false}
          isMintComplete={false}
          requestedToPay={false}
          onAuthorizationVerified={onAuthorizationVerified}
        />
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
  closeUnableSubmit = undefined;
  mintRiskSubmit = undefined;
  mintCapacitySubmit = undefined;
  operatorCapability = { ready: true, operatorId: "operator-123", operatorRole: "approver" };
  operatorCapabilityError = null;
  creditAssessmentUnavailable = false;
  mockRecordOperatorDecision.mockImplementation((input) =>
    Promise.resolve(
      input.action === "confirm_proposed_quote" || input.action === "propose_adjustment_and_requote"
        ? { ok: true, signedAuthorization }
        : { ok: true }
    )
  );
  mockHandleDenyQuote.mockResolvedValue(true);
  mockHandleOfferQuote.mockResolvedValue(true);
  mockRecordMintRiskAssessment.mockResolvedValue({ ok: true });
  mockRecordMintCapacityAssessment.mockResolvedValue({ ok: true });
  mockRetryOperatorVerificationSources.mockResolvedValue({ ok: true });
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
  it.each([
    ["requested", null],
    ["in_review", null],
    ["completed", "correction_or_reassessment_required"],
    ["completed", "decision_upheld"],
  ] as const)("keeps a %s applicant review read-only", (status, resolution) => {
    const applicantHumanReview: ApplicantHumanReviewRecord = {
      request: {
        schemaVersion: "applicant-human-review-request-v1",
        requestId: "review-1",
        caseId: "case-offer",
        applicantRef: "applicant-1",
        contestedDecisionResultDigest: `sha256:${"a".repeat(64)}`,
        statement: "Please have another operator review this decision.",
        requestedAt: "2026-08-25T08:00:00.000Z",
        synthetic: true,
      },
      status,
      reviewer: status === "requested" ? null : { reviewerId: "reviewer-123", reviewerRole: "reviewer" },
      resolution,
      writtenBasis: resolution === null ? null : "Independent review completed with an attributable basis.",
      statusChangedAt: "2026-08-25T09:00:00.000Z",
    };
    decisionCase = { ...governedOffer, applicantHumanReview };

    const page = renderComponent(pendingQuote);
    const actions = Array.from(page.querySelectorAll("button")).map((button) => button.textContent);

    expect(actions).not.toContain("Offer");
    expect(actions).not.toContain("Deny");
    expect(page.textContent).toContain("Applicant requested a second review");
  });

  it("disables governed decisions and exposes the capability error when the handshake fails", () => {
    decisionCase = governedOffer;
    operatorCapability = undefined;
    operatorCapabilityError = "Operator token does not match the running service";
    const page = renderComponent(pendingQuote);
    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));
    const offerButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Offer"));

    expect(denyButton?.disabled).toBe(true);
    expect(offerButton?.disabled).toBe(true);
    expect(denyButton?.title).toBe(operatorCapabilityError);
    expect(offerButton?.title).toBe(operatorCapabilityError);
  });

  it("fails closed when a discretionary decline has no server-listed material evidence", () => {
    decisionCase = { ...governedOffer, availableMaterialEvidence: [] };
    const page = renderComponent(pendingQuote);
    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));

    expect(denyButton?.disabled).toBe(true);
    expect(denyButton?.title).toContain("no current evidence");
  });

  it("allows a reviewer to return verification work but not decide the quote", () => {
    decisionCase = governedVerification;
    operatorCapability = { ready: true, operatorId: "reviewer-123", operatorRole: "reviewer" };
    const page = renderComponent(pendingQuote);
    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));
    const returnButton = Array.from(page.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Record required information")
    );

    expect(denyButton).toBeUndefined();
    expect(returnButton?.disabled).toBe(false);
  });

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

  it("keeps legacy quote-bound decisions read-only until the Mint program assignment is present", () => {
    decisionCase = { ...governedOffer, creditProgram: undefined, creditProgramAssignment: undefined };
    const page = renderComponent(pendingQuote);

    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));
    expect(denyButton?.disabled).toBe(true);
    expect(denyButton?.title).toBe("A fresh Mint credit-program assignment is required before this quote can be acted on.");
    expect(page.textContent).not.toContain("Offer quote");
    expect(mockRecordOperatorDecision).not.toHaveBeenCalled();
  });

  it("keeps a valid assessment for another quote read-only", () => {
    const assignment = governedOffer.creditProgramAssignment;
    if (assignment === undefined) throw new Error("Expected a quote-bound credit-program assignment");
    decisionCase = {
      ...governedOffer,
      mintQuoteId: "quote-other",
      creditProgramAssignment: { ...assignment, mintQuoteId: "quote-other" },
    };
    const page = renderComponent(pendingQuote);

    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));
    expect(denyButton?.disabled).toBe(true);
    expect(page.textContent).not.toContain("Offer quote");
    expect(mockRecordOperatorDecision).not.toHaveBeenCalled();
  });

  it("does not send a stale confirmation after the governed assessment becomes unavailable", async () => {
    decisionCase = governedOffer;
    creditAssessmentUnavailable = true;
    renderComponent(pendingQuote);

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
    });

    expect(mockRecordOperatorDecision).not.toHaveBeenCalled();
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
  });

  it("fails closed at final confirmation and lets the operator retry", async () => {
    decisionCase = governedOffer;
    mockRecordOperatorDecision
      .mockResolvedValueOnce({ ok: false, error: "stale case" })
      .mockResolvedValueOnce({ ok: true, signedAuthorization });
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
    expect(mockHandleOfferQuote).toHaveBeenCalledWith(signedAuthorization);
    expect(offerConfirmationOpen).toBe(false);
  });

  it("does not reach the Mint when signed terms differ from the confirmed offer", async () => {
    decisionCase = governedOffer;
    mockRecordOperatorDecision.mockResolvedValue({
      ok: true,
      signedAuthorization: {
        ...signedAuthorization,
        authorization: {
          ...signedAuthorization.authorization,
          terms: { ...signedAuthorization.authorization.terms, discountedSat: "94" },
        },
      },
    });
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

    mockRecordOperatorDecision.mockResolvedValue({ ok: true, signedAuthorization });
    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenCalledTimes(2);
    expect(mockHandleOfferQuote).toHaveBeenCalledWith(signedAuthorization);
  });

  it("publishes the verified receipt only after the Mint accepts the signed command", async () => {
    decisionCase = governedOffer;
    const onAuthorizationVerified = vi.fn<(receipt: VerifiedAuthorizationReceipt) => void>();
    renderComponent(pendingQuote, onAuthorizationVerified);
    act(() => {
      offerFormSubmit?.(offerData);
    });

    await act(async () => {
      offerConfirmationSubmit?.(offerData);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onAuthorizationVerified).toHaveBeenCalledWith({
      keyId: "synthetic-testnet-key-1",
      mintId: "mint-demo",
      mintQuoteId: "quote-1",
      billId: "bill-1",
      action: "request_to_mint",
      expiresAt: "2099-09-02T23:59:59.999Z",
      authorizationDigest: `sha256:${"c".repeat(64)}`,
    });
  });

  it("keeps an adjusted offer in confirmation when governed requote fails", async () => {
    decisionCase = governedOffer;
    const adjustedOffer = {
      ...offerData,
      governance: {
        ...offerData.governance,
        action: "propose_adjustment_and_requote" as const,
        discountedSat: "94",
        reasonCode: "operator_adjusted_price_within_bounds",
      },
      discount: { ...offerData.discount, net: { ...offerData.discount.net, value: new Big(94) } },
    };
    mockRecordOperatorDecision.mockResolvedValue({ ok: false, error: "The adjusted amount is outside policy" });
    renderComponent(pendingQuote);
    act(() => {
      offerFormSubmit?.(adjustedOffer);
    });

    await act(async () => {
      offerConfirmationSubmit?.(adjustedOffer);
      await Promise.resolve();
    });

    expect(mockRecordOperatorDecision).toHaveBeenCalledWith(adjustedOffer.governance);
    expect(mockHandleOfferQuote).not.toHaveBeenCalled();
    expect(offerConfirmationOpen).toBe(true);
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
    expect(mockRecordOperatorDecision).toHaveBeenCalledOnce();
    expect(mockRecordOperatorDecision).toHaveBeenCalledWith(offerData.governance);
    expect(mockHandleOfferQuote).toHaveBeenNthCalledWith(1, signedAuthorization);
    expect(mockHandleOfferQuote).toHaveBeenNthCalledWith(2, signedAuthorization);
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
    let resolveRecord: ((result: OperatorDecisionSuccess) => void) | undefined;
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
      resolveRecord?.({ ok: true, signedAuthorization });
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
      denySubmit?.("Reviewed the deterministic no-fit result and confirmed it.", []);
      await Promise.resolve();
    });
    expect(mockHandleDenyQuote).not.toHaveBeenCalled();

    await act(async () => {
      denySubmit?.("Reviewed the deterministic no-fit result and confirmed it.", []);
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenLastCalledWith({
      billId: "bill-1",
      caseId: "case-no-fit",
      decisionResultDigest: `sha256:${"b".repeat(64)}`,
      action: "confirm_no_current_product_fit",
      reasonCode: "operator_confirmed_no_current_product_fit",
      writtenBasis: "Reviewed the deterministic no-fit result and confirmed it.",
      materialEvidence: [],
    });
    expect(mockHandleDenyQuote).toHaveBeenCalledOnce();
  });

  it("shows and governs Deny for an available offer", async () => {
    decisionCase = governedOffer;
    const offerPage = renderComponent(pendingQuote);
    expect(offerPage.textContent).toContain("Deny");

    await act(async () => {
      denySubmit?.("Reviewed the governed offer and declined this application.", [{ kind: "submitted_document", reference: "invoice-a" }]);
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenCalledWith({
      billId: "bill-1",
      caseId: "case-offer",
      decisionResultDigest: `sha256:${"a".repeat(64)}`,
      action: "decline_application",
      reasonCode: "operator_declined_governed_offer",
      writtenBasis: "Reviewed the governed offer and declined this application.",
      materialEvidence: [{ kind: "submitted_document", reference: "invoice-a" }],
    });
    expect(mockHandleDenyQuote).toHaveBeenCalledOnce();
  });

  it("shows fail-closed Deny and governs Return for information with the named verification items", async () => {
    decisionCase = governedVerification;
    mockRecordOperatorDecision.mockResolvedValueOnce({ ok: false, error: "adapter unavailable" }).mockResolvedValueOnce({ ok: true });
    const page = renderComponent(pendingQuote);
    const denyButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Deny"));

    expect(denyButton).toBeUndefined();
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

  it("routes Mint-owned risk work internally and can close the unresolved case", async () => {
    decisionCase = governedMintRiskVerification;
    const page = renderComponent(pendingQuote);

    expect(page.textContent).toContain("Add Mint risk assessment");
    expect(page.textContent).not.toContain("Record required information");
    expect(page.textContent).toContain("Close — unable to assess");

    await act(async () => {
      mintRiskSubmit?.({
        signedEvidence: {
          evidence: { acceptorRef: "acceptor-1", keyId: "risk-authority-v1" },
          evidenceDigest: `sha256:${"b".repeat(64)}`,
          signatureAlgorithm: "Ed25519",
          signature: "signed-by-risk-authority",
        },
        writtenBasis: "Current risk register entry reviewed against the approved methodology.",
      });
      await Promise.resolve();
    });
    expect(mockRecordMintRiskAssessment).toHaveBeenCalledWith(
      {
        mintQuoteId: pendingQuote.id,
        billId: "bill-1",
        caseId: "case-offer",
        decisionResultDigest: governedMintRiskVerification.resultDigest,
        signedEvidence: {
          evidence: { acceptorRef: "acceptor-1", keyId: "risk-authority-v1" },
          evidenceDigest: `sha256:${"b".repeat(64)}`,
          signatureAlgorithm: "Ed25519",
          signature: "signed-by-risk-authority",
        },
        writtenBasis: "Current risk register entry reviewed against the approved methodology.",
      },
      operatorCapability
    );

    await act(async () => {
      closeUnableSubmit?.("The Mint could not obtain the evidence needed for an informed decision.");
      await Promise.resolve();
    });
    expect(mockRecordOperatorDecision).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "close_unable_to_assess",
        reasonCode: "operator_closed_unable_to_assess",
        requiredItems: ["Current governed acceptor probability of default and loss given default"],
      })
    );
    expect(mockHandleDenyQuote).toHaveBeenCalledOnce();
  });

  it("imports a signed Mint capacity snapshot instead of offering a blind retry", async () => {
    decisionCase = governedMintCapacityVerification;
    const page = renderComponent(pendingQuote);

    expect(page.textContent).toContain("Add Mint capacity snapshot");
    expect(page.textContent).not.toContain("Retry Mint source checks");

    const signedEvidence = {
      evidence: { mintId: "mint-demo", keyId: "capacity-authority-v1" },
      evidenceDigest: `sha256:${"c".repeat(64)}`,
      signatureAlgorithm: "Ed25519",
      signature: "signed-by-capacity-authority",
    };
    await act(async () => {
      mintCapacitySubmit?.({
        signedEvidence,
        writtenBasis: "Current capacity ledger snapshot reviewed for this offer cycle.",
      });
      await Promise.resolve();
    });
    expect(mockRecordMintCapacityAssessment).toHaveBeenCalledWith(
      {
        mintQuoteId: pendingQuote.id,
        billId: "bill-1",
        caseId: "case-offer",
        decisionResultDigest: governedMintCapacityVerification.resultDigest,
        signedEvidence,
        writtenBasis: "Current capacity ledger snapshot reviewed for this offer cycle.",
      },
      operatorCapability
    );
  });
});
