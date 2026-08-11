import Big from "big.js";
import type { InfoReply } from "@/generated/client/types.gen";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionCase } from "@/pages/credit/decision-types";

/**
 * The operator's offer form is the Mint's own; AI Credit only opens it on the governed amount.
 * These tests hold that contract: the suggestion reaches the form, a known-unassessed quote keeps
 * the Mint flow, and an unavailable or non-offer assessment fails closed.
 */

interface QueryResult {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}

const mockUseQuery = vi.fn<() => QueryResult>();
/** What the drawer asked the adapter to record, captured without cross-module types. */
const recordedDecisions: { billId: string; action: string; discountedSat?: string; reasonCode: string }[] = [];
/** What the stubbed adapter answers. Failure is the interesting case: the offer must not proceed. */
let recordResult: { ok: true } | { ok: false; error: string } = { ok: true };
/** Every Mint offer the drawer released, i.e. what would reach the quote's offer action. */
const submittedOffers: unknown[] = [];
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
    return Promise.resolve(recordResult);
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
      onSubmit={(data) => {
        submittedOffers.push(data);
      }}
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
 * Offering from the dashboard also records the judgement behind it, and where an AI Credit
 * assessment exists that record is a gate rather than a courtesy: the Mint offer waits for it,
 * a failure is visible and retryable, and one operator submission never records twice. A bill with
 * no assessment keeps the Mint's own behaviour exactly.
 */
describe("OfferFormDrawer records the operator's decision", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
    suggestedNets.length = 0;
    recordedDecisions.length = 0;
    submittedOffers.length = 0;
    recordResult = { ok: true };
  });

  const submit = async (net: string) => {
    await act(async () => {
      submitForm?.({
        days: 180,
        discountRate: new Big("6.5"),
        net: { value: new Big(net), currency: "sat" },
        gross: { value: new Big("8000000"), currency: "sat" },
      });
      // The drawer now awaits the recording before it releases the offer, so the submission is only
      // finished once those microtasks have run inside act.
      await Promise.resolve();
    });
  };

  const submitWith = async (net: string) => {
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    await submit(net);
  };

  it("confirms when the operator offers the governed amount", async () => {
    await submitWith("7734000");

    expect(recordedDecisions).toHaveLength(1);
    expect(recordedDecisions[0]).toMatchObject({
      billId: "synthetic-bill-a",
      action: "confirm_proposed_quote",
      reasonCode: "operator_confirmed_governed_terms",
    });
    expect(recordedDecisions[0]?.discountedSat).toBeUndefined();
    // Recorded first, then offered.
    expect(submittedOffers).toHaveLength(1);
  });

  it("adjusts, and names the amount, when the operator edits it", async () => {
    await submitWith("7800000");

    expect(recordedDecisions[0]).toMatchObject({
      action: "propose_adjustment_and_requote",
      discountedSat: "7800000",
      reasonCode: "operator_adjusted_price_within_bounds",
    });
    expect(submittedOffers).toHaveLength(1);
  });

  it("records nothing, and offers immediately, when the bill has no assessment", async () => {
    mockUseQuery.mockReturnValue({ data: { cases: [] }, isLoading: false, error: null });
    renderDrawer();
    await submit("7734000");

    expect(recordedDecisions).toHaveLength(0);
    expect(submittedOffers).toHaveLength(1);
  });

  it("fails closed while the assessment is unavailable", async () => {
    // React Query may retain the last offer while a refresh fails. Stale data is still unavailable
    // for an irreversible Mint action.
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: new Error("adapter unavailable") });
    renderDrawer();
    await submit("7734000");

    expect(recordedDecisions).toHaveLength(0);
    expect(submittedOffers).toHaveLength(0);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("assessment is unavailable");
  });

  it("fails closed when the governed assessment has no offer", async () => {
    mockUseQuery.mockReturnValue({
      data: { cases: [{ ...decisionCase, result: { ...decisionCase.result, recommendation: null, terms: null } }] },
      isLoading: false,
      error: null,
    });
    renderDrawer();
    await submit("7734000");

    expect(recordedDecisions).toHaveLength(0);
    expect(submittedOffers).toHaveLength(0);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("no offer available");
    expect(container.textContent).not.toContain("Submit again to retry");
  });

  it("holds the Mint offer back, visibly, when the decision cannot be recorded", async () => {
    recordResult = { ok: false, error: "The AI Credit adapter is not reachable" };
    await submitWith("7734000");

    expect(recordedDecisions).toHaveLength(1);
    // The whole point: an assessed case whose human decision was not recorded makes no offer.
    expect(submittedOffers).toHaveLength(0);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("The AI Credit adapter is not reachable");
    expect(container.textContent).toContain("Submit again to retry");
  });

  it("submits on retry after a failure, without recording the same judgement twice", async () => {
    recordResult = { ok: false, error: "Credit adapter responded 503" };
    await submitWith("7734000");
    expect(submittedOffers).toHaveLength(0);

    recordResult = { ok: true };
    await submit("7734000");

    expect(recordedDecisions).toHaveLength(2);
    expect(submittedOffers).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();

    // A further submission of the same judgement is not a second governed record.
    await submit("7734000");
    expect(recordedDecisions).toHaveLength(2);
    expect(submittedOffers).toHaveLength(2);
  });
});
