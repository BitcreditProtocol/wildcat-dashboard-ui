import Big from "big.js";
import type { InfoReply } from "@/generated/client/types.gen";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionCase } from "@/pages/credit/decision-types";
import type { OfferFormResult } from "./OfferFormDrawer";

/**
 * The operator's offer form is the Mint's own; AI Credit only opens it on the governed amount.
 * These tests hold that contract: the suggestion reaches the form, while missing or rejected
 * governance cannot reach the Mint submission callback.
 */

interface QueryResult {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}

const mockUseQuery = vi.fn<() => QueryResult>();
/** Governed code's recalculation per proposed amount; absent means it has not arrived. */
const previews = new Map<string, unknown>();
let reportNet: ((net: string | null) => void) | undefined;
const mintSubmit = vi.fn<(result: OfferFormResult) => void>();
/** The form's submit handler, so a submission can be driven without a real form. */
let submitForm:
  | ((values: { days: number; discountRate: Big; net: { value: Big; currency: string }; gross: { value: Big; currency: string } }) => void)
  | undefined;
/** Only the prop under test is captured, so the assertion needs no cross-module types. */
const suggestedNets: (string | undefined)[] = [];
const confirmDisabledValues: (boolean | undefined)[] = [];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: { queryKey: readonly unknown[]; enabled?: boolean }) => {
      if (options.queryKey[1] !== "requote-preview") return mockUseQuery();
      const amount = String(options.queryKey[4]);
      const data = options.enabled === false ? undefined : previews.get(amount);
      return { data, isError: false, isPlaceholderData: false };
    },
  };
});

vi.mock("@/components/Drawers", () => ({
  BaseDrawer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/GrossToNetDiscountForm/GrossToNetDiscountForm", () => ({
  GrossToNetDiscountForm: (props: {
    suggestedNet?: string;
    confirmDisabled?: boolean;
    onNetChange?: (net: string | null) => void;
    onSubmit: (values: {
      days: number;
      discountRate: Big;
      net: { value: Big; currency: string };
      gross: { value: Big; currency: string };
    }) => void;
  }) => {
    suggestedNets.push(props.suggestedNet);
    confirmDisabledValues.push(props.confirmDisabled);
    submitForm = props.onSubmit;
    reportNet = props.onNetChange;
    return (
      <form data-testid="discount-form">
        <input defaultValue={props.suggestedNet} id="netInput" />
      </form>
    );
  },
}));

const { OfferFormDrawer } = await import("./OfferFormDrawer");

const quote = {
  id: "00014834-ac6f-0773-60a3-7c29a1130250",
  status: "Pending",
  bill: { id: "synthetic-bill-a", sum: 8_000_000, maturity_date: "2027-02-06" },
} as unknown as InfoReply;

const decisionCase = {
  mintQuoteId: quote.id,
  snapshot: { caseId: "case-a", bill: { billId: "synthetic-bill-a" } },
  policyPack: {
    policyPackVersion: "synthetic-guatemala-coffee-v7",
    calculationVersion: "deterministic-credit-core-v7",
    maximumEffectiveAnnualBps: 1_500,
    maximumFeeRatioBps: 3_000,
  },
  result: {
    assessmentStatus: "ready_for_decision",
    recommendation: "offer_available",
    terms: {
      billSumSat: "8000000",
      discountedSat: "7734000",
      operatingCostSat: "50000",
      effectiveFeeSat: "266000",
      offerExpiresOn: "2026-08-12",
      tenorDays: 180,
      annualDiscountBps: 540,
      effectiveAnnualBps: 688,
      feeRatioBps: 333,
    },
  },
  resultDigest: `sha256:${"a".repeat(64)}`,
} as unknown as DecisionCase;

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-11T09:00:00.000Z"));
});

afterEach(() => {
  root?.unmount();
  container?.remove();
  vi.useRealTimers();
});

const render = (element: ReactElement) => {
  act(() => {
    root.render(
      <IntlProvider locale="en" messages={{}}>
        {element}
      </IntlProvider>
    );
  });
};

const renderDrawer = () => {
  render(
    <OfferFormDrawer
      title="Offer quote"
      description="Make an offer to the current holder of this bill"
      value={quote}
      open={true}
      onOpenChange={() => undefined}
      onSubmit={mintSubmit}
    >
      <button type="button">Offer</button>
    </OfferFormDrawer>
  );
};

const enterWrittenBasis = (basis = "Reviewed the governed terms and supporting evidence.") => {
  const textarea = container.querySelector<HTMLTextAreaElement>("#offer-written-basis");
  if (textarea === null) throw new Error("Decision basis was not rendered");
  // Bound immediately below; extracting the native setter is the only way React sees a controlled-input change in this dependency-free test.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (nativeSetter === undefined) throw new Error("Textarea value setter is unavailable");
  const setValue = nativeSetter.bind(textarea);
  act(() => {
    setValue(basis);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("OfferFormDrawer", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
    suggestedNets.length = 0;
    confirmDisabledValues.length = 0;
    submitForm = undefined;
    mintSubmit.mockReset();
  });

  it("opens the form on the governed amount, so confirming approves it", () => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets[suggestedNets.length - 1]).toBe("7734000");
    // And the operator can see what they are approving, against the guardrails it was measured on.
    expect(container.textContent).toContain("Suggested amount: 7,734,000 sat");
    expect(container.textContent).toContain("Minting fee 266,000 sat over 180 days");
    expect(container.textContent).toContain("6.88% annualized fee rate (ceiling 15.00%)");
    expect(container.textContent).toContain("3.33% of the bill amount (ceiling 30.00%)");
    expect(container.textContent).toContain("Suggested: 7,734,000 sat · maximum: 7,950,000 sat · expires: 2026-08-12");
  });

  it("blocks the form when no assessment exists for the bill", () => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets).toHaveLength(0);
    expect(container.textContent).not.toContain("Governed offer");
    expect(container.textContent).toContain("No current offer is available");
  });

  it("suggests nothing when the assessment produced no offer", () => {
    const noFit = { ...decisionCase, result: { ...decisionCase.result, recommendation: "no_current_product_fit", terms: null } };
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [noFit] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets).toHaveLength(0);
    expect(container.textContent).not.toContain("Governed offer");
  });
});

/**
 * The form prepares the exact governed command beside the Mint form values. It does not record it:
 * that happens only after the operator confirms in the second drawer.
 */
describe("OfferFormDrawer prepares the operator's decision", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
    suggestedNets.length = 0;
    confirmDisabledValues.length = 0;
    previews.clear();
    submitForm = undefined;
    mintSubmit.mockReset();
  });

  const accepted = (net: string) => ({
    schemaVersion: "operator-requote-preview-v1",
    decisionResultDigest: decisionCase.resultDigest,
    outcome: { ok: true, terms: { ...decisionCase.result.terms, discountedSat: net } },
  });
  const refused = {
    schemaVersion: "operator-requote-preview-v1",
    decisionResultDigest: decisionCase.resultDigest,
    outcome: { ok: false, reasonCode: "adjustment_above_effective_annual_ceiling", observed: {}, policy: {} },
  };

  const submitWith = (net: string, basis = "Reviewed the governed terms and supporting evidence.") => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    enterWrittenBasis(basis);
    // The form reports the amount it would submit; the preview is requested after a short pause.
    act(() => {
      reportNet?.(net);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      submitForm?.({
        days: 180,
        discountRate: new Big("6.5"),
        net: { value: new Big(net), currency: "sat" },
        gross: { value: new Big("8000000"), currency: "sat" },
      });
    });
  };

  it("prepares a confirmation when the operator offers the governed amount", () => {
    submitWith("7734000");

    expect(mintSubmit).toHaveBeenCalledOnce();
    expect(mintSubmit.mock.calls[0]?.[0]).toMatchObject({
      governance: {
        billId: "synthetic-bill-a",
        caseId: "case-a",
        decisionResultDigest: `sha256:${"a".repeat(64)}`,
        action: "confirm_proposed_quote",
        reasonCode: "operator_confirmed_governed_terms",
        writtenBasis: "Reviewed the governed terms and supporting evidence.",
      },
    });
    expect(mintSubmit.mock.calls[0]?.[0].governance.discountedSat).toBeUndefined();
    expect(mintSubmit.mock.calls[0]?.[0].governedOfferExpiresAt?.toISOString()).toBe("2026-08-12T23:59:59.999Z");
    expect(mintSubmit.mock.calls[0]?.[0].ttl.ttl.toISOString()).toBe("2026-08-12T23:59:59.999Z");
  });

  it("prepares an adjustment, and names the amount, once governed code accepted it", () => {
    previews.set("7800000", accepted("7800000"));
    submitWith("7800000");

    expect(mintSubmit.mock.calls[0]?.[0]).toMatchObject({
      governance: {
        action: "propose_adjustment_and_requote",
        discountedSat: "7800000",
        reasonCode: "operator_adjusted_price_within_bounds",
      },
    });
  });

  it("submits no adjustment the policy refused, and keeps confirmation disabled", () => {
    previews.set("7000000", refused);
    submitWith("7000000");

    expect(mintSubmit).not.toHaveBeenCalled();
    expect(confirmDisabledValues[confirmDisabledValues.length - 1]).toBe(true);
    expect(container.textContent).toContain("above the policy ceiling");
  });

  it("submits no adjustment before governed code has recalculated that exact amount", () => {
    previews.set("7800000", accepted("7800000"));
    submitWith("7790000");

    expect(mintSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Checking 7,790,000 sat against the policy");
  });

  it("submits nothing when the bill has no assessment", () => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [] }, isLoading: false, error: null });
    renderDrawer();
    act(() => {
      submitForm?.({
        days: 180,
        discountRate: new Big("6.5"),
        net: { value: new Big("7734000"), currency: "sat" },
        gross: { value: new Big("8000000"), currency: "sat" },
      });
    });

    expect(mintSubmit).not.toHaveBeenCalled();
  });

  it("validates a direct net edit immediately", () => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    act(() => {
      reportNet?.("7975001");
    });

    expect(container.textContent).toContain("above the maximum that covers reimbursement");
  });

  it("requires the operator's own written basis", () => {
    submitWith("7734000", "too short");

    expect(mintSubmit).not.toHaveBeenCalled();
    expect(container.querySelector("#offer-written-basis")).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps confirmation disabled until the written basis is complete", () => {
    mockUseQuery.mockReturnValue({ data: { issues: [], cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();

    expect(confirmDisabledValues[confirmDisabledValues.length - 1]).toBe(true);
    expect(container.textContent).toContain("(0/20)");

    enterWrittenBasis("Reviewed evidence supports this offer.");

    expect(confirmDisabledValues[confirmDisabledValues.length - 1]).toBe(false);
    expect(container.textContent).toContain("(20/20)");
  });
});
