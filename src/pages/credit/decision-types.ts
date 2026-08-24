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
  alreadyFinanced: boolean | null;
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

export interface ApplicantConfirmation {
  schemaVersion: "applicant-confirmation-summary-v1";
  preparedInputId: string;
  useOfFunds: string;
  acceptor: string | null;
  repaymentSource: string;
  answersAffirmed: true;
  recourseAcknowledged: boolean;
}

export type ApplicantHumanReviewResolution = "decision_upheld" | "correction_or_reassessment_required";

export interface ApplicantHumanReviewRecord {
  request: {
    schemaVersion: "applicant-human-review-request-v1";
    requestId: string;
    caseId: string;
    applicantRef: string;
    contestedDecisionResultDigest: string;
    statement: string;
    requestedAt: string;
    synthetic: true;
  };
  status: "requested" | "in_review" | "completed";
  reviewer: { reviewerId: string; reviewerRole: "reviewer" | "approver" } | null;
  resolution: ApplicantHumanReviewResolution | null;
  writtenBasis: string | null;
  statusChangedAt: string;
}

export type ApplicantMaterialEvidenceKind =
  | "bill_state"
  | "applicant_confirmation"
  | "submitted_document"
  | "acceptor_risk"
  | "duplicate_check"
  | "mint_capacity";

export interface ApplicantMaterialEvidence {
  kind: ApplicantMaterialEvidenceKind;
  reference: string;
  /** Server-owned display name; only submitted documents may carry one. */
  label?: string;
}

export type OperatorMaterialEvidenceSelection = Pick<ApplicantMaterialEvidence, "kind" | "reference">;

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
  origin: "bill_attachment" | "client_asserted_bill_attachment" | "applicant_upload";
}

const STORED_FILE_SUFFIX = /_[a-f0-9-]{36}(?=\.\w+$)/;

export const displayEvidenceLabel = (label: string) => label.replace(STORED_FILE_SUFFIX, "");

export interface EvidenceCitation {
  page: number;
  exactSnippet: string;
}

export interface ProposedEvidenceField {
  value: string;
  citation: EvidenceCitation;
}

export type EvidenceClaimKind = "party" | "identifier" | "date" | "amount" | "asset" | "obligation" | "status" | "description" | "other";

export interface EvidenceDocumentAnalysis {
  schemaVersion: "evidence-document-analysis-v1";
  evidence: SubmittedEvidence;
  derivativeDigest: string;
  parserVersion: string;
  promptVersion: "evidence-document-analysis-v1";
  modelId: string;
  extractedAt: string;
  analysis: {
    documentType: ProposedEvidenceField | null;
    claims: {
      kind: EvidenceClaimKind;
      label: string;
      value: string;
      citation: EvidenceCitation;
    }[];
  };
}

export interface EvidencePacket {
  evidence: SubmittedEvidence;
  status: "quarantined";
  byteLength: number;
  analysisStatus?: "pending" | "available";
  analysis?: EvidenceDocumentAnalysis;
  extraction?: {
    schemaVersion: "invoice-extraction-proposal-v1";
    derivativeDigest: string;
    parserVersion: string;
    promptVersion: string;
    modelId: string;
    extractedAt: string;
    proposal: {
      invoiceNumber: ProposedEvidenceField | null;
      seller: ProposedEvidenceField | null;
      buyer: ProposedEvidenceField | null;
      issueDate: ProposedEvidenceField | null;
      goodsDescription: ProposedEvidenceField | null;
      transactionReference: ProposedEvidenceField | null;
      currency: ProposedEvidenceField | null;
      totalSat: ProposedEvidenceField | null;
      lineItems: { description: string; amountSat: string; citation: EvidenceCitation }[];
    };
  };
}

export interface VerificationRequest {
  code: string;
  axis: string;
  requiredItem: string;
  reasonCode: string;
  owner?: "applicant" | "mint_risk" | "mint_operations" | "system";
  resolutionAction?: "request_applicant_information" | "record_acceptor_risk_assessment" | "refresh_mint_capacity" | "retry_system_check";
}

/** Immutable Mint-owned product metadata selecting one exact governed policy pack. */
export interface CreditProgram {
  schemaVersion: "credit-program-v1";
  creditProgramId: string;
  creditProgramVersion: string;
  creditProgramDigest: string;
  isSynthetic: true;
  country: string;
  industry: string;
  product: string;
  policyPackVersion: string;
  policyPackDigest: string;
}

/** The Mint's exact quote-and-bill binding to a credit-program release. */
export interface CreditProgramAssignment {
  schemaVersion: "mint-credit-program-selection-v1";
  mintId: string;
  mintQuoteId: string;
  billId: string;
  creditProgramVersion: string;
  creditProgramDigest: string;
  assignmentAuthority: "wildcat_mint_admin";
  assignmentDigest: string;
}

export interface DecisionCase {
  /** Exact Mint quote this assessment governs; null only for read-only synthetic fixtures. */
  mintQuoteId: string | null;
  policyFileName: string;
  snapshot: {
    schemaVersion: "decision-input-snapshot-v8" | "decision-input-snapshot-v9";
    snapshotDigest: string;
    caseId: string;
    applicantRef: string;
    mintId: string;
    asOfDate: string;
    product: string;
    country: string;
    industry: string;
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
      evidenceRefs?: string[];
    };
    duplicateCheck: { result: string; evidenceState: string; validThrough: string };
    mintCapacity: {
      existingExposureSat: string | null;
      exposureLimitSat: string | null;
      evidenceState: string;
      validThrough: string;
      evidenceRefs?: string[];
    };
  };
  policyPack: {
    policyPackVersion: string;
    policyPackDigest: string;
    calculationVersion: string;
    product: string;
    country: string;
    industry: string;
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
  /** Absent only on legacy/synthetic fixtures that remain read-only. */
  creditProgram?: CreditProgram;
  creditProgramAssignment?: CreditProgramAssignment;
  submittedEvidence?: SubmittedEvidence[];
  evidencePackets?: EvidencePacket[];
  applicantConfirmation?: ApplicantConfirmation;
  /** Server-listed evidence an operator may select for a discretionary decline. */
  availableMaterialEvidence?: ApplicantMaterialEvidence[];
  applicantHumanReview?: ApplicantHumanReviewRecord;
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
