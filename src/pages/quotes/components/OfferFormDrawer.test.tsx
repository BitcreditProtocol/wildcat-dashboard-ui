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
const mintSubmit = vi.fn<(result: OfferFormResult) => void>();
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
      operatingCostSat: "25000",
      effectiveFeeSat: "266000",
      offerExpiresOn: "2026-08-12",
      tenorDays: 180,
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
    submitForm = undefined;
    mintSubmit.mockReset();
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
    expect(container.textContent).toContain("Governed amount: 7734000 sat. Absolute maximum: 7975000 sat");
  });

  it("blocks the form when no assessment exists for the bill", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [] }, isLoading: false, error: null });
    renderDrawer();

    expect(suggestedNets).toHaveLength(0);
    expect(container.textContent).not.toContain("Governed offer");
    expect(container.textContent).toContain("A governed offer is unavailable");
  });

  it("suggests nothing when the assessment produced no offer", () => {
    const noFit = { ...decisionCase, result: { ...decisionCase.result, recommendation: "no_current_product_fit", terms: null } };
    mockUseQuery.mockReturnValue({ data: { cases: [noFit] }, isLoading: false, error: null });
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
    submitForm = undefined;
    mintSubmit.mockReset();
  });

  const submitWith = (net: string, basis = "Reviewed the governed terms and supporting evidence.") => {
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    enterWrittenBasis(basis);
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
    expect(mintSubmit.mock.calls[0]?.[0].ttl.ttl.toISOString()).toBe("2026-08-11T10:00:00.000Z");
  });

  it("prepares an adjustment, and names the amount, when the operator edits it", () => {
    submitWith("7800000");

    expect(mintSubmit.mock.calls[0]?.[0]).toMatchObject({
      governance: {
        action: "propose_adjustment_and_requote",
        discountedSat: "7800000",
        reasonCode: "operator_adjusted_price_within_bounds",
      },
    });
  });

  it("leaves lower adjustment policy validation to the governed service", () => {
    submitWith("7000000");

    expect(mintSubmit.mock.calls[0]?.[0]).toMatchObject({
      governance: { action: "propose_adjustment_and_requote", discountedSat: "7000000" },
    });
  });

  it("submits nothing when the bill has no assessment", () => {
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

    expect(mintSubmit).not.toHaveBeenCalled();
  });

  it("validates a direct net edit immediately", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [decisionCase] }, isLoading: false, error: null });
    renderDrawer();
    const netInput = container.querySelector<HTMLInputElement>("#netInput");
    if (netInput === null) throw new Error("Net amount was not rendered");

    act(() => {
      netInput.value = "7975001";
      netInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(container.textContent).toContain("above the maximum that covers operating cost");
  });

  it("requires the operator's own written basis", () => {
    submitWith("7734000", "too short");

    expect(mintSubmit).not.toHaveBeenCalled();
    expect(container.querySelector("#offer-written-basis")).toHaveAttribute("aria-invalid", "true");
  });
});
