import Big from "big.js";
import type { InfoReply } from "@/generated/client/types.gen";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionCase } from "@/pages/credit/decision-types";

/**
 * The operator's offer form is the Mint's own; AI Credit only opens it on the governed amount.
 * These tests hold that contract: the suggestion reaches the form, and a quote with no assessment
 * (or an assessment that produced no offer) leaves the form exactly as it was before.
 */

interface QueryResult {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}

const mockUseQuery = vi.fn<() => QueryResult>();
/** What the drawer asked the adapter to record, captured without cross-module types. */
const recordedDecisions: { billId: string; action: string; discountedSat?: string; reasonCode: string }[] = [];
/** The form's submit handler, so a submission can be driven without a real form. */
let submitForm:
  | ((values: { days: number; discountRate: Big; net: { value: Big; currency: string }; gross: { value: Big; currency: string } }) => void)
  | undefined;
/** Only the prop under test is captured, so the assertion needs no cross-module types. */
const suggestedNets: (string | undefined)[] = [];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return { ...actual, useQuery: () => mockUseQuery() };
});

vi.mock("@/components/Drawers", () => ({
  BaseDrawer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/pages/credit/record-operator-decision", () => ({
  recordOperatorDecision: (input: { billId: string; action: string; discountedSat?: string; reasonCode: string }) => {
    recordedDecisions.push(input);
    return Promise.resolve({ ok: true });
  },
}));

vi.mock("@/components/GrossToNetDiscountForm/GrossToNetDiscountForm", () => ({
  GrossToNetDiscountForm: (props: {
    suggestedNet?: string;
    onSubmit: (values: {
      days: number;
      discountRate: Big;
      net: { value: Big; currency: string };
      gross: { value: Big; currency: string };
    }) => void;
  }) => {
    suggestedNets.push(props.suggestedNet);
    submitForm = props.onSubmit;
    return <form data-testid="discount-form" />;
  },
}));

const { OfferFormDrawer } = await import("./OfferFormDrawer");

const quote = {
  id: "00014834-ac6f-0773-60a3-7c29a1130250",
  status: "Pending",
  bill: { id: "synthetic-bill-a", sum: 8_000_000, maturity_date: "2027-02-06" },
} as unknown as InfoReply;

const decisionCase = {
  snapshot: { bill: { billId: "synthetic-bill-a" } },
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
      effectiveFeeSat: "266000",
      tenorDays: 180,
      effectiveAnnualBps: 688,
      feeRatioBps: 333,
    },
  },
} as unknown as DecisionCase;

let container: HTMLElement;
let root: Root;

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
      onSubmit={() => undefined}
    >
      <button type="button">Offer</button>
    </OfferFormDrawer>
  );
};

describe("OfferFormDrawer", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
    suggestedNets.length = 0;
  });

  it("opens the form on the governed amount, so confirming approves it", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets[suggestedNets.length - 1]).toBe("7734000");
    // And the operator can see what they are approving, against the guardrails it was measured on.
    expect(container.textContent).toContain("Governed offer 7,734,000 sat");
    expect(container.textContent).toContain("6.88% effective annual (ceiling 15.00%)");
    expect(container.textContent).toContain("3.33% of the bill sum (ceiling 30.00%)");
    expect(container.textContent).toContain("Offering less than this raises both figures");
  });

  it("leaves the form untouched when no assessment exists for the bill", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets[suggestedNets.length - 1]).toBeUndefined();
    expect(container.textContent).not.toContain("Governed offer");
  });

  it("suggests nothing when the assessment produced no offer", () => {
    const noFit = { ...decisionCase, result: { ...decisionCase.result, recommendation: "no_current_product_fit", terms: null } };
    mockUseQuery.mockReturnValue({ data: { cases: [noFit] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets[suggestedNets.length - 1]).toBeUndefined();
    expect(container.textContent).not.toContain("Governed offer");
  });
});

/**
 * Offering from the dashboard also records the judgement behind it. The Mint's offer is the
 * operator's action and must not wait on the local adapter, so this is best-effort — but it must
 * carry the right action: confirming the computed amount, or adjusting it.
 */
describe("OfferFormDrawer records the operator's decision", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
    suggestedNets.length = 0;
    recordedDecisions.length = 0;
  });

  const submitWith = (net: string) => {
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    act(() => {
      submitForm?.({
        days: 180,
        discountRate: new Big("6.5"),
        net: { value: new Big(net), currency: "sat" },
        gross: { value: new Big("8000000"), currency: "sat" },
      });
    });
  };

  it("confirms when the operator offers the governed amount", () => {
    submitWith("7734000");

    expect(recordedDecisions).toHaveLength(1);
    expect(recordedDecisions[0]).toMatchObject({
      billId: "synthetic-bill-a",
      action: "confirm_proposed_quote",
      reasonCode: "operator_confirmed_governed_terms",
    });
    expect(recordedDecisions[0]?.discountedSat).toBeUndefined();
  });

  it("adjusts, and names the amount, when the operator edits it", () => {
    submitWith("7800000");

    expect(recordedDecisions[0]).toMatchObject({
      action: "propose_adjustment_and_requote",
      discountedSat: "7800000",
      reasonCode: "operator_adjusted_price_within_bounds",
    });
  });

  it("records nothing when the bill has no assessment", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [] }, isLoading: false, error: null });
    renderDrawer();
    act(() => {
      submitForm?.({
        days: 180,
        discountRate: new Big("6.5"),
        net: { value: new Big("7734000"), currency: "sat" },
        gross: { value: new Big("8000000"), currency: "sat" },
      });
    });

    expect(recordedDecisions).toHaveLength(0);
  });
});
