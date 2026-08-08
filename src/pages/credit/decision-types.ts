/**
 * Shape of `/api/ai-credit/workbench-decisions` (synthetic decision snapshots) as far as the
 * quotes credit view reads it, plus the small display helpers shared by the colocated panels.
 * Money is named as the mint's quote API names it: the mint offers `discounted` against the
 * bill's `sum`, and the difference is its fee. Nothing here is an advance or a loan.
 */

export type AxisStatus = "pass" | "caution" | "blocked" | "fail" | "not_assessed";
export type AssessmentStatus = "ready_for_decision" | "blocked_pending_verification";
export type Recommendation = "offer_available" | "no_current_product_fit";

export type TraceValues = Record<string, string | number | boolean>;

export interface DecisionBill {
  billId: string;
  billStateDigest: string;
  acceptanceState: string;
  holderRef: string;
  acceptorRef: string;
  faceValueSat: string;
  acceptedDate: string;
  maturityDate: string;
  alreadyFinanced: boolean;
}

export interface DecisionInvoice {
  reference: string;
  invoiceNumber: string;
  goodsDescription: string;
  sellerRef: string;
  buyerRef: string;
  issueDate: string;
  totalSat: string;
  plausibility: string;
  billAndClaimsConsistency: string;
  evidenceState: string;
  methodologyVersion: string;
  assessedBy: string;
  validThrough: string;
}

export interface ConfirmedClaims {
  useOfFunds: string;
  acceptorRef: string;
  repaymentSource: string;
  wholeFaceRecourseAcknowledged: boolean;
  evidenceState: string;
}

export interface DecisionTerms {
  /** What the acceptor owes at maturity — `BillInfo.sum` in the quote API. */
  billSumSat: string;
  /** What the mint may offer for the bill — `discounted` in the quote API, issued as crsat. */
  discountedSat: string;
  appliedDiscountSat: string;
  operatingCostSat: string;
  /** `bill.sum - discounted`: the mint's whole fee. */
  effectiveFeeSat: string;
  /** What the holder carries if the acceptor dishonours, by having endorsed the bill. */
  endorsementExposureSat: string;
  maturityDate: string;
  offerExpiresOn: string;
  tenorDays: number;
  annualDiscountBps: number;
  effectiveAnnualBps: number;
  feeRatioBps: number;
}

/** Documents the applicant submitted with the application. Provenance for a reviewer, not input. */
export interface SubmittedEvidence {
  reference: string;
  label: string;
  contentDigest: string;
  origin: "bill_attachment" | "applicant_upload";
}

export interface VerificationRequest {
  code: string;
  axis: string;
  requiredItem: string;
}

export interface DecisionCase {
  snapshot: {
    caseId: string;
    applicantRef: string;
    asOfDate: string;
    product: string;
    country: string;
    isSynthetic: boolean;
    confirmedClaims: ConfirmedClaims;
    contradictions: { code: string; state: string; evidenceState: string }[];
    bill: DecisionBill | null;
    invoice: DecisionInvoice | null;
    acceptor: {
      probabilityOfDefaultBps: number | null;
      lossGivenDefaultBps: number | null;
      evidenceState: string;
      validThrough: string;
    };
    duplicateCheck: { result: string; evidenceState: string };
    mintCapacity: { existingExposureSat: string; exposureLimitSat: string; evidenceState: string };
  };
  policyPack: {
    policyPackVersion: string;
    calculationVersion: string;
    /** The holder guardrails, so a rate can be read against the limit it was measured against. */
    maximumEffectiveAnnualBps: number;
    maximumFeeRatioBps: number;
  };
  result: {
    assessmentStatus: AssessmentStatus;
    recommendation: Recommendation | null;
    axes: { axis: string; status: AxisStatus; reasonCodes: string[] }[];
    terms: DecisionTerms | null;
    verificationRequests: VerificationRequest[];
    reasonCodes: string[];
    assessmentTrace: { ruleId: string; subject: string; outcome: string; reasonCode: string; observed: TraceValues; policy: TraceValues }[];
    calculationTrace: { step: string; formula: string; inputs: TraceValues; result: string }[];
  };
  resultDigest: string;
  submittedEvidence?: SubmittedEvidence[];
}

/** Domain codes are rendered as humanized English, matching the rest of this synthetic view. */
export const words = (value: string): string => value.replace(/_/g, " ").replace(/^./, (first: string) => first.toUpperCase());

export const axisLabels: Record<string, string> = {
  instrument_eligibility: "Instrument eligibility",
  acceptor_repayment_risk: "Acceptor repayment risk",
  transaction_integrity: "Transaction integrity",
  applicant_recourse_risk: "Holder endorsement risk",
  evidence_sufficiency: "Evidence sufficiency",
  mint_exposure_capacity: "Mint exposure capacity",
};

export const axisBadgeVariant = (status: AxisStatus): "success" | "destructive" | "pending" | "outline" | "secondary" => {
  if (status === "pass") return "success";
  if (status === "fail") return "destructive";
  if (status === "blocked") return "pending";
  if (status === "caution") return "outline";
  return "secondary";
};

/** Digests are long and never read in full here; keep the head and expose the rest via `title`. */
export const shortDigest = (digest: string): string => `${digest.slice(0, 22)}…`;

export const percentFromBps = (bps: number): string => `${(bps / 100).toFixed(2)}%`;

export const traceLine = (values: TraceValues): string =>
  Object.entries(values)
    .map(([key, value]) => `${words(key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())}: ${String(value)}`)
    .join("  ·  ");
