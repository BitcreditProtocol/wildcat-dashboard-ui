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
}): DecisionCase => ({
  snapshot: {
    caseId: overrides.caseId,
    applicantRef: "synthetic-applicant-a",
    asOfDate: "2026-08-10",
    product: "seasonal_coffee_accepted_ebill_discount",
    country: "GT",
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
    duplicateCheck: { result: "clear", evidenceState: "independently_verified" },
    mintCapacity: { existingExposureSat: "8000000", exposureLimitSat: "40000000", evidenceState: "independently_verified" },
  },
  policyPack: {
    policyPackVersion: "synthetic-guatemala-coffee-v7",
    calculationVersion: "deterministic-credit-core-v7",
    maximumEffectiveAnnualBps: 1_500,
    maximumFeeRatioBps: 3_000,
  },
  result: {
    assessmentStatus: overrides.assessmentStatus,
    recommendation: overrides.recommendation,
    axes: overrides.axes ?? passingAxes,
    terms: overrides.terms,
    verificationRequests: overrides.verificationRequests ?? [],
    reasonCodes: ["governed_terms_available"],
    assessmentTrace: [],
    calculationTrace: [],
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
});

const withDocuments: DecisionCase = {
  ...offerCase,
  submittedEvidence: [
    {
      reference: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
      label: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
      contentDigest: `sha256:${"a".repeat(64)}`,
      origin: "client_asserted_bill_attachment",
    },
    {
      reference: "b1946ac92492d2347c6235b4d2611184",
      label: "delivery-photo.jpg",
      contentDigest: "sha256:b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184",
      origin: "applicant_upload",
    },
  ],
  evidencePackets: [
    {
      evidence: {
        reference: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
        label: "goods-invoice_0f4d1c22-8b3a-4a1e-9c7e-2f5b6d8a1234.pdf",
        contentDigest: `sha256:${"a".repeat(64)}`,
        origin: "client_asserted_bill_attachment",
      },
      status: "quarantined",
      byteLength: 12_345,
      extraction: {
        schemaVersion: "invoice-extraction-proposal-v1",
        derivativeDigest: `sha256:${"d".repeat(64)}`,
        parserVersion: "poppler-text-v1+22.12.0",
        promptVersion: "invoice-extraction-v1",
        modelId: "gpt-5.5",
        extractedAt: "2026-08-11T10:00:00.000Z",
        proposal: {
          invoiceNumber: { value: "INV-42", citation: { page: 1, exactSnippet: "Invoice number INV-42" } },
          seller: null,
          buyer: null,
          issueDate: null,
          goodsDescription: null,
          transactionReference: null,
          currency: null,
          totalSat: null,
          lineItems: [],
        },
      },
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
    expect(container.textContent).toContain("Offer this amount");
    expect(container.textContent).toContain("7,734,000 sat");
    expect(container.textContent).toContain("Offer expires");
    expect(container.textContent).toContain("2026-08-12");
    // A rate is only readable against the limit it was measured against.
    expect(container.textContent).toContain("6.88%");
    expect(container.textContent).toContain("ceiling 15.00%");
    expect(container.textContent).toContain("Fee 266,000 sat over 180 days — 3.33% of the bill sum, against a 30.00% ceiling.");
    // The acceptor owes the sum; the holder is only liable on dishonour.
    expect(container.textContent).toContain("The acceptor is the principal obligor");
    // The real rail is the mint's own.
    expect(container.textContent).toContain("Offering and denying happen in the quote actions below");
    expect(container.textContent).not.toContain("advance");
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

  it("shows a provenance packet and never opens the raw document", () => {
    render(<CreditAssessmentCard decisionCase={withDocuments} />);

    expect(container.textContent).toContain("Evidence packet");
    expect(container.textContent).toContain("Synthetic/testnet only");
    expect(container.textContent).toContain("goods-invoice.pdf");
    expect(container.textContent).not.toContain("0f4d1c22");
    expect(container.textContent).toContain("Browser-asserted bill attachment");
    expect(container.textContent).toContain("did not establish a signed bill or revision binding");
    expect(container.textContent).toContain(`sha256:${"a".repeat(64)}`);
    expect(container.textContent).toContain("Quarantined · 12,345 bytes");
    expect(container.textContent).toContain("invoice-extraction-proposal-v1");
    expect(container.textContent).toContain("poppler-text-v1+22.12.0");
    expect(container.textContent).toContain("invoice-extraction-v1");
    expect(container.textContent).toContain("gpt-5.5");
    expect(container.textContent).toContain(`sha256:${"d".repeat(64)}`);
    expect(container.textContent).toContain("Page 1: “Invoice number INV-42”");
    expect(container.textContent).toContain("delivery-photo.jpg");
    expect(container.textContent).toContain("Applicant upload");
    expect(container.textContent).toContain("No current server receipt");
    expect(container.textContent).toContain("Submitted digest (no server receipt)");
    expect(container.textContent).toContain("absence is not an adverse finding");
    expect(container.querySelector("[data-testid='evidence-packet'] button")).toBeNull();
  });

  it("tells the operator not to offer while verification is outstanding", () => {
    render(<CreditAssessmentCard decisionCase={blockedCase} />);

    expect(container.textContent).toContain("Do not offer yet");
    expect(container.textContent).toContain("Current governed acceptor PD and LGD");
    expect(container.textContent).not.toContain("Offer this amount");
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

    expect(container.textContent).toContain("AI Credit assessment");
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

    expect(container.textContent).toBe("");
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
