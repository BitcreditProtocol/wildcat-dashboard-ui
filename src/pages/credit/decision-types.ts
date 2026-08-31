/**
 * The governed response contract lives in AI Credit. This host file contains only the aliases and
 * display helpers used by the Mint dashboard; it must not reimplement the wire validator.
 */
import type {
  ApplicantConfirmationSummary,
  ApplicantHumanReviewRecord as SharedApplicantHumanReviewRecord,
  ApplicantHumanReviewResolution as SharedApplicantHumanReviewResolution,
  ApplicantMaterialEvidence as SharedApplicantMaterialEvidence,
  ApplicantMaterialEvidenceKind as SharedApplicantMaterialEvidenceKind,
  ClaimInvestigationProposal as SharedClaimInvestigationProposal,
  ClaimInvestigationStart as SharedClaimInvestigationStart,
  ClaimInvestigationState as SharedClaimInvestigationState,
  CreditProgram as SharedCreditProgram,
  CreditProgramAssignment as SharedCreditProgramAssignment,
  DecisionTerms as SharedDecisionTerms,
  EvidenceClaimKind as SharedEvidenceClaimKind,
  EvidenceDocumentAnalysis as SharedEvidenceDocumentAnalysis,
  EvidenceDocumentCitation as SharedEvidenceDocumentCitation,
  EvidenceReference,
  InvoiceExtractionProposal,
  MintQuoteDenialReceipt as SharedMintQuoteDenialReceipt,
  MintQuoteDenialStatus as SharedMintQuoteDenialStatus,
  OperatorMaterialEvidenceSelection as SharedOperatorMaterialEvidenceSelection,
  ProposedEvidenceField as SharedProposedEvidenceField,
} from "@bitcredit/ai-credit-shared";

export type AxisStatus = "pass" | "caution" | "blocked" | "fail" | "not_assessed";
export type AssessmentStatus = "ready_for_decision" | "blocked_pending_verification";
export type Recommendation = "offer_available" | "no_current_product_fit";
export type AssessmentCurrency = "current" | "historical_pending_applicant_response";
export type TraceValues = Record<string, string | number | boolean>;

/** Display projections only. Runtime validation stays in the shared AI Credit package. */
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
  contentDigest?: string;
  invoiceNumber: string;
  goodsDescription: string;
  sellerRef: string;
  buyerRef: string;
  transactionReference?: string;
  issueDate: string;
  currency?: string;
  totalSat: string;
  plausibility: string;
  billAndClaimsConsistency: string;
  evidenceState: string;
  methodologyVersion: string;
  assessedBy: string;
  assessedAt?: string;
  validThrough: string;
  evidenceRefs?: string[];
}

export interface ConfirmedClaims {
  useOfFunds: string;
  acceptorRef: string;
  repaymentSource: string;
  wholeFaceRecourseAcknowledged: boolean;
  evidenceState: string;
}

export type ApplicantConfirmation = ApplicantConfirmationSummary;
export type ApplicantHumanReviewResolution = SharedApplicantHumanReviewResolution;
export type ApplicantHumanReviewRecord = SharedApplicantHumanReviewRecord;
export type ApplicantMaterialEvidenceKind = SharedApplicantMaterialEvidenceKind;
export type ApplicantMaterialEvidence = SharedApplicantMaterialEvidence;
export type OperatorMaterialEvidenceSelection = SharedOperatorMaterialEvidenceSelection;
export type DecisionTerms = SharedDecisionTerms;
export type SubmittedEvidence = EvidenceReference;

export type ClaimInvestigationStart = SharedClaimInvestigationStart;
export type ClaimInvestigationProposal = SharedClaimInvestigationProposal;
export type ClaimInvestigationState = SharedClaimInvestigationState;
export type ClaimInvestigationTrack = ClaimInvestigationProposal["findings"][number]["track"];
export type ClaimInvestigationFindingStatus = ClaimInvestigationProposal["findings"][number]["status"];

export type EvidenceCitation = SharedEvidenceDocumentCitation;
export type ProposedEvidenceField = SharedProposedEvidenceField;
export type EvidenceClaimKind = SharedEvidenceClaimKind;
export type EvidenceDocumentAnalysis = SharedEvidenceDocumentAnalysis;
export interface EvidencePacket {
  evidence: EvidenceReference;
  status: "quarantined";
  byteLength: number;
  analysisStatus?: "pending" | "available";
  analysis?: EvidenceDocumentAnalysis;
  extraction?: Omit<InvoiceExtractionProposal, "evidence"> & { evidence?: EvidenceReference };
}

export interface VerificationRequest {
  code: string;
  axis: string;
  requiredItem: string;
  reasonCode: string;
  owner?: "applicant" | "mint_risk" | "mint_operations" | "system";
  resolutionAction?: "request_applicant_information" | "record_acceptor_risk_assessment" | "refresh_mint_capacity" | "retry_system_check";
}

export type CreditProgram = SharedCreditProgram;
export type CreditProgramAssignment = SharedCreditProgramAssignment;
export type MintQuoteDenialReceipt = SharedMintQuoteDenialReceipt;
export type MintQuoteDenialStatus = SharedMintQuoteDenialStatus;

export interface DecisionCase {
  assessmentCurrency: AssessmentCurrency;
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
    assessmentTrace: {
      ruleId: string;
      subject: string;
      outcome: string;
      reasonCode: string;
      observed: TraceValues;
      policy: TraceValues;
      effect?: TraceValues;
    }[];
    calculationTrace: { step: string; formula: string; inputs: TraceValues; result: string }[];
  };
  resultDigest: string;
  assessmentHistory?: AssessmentRevision[];
  creditProgram?: CreditProgram;
  creditProgramAssignment?: CreditProgramAssignment;
  submittedEvidence?: SubmittedEvidence[];
  evidencePackets?: EvidencePacket[];
  claimInvestigation?: ClaimInvestigationState;
  applicantConfirmation?: ApplicantConfirmation;
  availableMaterialEvidence?: ApplicantMaterialEvidence[];
  applicantHumanReview?: ApplicantHumanReviewRecord;
  mintDenial?: MintQuoteDenialStatus;
}

export interface AssessmentRevision {
  snapshot: DecisionCase["snapshot"];
  result: DecisionCase["result"];
  resultDigest: string;
  submittedEvidence?: SubmittedEvidence[];
}

const STORED_FILE_SUFFIX = /_[a-f0-9-]{36}(?=\.\w+$)/;

export const displayEvidenceLabel = (label: string) => label.replace(STORED_FILE_SUFFIX, "");

export function countCitedEvidenceClaims(evidencePackets: readonly EvidencePacket[]): number {
  return evidencePackets.reduce((count, packet) => {
    if (packet.analysis !== undefined) return count + packet.analysis.analysis.claims.length;
    if (packet.extraction === undefined) return count;
    const { proposal } = packet.extraction;
    return (
      count +
      [
        proposal.invoiceNumber,
        proposal.seller,
        proposal.buyer,
        proposal.issueDate,
        proposal.goodsDescription,
        proposal.transactionReference,
        proposal.currency,
        proposal.totalSat,
      ].filter((field) => field !== null).length +
      proposal.lineItems.length
    );
  }, 0);
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

/**
 * The current operator prototype is case-scoped. The capacity axis remains in
 * historical decision contracts for compatibility, but is deliberately not an
 * operator-facing case check until Mint-level portfolio accounting exists.
 */
export const operatorVisibleAxes = (axes: DecisionCase["result"]["axes"]): DecisionCase["result"]["axes"] =>
  axes.filter((axis) => axis.axis !== "mint_exposure_capacity");

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
