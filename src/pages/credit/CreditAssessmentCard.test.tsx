import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionCase } from "./decision-types";

interface QueryResult {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}

const mockUseQuery = vi.fn<() => QueryResult>();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return { ...actual, useQuery: () => mockUseQuery() };
});

const { CreditAssessmentCard } = await import("./CreditAssessmentCard");
const { QuoteCreditAssessment } = await import("./QuoteCreditAssessment");
const { CreditAssessmentBadge } = await import("./CreditAssessmentBadge");

const passingAxes: DecisionCase["result"]["axes"] = [
  { axis: "instrument_eligibility", status: "pass", reasonCodes: ["accepted_bill_eligible"] },
  { axis: "acceptor_repayment_risk", status: "pass", reasonCodes: [] },
  { axis: "transaction_integrity", status: "pass", reasonCodes: [] },
  { axis: "applicant_recourse_risk", status: "pass", reasonCodes: [] },
  { axis: "evidence_sufficiency", status: "pass", reasonCodes: [] },
  { axis: "mint_exposure_capacity", status: "pass", reasonCodes: [] },
];

const caseFixture = (overrides: {
  caseId: string;
  assessmentStatus: DecisionCase["result"]["assessmentStatus"];
  recommendation: DecisionCase["result"]["recommendation"];
  terms: DecisionCase["result"]["terms"];
  verificationRequests?: DecisionCase["result"]["verificationRequests"];
  axes?: DecisionCase["result"]["axes"];
  reasonCodes?: string[];
  assessmentTrace?: DecisionCase["result"]["assessmentTrace"];
  calculationTrace?: DecisionCase["result"]["calculationTrace"];
}): DecisionCase => ({
  policyFileName: "synthetic-guatemala-v7.json",
  snapshot: {
    snapshotDigest: "sha256:snapshot",
    caseId: overrides.caseId,
    applicantRef: "synthetic-applicant-a",
    mintId: "synthetic-mint-guatemala",
    asOfDate: "2026-08-10",
    product: "seasonal_coffee_accepted_ebill_discount",
    country: "GT",
    industry: "coffee_production",
    isSynthetic: true,
    confirmedClaims: {
      useOfFunds: "Fertilizante y mano de obra",
      acceptorRef: "synthetic-cooperative-a",
      repaymentSource: "Pago de la cooperativa",
      wholeFaceRecourseAcknowledged: true,
      evidenceState: "applicant_confirmed",
    },
    contradictions: [],
    bill: {
      billId: "synthetic-bill-a",
      billStateDigest: "sha256:aaaa",
      acceptanceState: "accepted",
      holderRef: "synthetic-holder-a",
      acceptorRef: "synthetic-cooperative-a",
      faceValueSat: "8000000",
      acceptedDate: "2026-08-10",
      maturityDate: "2027-02-06",
      alreadyFinanced: false,
    },
    invoice: null,
    acceptor: {
      probabilityOfDefaultBps: 600,
      lossGivenDefaultBps: 4000,
      evidenceState: "independently_verified",
      validThrough: "2026-11-08",
    },
    duplicateCheck: { result: "clear", evidenceState: "independently_verified", validThrough: "2026-11-09" },
    mintCapacity: {
      existingExposureSat: "8000000",
      exposureLimitSat: "40000000",
      evidenceState: "independently_verified",
      validThrough: "2026-11-10",
    },
  },
  policyPack: {
    policyPackVersion: "synthetic-guatemala-coffee-v7",
    policyPackDigest: "sha256:policy-pack",
    calculationVersion: "deterministic-credit-core-v7",
    product: "seasonal_coffee_accepted_ebill_discount",
    country: "GT",
    industry: "coffee_production",
    maximumEffectiveAnnualBps: 1_500,
    maximumFeeRatioBps: 3_000,
  },
  result: {
    assessmentStatus: overrides.assessmentStatus,
    recommendation: overrides.recommendation,
    axes: overrides.axes ?? passingAxes,
    terms: overrides.terms,
    verificationRequests: overrides.verificationRequests ?? [],
    reasonCodes: overrides.reasonCodes ?? ["governed_terms_available"],
    assessmentTrace: overrides.assessmentTrace ?? [
      {
        ruleId: "acceptor_loss_parameters_verified",
        subject: "acceptor_repayment_risk",
        outcome: "pass",
        reasonCode: "acceptor_loss_parameters_verified",
        observed: { probabilityOfDefaultBps: 600, lossGivenDefaultBps: 4000, evidenceState: "independently_verified" },
        policy: { exposureAtDefaultSat: "8000000" },
      },
      {
        ruleId: "mint_capacity_available",
        subject: "mint_exposure_capacity",
        outcome: "pass",
        reasonCode: "mint_capacity_available",
        observed: {
          existingExposureSat: "8000000",
          proposedExposureSat: "8000000",
          resultingExposureSat: "16000000",
          evidenceState: "independently_verified",
        },
        policy: { exposureLimitSat: "40000000" },
      },
    ],
    calculationTrace: overrides.calculationTrace ?? [],
  },
  resultDigest: "sha256:result",
});

const offerCase = caseFixture({
  caseId: "synthetic-case-a",
  assessmentStatus: "ready_for_decision",
  recommendation: "offer_available",
  terms: {
    billSumSat: "8000000",
    discountedSat: "7734000",
    appliedDiscountSat: "216000",
    operatingCostSat: "50000",
    effectiveFeeSat: "266000",
    endorsementExposureSat: "8000000",
    maturityDate: "2027-02-06",
    offerExpiresOn: "2026-08-12",
    tenorDays: 180,
    annualDiscountBps: 540,
    effectiveAnnualBps: 688,
    feeRatioBps: 333,
  },
  calculationTrace: [
    {
      step: "annual_discount_bps",
      formula: "cost + loss + uncertainty + return - subsidy",
      inputs: { costOfFundsBps: 100, expectedLossBps: 240, uncertaintyMarginBps: 100, returnObjectiveBps: 100, subsidyBps: 0 },
      result: "540",
    },
    {
      step: "applied_discount_sat",
      formula: "bill * rate * tenor / day count",
      inputs: { dayCountDenominator: 360 },
      result: "216000",
    },
  ],
});

const withDocuments: DecisionCase = {
  ...offerCase,
  submittedEvidence: [
    {
      reference: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
      label: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
      contentDigest: "sha256-base58:2NEpo7TZRhna7vSvL9CPpKrxjuUnLmVzHnjPUuFEqZaP",
      origin: "bill_attachment",
    },
    {
      reference: "b1946ac92492d2347c6235b4d2611184",
      label: "delivery-photo.jpg",
      contentDigest: "sha256:b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184",
      origin: "applicant_upload",
    },
  ],
};

const blockedCase = caseFixture({
  caseId: "synthetic-case-c",
  assessmentStatus: "blocked_pending_verification",
  recommendation: null,
  terms: null,
  verificationRequests: [{ code: "acceptor", axis: "acceptor_repayment_risk", requiredItem: "Current governed acceptor PD and LGD" }],
  axes: passingAxes.map((finding) => ({ ...finding, status: "blocked" as const })),
  assessmentTrace: [],
});

const noFitCase = caseFixture({
  caseId: "synthetic-case-d",
  assessmentStatus: "ready_for_decision",
  recommendation: "no_current_product_fit",
  terms: null,
  reasonCodes: ["cost_above_policy_ceiling"],
  axes: passingAxes.map((finding, index) => (index === 0 ? { ...finding, status: "fail" as const } : finding)),
  assessmentTrace: [
    {
      ruleId: "maximum_effective_annual_cost",
      subject: "product_fit",
      outcome: "fail",
      reasonCode: "cost_above_policy_ceiling",
      observed: { effectiveAnnualBps: "6042", effectiveFeeSat: "58000" },
      policy: { maximumEffectiveAnnualBps: 1500, costMarginBps: "-4542" },
    },
  ],
  calculationTrace: [
    {
      step: "effective_fee_sat",
      formula: "appliedDiscountSat + operatingCostSat",
      inputs: { appliedDiscountSat: "8000", operatingCostSat: "50000" },
      result: "58000",
    },
    {
      step: "discounted_sat",
      formula: "billSumSat - effectiveFeeSat",
      inputs: { billSumSat: "250000", effectiveFeeSat: "58000" },
      result: "192000",
    },
  ],
});

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

describe("CreditAssessmentCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
  });

  it("states the three figures the quote's offer action needs", () => {
    render(<CreditAssessmentCard decisionCase={offerCase} />);

    // The amount to offer and its ttl — never "advance".
    expect(container.textContent).toContain("Offer amount");
    expect(container.textContent).toContain("7,734,000 sat");
    expect(container.textContent).toContain("Valid until");
    expect(container.textContent).toContain("2026-08-12");
    expect(container.textContent).toContain("6.88%");
    expect(container.textContent).toContain("Repayment & recourse");
    expect(container.textContent).toContain("Acceptor pays at maturity");
    expect(container.textContent).toContain("Assessed 2026-08-10 · evidence valid through 2026-11-08");
    expect(container.textContent).not.toContain("tomorrow");
    // The real action rail is directly below, so the card no longer explains its own placement.
    expect(container.textContent).not.toContain("Offering and denying happen");
    expect(container.textContent).not.toContain("advance");
  });

  it("puts the whole fee calculation one disclosure away", () => {
    render(<CreditAssessmentCard decisionCase={offerCase} />);

    const feeDisclosure = Array.from(container.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("Fee calculation")
    );
    expect(feeDisclosure?.open).toBe(false);
    expect(feeDisclosure?.querySelector("summary")?.textContent).toContain("266,000 sat total");
    expect(feeDisclosure?.textContent).toContain(
      "1.00% funding + 2.40% expected loss + 1.00% uncertainty + 1.00% return − 0.00% subsidy = 5.40% annual discount"
    );
    expect(feeDisclosure?.textContent).toContain("8,000,000 sat × 5.40% × 180 / 360 = 216,000 sat");
    expect(feeDisclosure?.textContent).toContain("216,000 sat + 50,000 sat operating cost = 266,000 sat");
    expect(feeDisclosure?.textContent).toContain("8,000,000 sat − 266,000 sat = 7,734,000 sat");
    expect(feeDisclosure?.textContent).toContain("Repayment & recourse");
    expect(feeDisclosure?.textContent).not.toContain("Deterministic pricing trace");
  });

  it("does not invent a fee calculation when its governed trace is missing or inconsistent", () => {
    const inconsistent = offerCase.result.calculationTrace.map((step) =>
      step.step === "annual_discount_bps" ? { ...step, inputs: { ...step.inputs, expectedLossBps: 241 } } : step
    );
    for (const calculationTrace of [[], inconsistent]) {
      render(<CreditAssessmentCard decisionCase={{ ...offerCase, result: { ...offerCase.result, calculationTrace } }} />);
      expect(container.textContent).toContain("Calculation trace unavailable");
    }
  });

  it("keeps evidence and immutable policy provenance collapsed by default", () => {
    render(<CreditAssessmentCard decisionCase={offerCase} />);

    const disclosures = Array.from(container.querySelectorAll("details")).filter((details) =>
      ["Evidence & decision rationale", "Policy & audit trail"].some((label) =>
        details.querySelector("summary")?.textContent?.includes(label)
      )
    );
    expect(disclosures).toHaveLength(2);
    expect(disclosures.every((details) => !details.open)).toBe(true);
    expect(disclosures[0]?.textContent).not.toContain("Repayment & recourse");
    expect(container.textContent).toContain("Policy versionsynthetic-guatemala-coffee-v7");
    expect(container.textContent).toContain("Policy filesynthetic-guatemala-v7.json");
    expect(container.textContent).toContain("Calculation versiondeterministic-credit-core-v7");
    expect(container.textContent).toContain("Maximum effective annual cost15.00%");
    expect(container.textContent).toContain("Maximum fee ratio30.00%");
    expect(container.querySelector('[title="sha256:policy-pack"]')).not.toBeNull();
    expect(container.querySelector('[title="sha256:result"]')).not.toBeNull();
    expect(container.textContent).toContain("Mintsynthetic-mint-guatemala");
    expect(container.querySelector('[title="sha256:snapshot"]')).not.toBeNull();
  });

  it("shows curated risk percentages and resulting exposure while retaining honest raw audit data", () => {
    render(<CreditAssessmentCard decisionCase={offerCase} />);

    expect(container.textContent).toContain("Acceptor PD 6.00% · LGD 40.00%");
    expect(container.textContent).toContain("Resulting Mint exposure 16,000,000 sat of 40,000,000 sat, including 8,000,000 sat proposed");
    const technical = Array.from(container.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("Technical rule trace")
    );
    expect(technical?.textContent).toContain("independently_verified");
  });

  it("does not repeat what the quote detail above it already states", () => {
    render(<CreditAssessmentCard decisionCase={offerCase} />);

    // Sum, maturity and the parties are on the quote card, and the bill itself is a real file the
    // Mint serves — never a rendering of one drawn from snapshot fields.
    expect(container.textContent).not.toContain("Against this bill of exchange");
    expect(container.textContent).not.toContain("Bill of exchange");
    expect(container.textContent).not.toContain("Acceptor owes");
    expect(container.textContent).not.toContain("2027-02-06");
    expect(container.textContent).not.toContain("synthetic-holder-a");
    expect(container.textContent).not.toContain("Already financed");
    expect(container.textContent).not.toContain("Bill state digest");
    // The mint's own unit is not news to an operator working at the mint.
    expect(container.textContent).not.toContain("crsat");
  });

  it("does not put the bill's acceptor in the applicant's mouth", () => {
    // `confirmedClaims.acceptorRef` is copied from the authoritative bill when the snapshot is
    // assembled — the applicant never wrote it — so it must not appear under "what the applicant
    // said". A sentinel distinct from the bill's own acceptor keeps this from passing by accident.
    const claimed: DecisionCase = {
      ...offerCase,
      snapshot: {
        ...offerCase.snapshot,
        confirmedClaims: { ...offerCase.snapshot.confirmedClaims, acceptorRef: "synthetic-acceptor-the-applicant-never-named" },
      },
    };
    render(<CreditAssessmentCard decisionCase={claimed} />);

    const said = Array.from(container.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("What the applicant said")
    );
    // The disclosure is there and quoting the applicant's own words, so the absence below is the
    // acceptor being left out rather than the whole panel being missing.
    expect(said?.textContent).toContain("Fertilizante y mano de obra");
    expect(said?.textContent).toContain("Pago de la cooperativa");
    expect(said?.textContent).toContain("Acknowledged liability for the whole bill sum");
    expect(said?.textContent).not.toContain("synthetic-acceptor-the-applicant-never-named");
    // And no other part of the card restates it as a claim either.
    expect(container.textContent).not.toContain("synthetic-acceptor-the-applicant-never-named");
  });

  it("shows applicant document lineage without claiming unavailable files", () => {
    render(<CreditAssessmentCard decisionCase={withDocuments} />);

    expect(container.textContent).toContain("Evidence packet");
    // The uuid core appends to a stored file name is not shown to the operator.
    expect(container.textContent).toContain("goods-invoice.pdf");
    expect(container.textContent).not.toContain("0f4d1c22");
    expect(container.textContent).toContain("Bill attachment lineage");
    expect(container.textContent).toContain("No current server receipt");
    expect(container.textContent).toContain("delivery-photo.jpg");
    expect(container.textContent).toContain("Applicant upload");
  });

  it("tells the operator not to offer while verification is outstanding", () => {
    render(<CreditAssessmentCard decisionCase={blockedCase} />);

    expect(container.textContent).toContain("Verification required");
    expect(container.textContent).toContain("No quote can be issued until the requested evidence is verified.");
    expect(container.textContent).toContain("Current governed acceptor PD and LGD");
    expect(container.textContent).not.toContain("Offer amount");
  });

  it("shows no terms when policy finds no current product fit", () => {
    render(<CreditAssessmentCard decisionCase={noFitCase} />);

    expect(container.textContent).toContain("No current product fit");
    expect(container.textContent).toContain("No offer is available under the active policy.");
    expect(container.textContent).toContain("Effective annual cost 60.42% − 15.00% maximum = 45.42% over policy.");
    expect(container.textContent).toContain(
      "50,000 sat fixed operating cost on a 250,000 sat bill contributes to the 58,000 sat total fee."
    );
    expect(container.textContent).not.toContain("Offer amount");
  });

  it("fails closed when a future recommendation is unreadable", () => {
    const unreadable = { ...offerCase, result: { ...offerCase.result, recommendation: "future_outcome" as never } };
    render(<CreditAssessmentCard decisionCase={unreadable} />);

    expect(container.textContent).toContain("Assessment unavailable");
    expect(container.textContent).not.toContain("Offer amount");
  });
});

describe("QuoteCreditAssessment", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
  });

  it("renders the assessment for the quote's own bill", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [offerCase] }, isLoading: false, error: null });
    render(<QuoteCreditAssessment billId="synthetic-bill-a" />);

    expect(container.textContent).toContain("Governed credit decision");
    expect(container.textContent).toContain("7,734,000 sat");
  });

  it("says so quietly when the adapter holds no decision for the bill", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [offerCase] }, isLoading: false, error: null });
    render(<QuoteCreditAssessment billId="bitcrt-some-real-bill" />);

    expect(container.textContent).toBe("No AI Credit assessment for this bill.");
  });

  it("stays out of the way when the adapter is unreachable", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error("offline") });
    render(<QuoteCreditAssessment billId="synthetic-bill-a" />);

    expect(container.textContent).toContain("Governed credit assessment unavailable");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("fails closed instead of showing stale terms when a refresh fails", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [offerCase] }, isLoading: false, error: new Error("offline") });
    render(<QuoteCreditAssessment billId="synthetic-bill-a" />);

    expect(container.textContent).toContain("Governed credit assessment unavailable");
    expect(container.textContent).not.toContain("7,734,000 sat");
  });

  it("names the governed assessment while it is loading", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<QuoteCreditAssessment billId="synthetic-bill-a" />);

    expect(container.textContent).toContain("Loading governed credit assessment");
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe("CreditAssessmentBadge", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuery.mockReset();
  });

  it("marks a quote list row with the outcome", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [offerCase] }, isLoading: false, error: null });
    render(<CreditAssessmentBadge billId="synthetic-bill-a" />);

    expect(container.textContent).toBe("AI Credit: offer available");
  });

  it("shows verification rather than an outcome while blocked", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [blockedCase] }, isLoading: false, error: null });
    render(<CreditAssessmentBadge billId="synthetic-bill-a" />);

    expect(container.textContent).toBe("AI Credit: verify");
  });

  it("leaves unassessed quotes exactly as they were", () => {
    mockUseQuery.mockReturnValue({ data: { cases: [offerCase] }, isLoading: false, error: null });
    render(<CreditAssessmentBadge billId="bitcrt-a-real-bill" />);

    expect(container.textContent).toBe("");
  });

  it("never lets an unreadable payload look like a refusal", () => {
    const strange = { ...offerCase, result: { ...offerCase.result, recommendation: "something_new" as never } };
    mockUseQuery.mockReturnValue({ data: { cases: [strange] }, isLoading: false, error: null });
    render(<CreditAssessmentBadge billId="synthetic-bill-a" />);

    expect(container.textContent).toBe("AI Credit: unreadable");
  });
});
