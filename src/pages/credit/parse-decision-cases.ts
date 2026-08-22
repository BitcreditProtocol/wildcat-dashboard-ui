import type {
  ApplicantConfirmation,
  ConfirmedClaims,
  CreditProgram,
  CreditProgramAssignment,
  DecisionBill,
  DecisionCase,
  DecisionInvoice,
  DecisionTerms,
  EvidenceCitation,
  EvidencePacket,
  ProposedEvidenceField,
  SubmittedEvidence,
  TraceValues,
  VerificationRequest,
} from "./decision-types";

interface DecisionCasesResponse {
  cases: DecisionCase[];
}

type JsonObject = Record<string, unknown>;

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const EVIDENCE_DIGEST = /^(?:sha256:[0-9a-f]{64}|sha256-base58:[1-9A-HJ-NP-Za-km-z]{43,44})$/u;
const SATOSHI = /^(0|[1-9][0-9]*)$/u;
const MAXIMUM_SATOSHIS = 2_100_000_000_000_000n;
const ASSESSMENT_AXES = [
  "instrument_eligibility",
  "acceptor_repayment_risk",
  "transaction_integrity",
  "applicant_recourse_risk",
  "evidence_sufficiency",
  "mint_exposure_capacity",
] as const;
const EVIDENCE_STATES = new Set([
  "unconfirmed",
  "applicant_confirmed",
  "corroborated",
  "independently_verified",
  "contradicted",
  "not_verifiable",
  "stale",
  "source_unavailable",
  "withdrawn",
]);
const EVIDENCE_CLAIM_KINDS = new Set(["party", "identifier", "date", "amount", "asset", "obligation", "status", "description", "other"]);

const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNonEmptyString = (value: unknown): value is string => isString(value) && value.trim().length > 0;
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonNegativeInteger = (value: unknown): value is number => isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number => isNonNegativeInteger(value) && value > 0;
const isBps = (value: unknown, maximum: number): value is number => isNonNegativeInteger(value) && value <= maximum;
const isSatoshi = (value: unknown): value is string => isString(value) && SATOSHI.test(value) && BigInt(value) <= MAXIMUM_SATOSHIS;
const isPositiveSatoshi = (value: unknown): value is string => isSatoshi(value) && value !== "0";
const isDigest = (value: unknown): value is string => isString(value) && DIGEST.test(value);
const isEvidenceDigest = (value: unknown): value is string => isString(value) && EVIDENCE_DIGEST.test(value);
const isDate = (value: unknown): value is string => {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
};
const isDateTime = (value: unknown): value is string => isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
const isEvidenceState = (value: unknown): value is string => isString(value) && EVIDENCE_STATES.has(value);

function isArrayOf<T>(value: unknown, predicate: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every((item: unknown) => predicate(item));
}

const isIdentifierArray = (value: unknown): value is string[] => isArrayOf(value, isNonEmptyString);

function isTraceValues(value: unknown, requireValue = false): value is TraceValues {
  return (
    isObject(value) &&
    (!requireValue || Object.keys(value).length > 0) &&
    Object.values(value).every((item) => isString(item) || isBoolean(item) || isFiniteNumber(item))
  );
}

function isEvidenceProvenance(value: JsonObject): boolean {
  return (
    isNonEmptyString(value.methodologyVersion) &&
    isNonEmptyString(value.assessedBy) &&
    isDate(value.assessedAt) &&
    isDate(value.validThrough) &&
    isArrayOf(value.evidenceRefs, isNonEmptyString) &&
    value.evidenceRefs.length > 0
  );
}

function isDecisionBill(value: unknown): value is DecisionBill {
  return (
    isObject(value) &&
    isNonEmptyString(value.billId) &&
    isDigest(value.billStateDigest) &&
    (value.acceptanceState === "issued" || value.acceptanceState === "accepted" || value.acceptanceState === "endorsed") &&
    isNonEmptyString(value.holderRef) &&
    isNonEmptyString(value.acceptorRef) &&
    isPositiveSatoshi(value.faceValueSat) &&
    isDate(value.acceptedDate) &&
    isDate(value.maturityDate) &&
    (value.alreadyFinanced === null || isBoolean(value.alreadyFinanced))
  );
}

function isDecisionInvoice(value: unknown): value is DecisionInvoice {
  return (
    isObject(value) &&
    isNonEmptyString(value.reference) &&
    isEvidenceDigest(value.contentDigest) &&
    isNonEmptyString(value.invoiceNumber) &&
    isNonEmptyString(value.goodsDescription) &&
    isNonEmptyString(value.transactionReference) &&
    isNonEmptyString(value.sellerRef) &&
    isNonEmptyString(value.buyerRef) &&
    isDate(value.issueDate) &&
    value.currency === "SAT" &&
    isPositiveSatoshi(value.totalSat) &&
    (value.plausibility === "plausible" || value.plausibility === "implausible" || value.plausibility === "unknown") &&
    (value.billAndClaimsConsistency === "match" ||
      value.billAndClaimsConsistency === "mismatch" ||
      value.billAndClaimsConsistency === "unknown") &&
    isEvidenceState(value.evidenceState) &&
    isEvidenceProvenance(value)
  );
}

function isConfirmedClaims(value: unknown): value is ConfirmedClaims {
  return (
    isObject(value) &&
    isNonEmptyString(value.useOfFunds) &&
    isNonEmptyString(value.acceptorRef) &&
    isNonEmptyString(value.repaymentSource) &&
    isBoolean(value.wholeFaceRecourseAcknowledged) &&
    value.evidenceState === "applicant_confirmed"
  );
}

function isDecisionTerms(value: unknown): value is DecisionTerms {
  if (
    !isObject(value) ||
    !isPositiveSatoshi(value.billSumSat) ||
    !isPositiveSatoshi(value.discountedSat) ||
    !isSatoshi(value.appliedDiscountSat) ||
    !isSatoshi(value.operatingCostSat) ||
    !isSatoshi(value.effectiveFeeSat) ||
    !isPositiveSatoshi(value.endorsementExposureSat) ||
    !isDate(value.maturityDate) ||
    !isDate(value.offerExpiresOn) ||
    !isPositiveInteger(value.tenorDays) ||
    !isBps(value.annualDiscountBps, 20_000) ||
    !isBps(value.effectiveAnnualBps, 20_000) ||
    !isBps(value.feeRatioBps, 10_000)
  ) {
    return false;
  }

  const billSum = BigInt(value.billSumSat);
  const discounted = BigInt(value.discountedSat);
  const fee = BigInt(value.appliedDiscountSat) + BigInt(value.operatingCostSat);
  return (
    billSum === discounted + fee &&
    BigInt(value.effectiveFeeSat) === fee &&
    value.endorsementExposureSat === value.billSumSat &&
    BigInt(value.feeRatioBps) === (fee * 10_000n + billSum - 1n) / billSum &&
    BigInt(value.effectiveAnnualBps) ===
      (fee * 10_000n * 360n + discounted * BigInt(value.tenorDays) - 1n) / (discounted * BigInt(value.tenorDays)) &&
    value.offerExpiresOn <= value.maturityDate
  );
}

function isSubmittedEvidence(value: unknown): value is SubmittedEvidence {
  return (
    isObject(value) &&
    isNonEmptyString(value.reference) &&
    isNonEmptyString(value.label) &&
    isEvidenceDigest(value.contentDigest) &&
    (value.origin === "bill_attachment" || value.origin === "client_asserted_bill_attachment" || value.origin === "applicant_upload")
  );
}

function isEvidenceCitation(value: unknown): value is EvidenceCitation {
  return isObject(value) && isPositiveInteger(value.page) && value.page <= 20 && isNonEmptyString(value.exactSnippet);
}

function isProposedEvidenceField(value: unknown): value is ProposedEvidenceField {
  return isObject(value) && isNonEmptyString(value.value) && isEvidenceCitation(value.citation);
}

const isNullableEvidenceField = (value: unknown): value is ProposedEvidenceField | null => value === null || isProposedEvidenceField(value);

function isEvidenceDocumentAnalysis(value: unknown, evidence: SubmittedEvidence): boolean {
  if (
    !isObject(value) ||
    value.schemaVersion !== "evidence-document-analysis-v1" ||
    !isSubmittedEvidence(value.evidence) ||
    value.evidence.reference !== evidence.reference ||
    value.evidence.contentDigest !== evidence.contentDigest ||
    value.evidence.origin !== evidence.origin ||
    !isDigest(value.derivativeDigest) ||
    !isNonEmptyString(value.parserVersion) ||
    value.promptVersion !== "evidence-document-analysis-v1" ||
    !isNonEmptyString(value.modelId) ||
    !isDateTime(value.extractedAt) ||
    !isObject(value.analysis) ||
    !isNullableEvidenceField(value.analysis.documentType) ||
    !Array.isArray(value.analysis.claims) ||
    value.analysis.claims.length > 12
  ) {
    return false;
  }
  return value.analysis.claims.every(
    (claim) =>
      isObject(claim) &&
      isString(claim.kind) &&
      EVIDENCE_CLAIM_KINDS.has(claim.kind) &&
      isNonEmptyString(claim.label) &&
      claim.label.length <= 80 &&
      isNonEmptyString(claim.value) &&
      claim.value.length <= 500 &&
      isEvidenceCitation(claim.citation)
  );
}

function isEvidencePacket(value: unknown): value is EvidencePacket {
  if (
    !isObject(value) ||
    !isSubmittedEvidence(value.evidence) ||
    value.status !== "quarantined" ||
    !isPositiveInteger(value.byteLength) ||
    value.byteLength > 10 * 1024 * 1024
  ) {
    return false;
  }
  if (value.analysisStatus !== undefined && value.analysisStatus !== "pending" && value.analysisStatus !== "available") {
    return false;
  }
  if (
    (value.analysisStatus === "available") !== (value.analysis !== undefined) ||
    (value.analysis !== undefined && !isEvidenceDocumentAnalysis(value.analysis, value.evidence))
  ) {
    return false;
  }
  if (value.extraction === undefined) return true;
  if (!isObject(value.extraction) || value.extraction.schemaVersion !== "invoice-extraction-proposal-v1") return false;
  const proposal = value.extraction.proposal;
  return (
    isSubmittedEvidence(value.extraction.evidence) &&
    value.extraction.evidence.contentDigest === value.evidence.contentDigest &&
    isDigest(value.extraction.derivativeDigest) &&
    isNonEmptyString(value.extraction.parserVersion) &&
    isNonEmptyString(value.extraction.promptVersion) &&
    isNonEmptyString(value.extraction.modelId) &&
    isDateTime(value.extraction.extractedAt) &&
    isObject(proposal) &&
    isNullableEvidenceField(proposal.invoiceNumber) &&
    isNullableEvidenceField(proposal.seller) &&
    isNullableEvidenceField(proposal.buyer) &&
    isNullableEvidenceField(proposal.issueDate) &&
    isNullableEvidenceField(proposal.goodsDescription) &&
    isNullableEvidenceField(proposal.transactionReference) &&
    isNullableEvidenceField(proposal.currency) &&
    isNullableEvidenceField(proposal.totalSat) &&
    isArrayOf(
      proposal.lineItems,
      (item): item is { description: string; amountSat: string; citation: EvidenceCitation } =>
        isObject(item) && isNonEmptyString(item.description) && isSatoshi(item.amountSat) && isEvidenceCitation(item.citation)
    ) &&
    proposal.lineItems.length <= 50
  );
}

function isApplicantConfirmation(value: unknown): value is ApplicantConfirmation {
  return (
    isObject(value) &&
    value.schemaVersion === "applicant-confirmation-summary-v1" &&
    isNonEmptyString(value.preparedInputId) &&
    isNonEmptyString(value.useOfFunds) &&
    (value.acceptor === null || isNonEmptyString(value.acceptor)) &&
    isNonEmptyString(value.repaymentSource) &&
    value.answersAffirmed === true &&
    isBoolean(value.recourseAcknowledged)
  );
}

function isVerificationRequest(value: unknown): value is VerificationRequest {
  return (
    isObject(value) &&
    isNonEmptyString(value.code) &&
    ASSESSMENT_AXES.some((axis) => axis === value.axis) &&
    isNonEmptyString(value.requiredItem) &&
    isNonEmptyString(value.reasonCode)
  );
}

function isCreditProgram(value: unknown): value is CreditProgram {
  return (
    isObject(value) &&
    value.schemaVersion === "credit-program-v1" &&
    isNonEmptyString(value.creditProgramId) &&
    isNonEmptyString(value.creditProgramVersion) &&
    isDigest(value.creditProgramDigest) &&
    value.isSynthetic === true &&
    isString(value.country) &&
    /^[A-Z]{2}$/u.test(value.country) &&
    isNonEmptyString(value.industry) &&
    isNonEmptyString(value.product) &&
    isNonEmptyString(value.policyPackVersion) &&
    isDigest(value.policyPackDigest)
  );
}

function isCreditProgramAssignment(value: unknown): value is CreditProgramAssignment {
  return (
    isObject(value) &&
    value.schemaVersion === "mint-credit-program-selection-v1" &&
    isNonEmptyString(value.mintId) &&
    isNonEmptyString(value.mintQuoteId) &&
    isNonEmptyString(value.billId) &&
    isNonEmptyString(value.creditProgramVersion) &&
    isDigest(value.creditProgramDigest) &&
    value.assignmentAuthority === "wildcat_mint_admin" &&
    isDigest(value.assignmentDigest)
  );
}

function isSnapshot(value: unknown): value is DecisionCase["snapshot"] {
  return (
    isObject(value) &&
    (value.schemaVersion === "decision-input-snapshot-v8" || value.schemaVersion === "decision-input-snapshot-v9") &&
    isDigest(value.snapshotDigest) &&
    isNonEmptyString(value.caseId) &&
    isNonEmptyString(value.applicantRef) &&
    isNonEmptyString(value.mintId) &&
    isDate(value.asOfDate) &&
    isDigest(value.policyPackDigest) &&
    isNonEmptyString(value.calculationVersion) &&
    value.isSynthetic === true &&
    isNonEmptyString(value.product) &&
    isString(value.country) &&
    /^[A-Z]{2}$/u.test(value.country) &&
    isNonEmptyString(value.industry) &&
    isConfirmedClaims(value.confirmedClaims) &&
    isArrayOf(
      value.contradictions,
      (item): item is { code: string; state: string; evidenceState: string } =>
        isObject(item) && isNonEmptyString(item.code) && item.state === "unresolved" && item.evidenceState === "contradicted"
    ) &&
    (value.bill === null || isDecisionBill(value.bill)) &&
    (value.invoice === null || isDecisionInvoice(value.invoice)) &&
    isObject(value.acceptor) &&
    (value.acceptor.probabilityOfDefaultBps === null || isBps(value.acceptor.probabilityOfDefaultBps, 10_000)) &&
    (value.acceptor.lossGivenDefaultBps === null || isBps(value.acceptor.lossGivenDefaultBps, 10_000)) &&
    isEvidenceState(value.acceptor.evidenceState) &&
    isEvidenceProvenance(value.acceptor) &&
    isObject(value.duplicateCheck) &&
    isString(value.duplicateCheck.result) &&
    ["clear", "conflicting_bill", "reused_invoice", "already_financed", "unknown"].includes(value.duplicateCheck.result) &&
    isEvidenceState(value.duplicateCheck.evidenceState) &&
    isEvidenceProvenance(value.duplicateCheck) &&
    isObject(value.mintCapacity) &&
    ((value.schemaVersion === "decision-input-snapshot-v8" &&
      isSatoshi(value.mintCapacity.existingExposureSat) &&
      isSatoshi(value.mintCapacity.exposureLimitSat)) ||
      (value.schemaVersion === "decision-input-snapshot-v9" &&
        (value.mintCapacity.existingExposureSat === null || isSatoshi(value.mintCapacity.existingExposureSat)) &&
        (value.mintCapacity.exposureLimitSat === null || isSatoshi(value.mintCapacity.exposureLimitSat)))) &&
    isEvidenceState(value.mintCapacity.evidenceState) &&
    isEvidenceProvenance(value.mintCapacity)
  );
}

function isPolicyPack(value: unknown): value is DecisionCase["policyPack"] {
  return (
    isObject(value) &&
    value.schemaVersion === "synthetic-credit-policy-pack-v11" &&
    value.isSynthetic === true &&
    value.currency === "SAT" &&
    isNonEmptyString(value.policyPackVersion) &&
    isDigest(value.policyPackDigest) &&
    isNonEmptyString(value.calculationVersion) &&
    isNonEmptyString(value.product) &&
    isNonEmptyString(value.country) &&
    isNonEmptyString(value.industry) &&
    isBps(value.maximumEffectiveAnnualBps, 20_000) &&
    isBps(value.maximumFeeRatioBps, 10_000)
  );
}

function hasCoherentTraceBindings(
  axes: DecisionCase["result"]["axes"],
  assessmentTrace: DecisionCase["result"]["assessmentTrace"],
  reasonCodes: string[]
): boolean {
  for (const finding of axes) {
    if (finding.status === "not_assessed" && finding.reasonCodes.length > 0) return false;
    const matchingTrace = assessmentTrace.filter((step) => step.subject === finding.axis);
    if (finding.status !== "not_assessed" && !matchingTrace.some((step) => step.outcome === finding.status)) return false;
    if (finding.reasonCodes.some((reasonCode) => !matchingTrace.some((step) => step.reasonCode === reasonCode))) return false;
  }
  return reasonCodes.every((reasonCode) => assessmentTrace.some((step) => step.reasonCode === reasonCode));
}

function isResult(value: unknown): value is DecisionCase["result"] {
  if (
    !isObject(value) ||
    value.schemaVersion !== "decision-result-v9" ||
    !isDigest(value.snapshotDigest) ||
    !isNonEmptyString(value.mintId) ||
    !isDigest(value.policyPackDigest) ||
    !isNonEmptyString(value.policyPackVersion) ||
    !isNonEmptyString(value.calculationVersion) ||
    !isArrayOf(
      value.axes,
      (item): item is DecisionCase["result"]["axes"][number] =>
        isObject(item) &&
        isNonEmptyString(item.axis) &&
        (item.status === "pass" ||
          item.status === "caution" ||
          item.status === "blocked" ||
          item.status === "fail" ||
          item.status === "not_assessed") &&
        isIdentifierArray(item.reasonCodes)
    ) ||
    value.axes.length !== ASSESSMENT_AXES.length ||
    value.axes.some((item, index) => item.axis !== ASSESSMENT_AXES[index]) ||
    !isArrayOf(value.verificationRequests, isVerificationRequest) ||
    !isIdentifierArray(value.reasonCodes) ||
    !isArrayOf(
      value.assessmentTrace,
      (item): item is DecisionCase["result"]["assessmentTrace"][number] =>
        isObject(item) &&
        isNonEmptyString(item.ruleId) &&
        (ASSESSMENT_AXES.some((axis) => axis === item.subject) || item.subject === "product_fit") &&
        (item.outcome === "pass" || item.outcome === "caution" || item.outcome === "blocked" || item.outcome === "fail") &&
        isNonEmptyString(item.reasonCode) &&
        isTraceValues(item.observed, true) &&
        isTraceValues(item.policy, true) &&
        isTraceValues(item.effect, true)
    ) ||
    !isArrayOf(
      value.calculationTrace,
      (item): item is DecisionCase["result"]["calculationTrace"][number] =>
        isObject(item) &&
        isNonEmptyString(item.step) &&
        isNonEmptyString(item.formula) &&
        isTraceValues(item.inputs) &&
        isNonEmptyString(item.result)
    )
  ) {
    return false;
  }

  if (!hasCoherentTraceBindings(value.axes, value.assessmentTrace, value.reasonCodes)) return false;

  if (value.assessmentStatus === "blocked_pending_verification") {
    return (
      value.recommendation === null &&
      value.terms === null &&
      value.verificationRequests.length > 0 &&
      value.calculationTrace.length === 0 &&
      value.axes.some((item) => item.status === "blocked")
    );
  }
  if (
    value.assessmentStatus !== "ready_for_decision" ||
    value.verificationRequests.length > 0 ||
    value.axes.some((item) => item.status === "blocked")
  ) {
    return false;
  }
  return (
    (value.recommendation === "offer_available" && isDecisionTerms(value.terms)) ||
    (value.recommendation === "no_current_product_fit" && value.terms === null)
  );
}

function isEvidenceArray(value: unknown): value is SubmittedEvidence[] {
  return isArrayOf(value, isSubmittedEvidence) && value.length <= 8;
}

function isEvidencePacketArray(value: unknown): value is EvidencePacket[] {
  return isArrayOf(value, isEvidencePacket) && value.length <= 8;
}

function hasMatchingDecisionBindings(value: JsonObject): boolean {
  if (!isObject(value.snapshot) || !isObject(value.policyPack) || !isObject(value.result)) return false;
  const { snapshot, policyPack, result } = value;
  if (
    snapshot.policyPackDigest !== policyPack.policyPackDigest ||
    snapshot.calculationVersion !== policyPack.calculationVersion ||
    snapshot.product !== policyPack.product ||
    snapshot.country !== policyPack.country ||
    snapshot.industry !== policyPack.industry ||
    result.snapshotDigest !== snapshot.snapshotDigest ||
    result.mintId !== snapshot.mintId ||
    result.policyPackDigest !== policyPack.policyPackDigest ||
    result.policyPackVersion !== policyPack.policyPackVersion ||
    result.calculationVersion !== policyPack.calculationVersion
  ) {
    return false;
  }
  if (result.terms === null) return true;
  return (
    isObject(result.terms) &&
    isObject(snapshot.bill) &&
    result.terms.billSumSat === snapshot.bill.faceValueSat &&
    result.terms.maturityDate === snapshot.bill.maturityDate
  );
}

function hasMatchingCreditProgramBindings(value: JsonObject): boolean {
  if (value.creditProgram === undefined && value.creditProgramAssignment === undefined) return true;
  const bill = isObject(value.snapshot) ? value.snapshot.bill : undefined;
  if (
    !isCreditProgram(value.creditProgram) ||
    !isCreditProgramAssignment(value.creditProgramAssignment) ||
    !isObject(value.snapshot) ||
    !isObject(value.policyPack) ||
    !isNonEmptyString(value.mintQuoteId) ||
    !isDecisionBill(bill)
  ) {
    return false;
  }
  const { creditProgram, creditProgramAssignment, snapshot, policyPack } = value;
  return (
    creditProgram.country === snapshot.country &&
    creditProgram.industry === snapshot.industry &&
    creditProgram.product === snapshot.product &&
    creditProgram.policyPackVersion === policyPack.policyPackVersion &&
    creditProgram.policyPackDigest === policyPack.policyPackDigest &&
    creditProgramAssignment.mintId === snapshot.mintId &&
    creditProgramAssignment.mintQuoteId === value.mintQuoteId &&
    creditProgramAssignment.billId === bill.billId &&
    creditProgramAssignment.creditProgramVersion === creditProgram.creditProgramVersion &&
    creditProgramAssignment.creditProgramDigest === creditProgram.creditProgramDigest
  );
}

function isDecisionCase(value: unknown): value is DecisionCase {
  if (
    !isObject(value) ||
    (value.mintQuoteId !== null && !isNonEmptyString(value.mintQuoteId)) ||
    !isNonEmptyString(value.policyFileName) ||
    !isSnapshot(value.snapshot) ||
    !isPolicyPack(value.policyPack) ||
    !isResult(value.result) ||
    !isDigest(value.resultDigest) ||
    (value.submittedEvidence !== undefined && !isEvidenceArray(value.submittedEvidence)) ||
    (value.evidencePackets !== undefined && !isEvidencePacketArray(value.evidencePackets)) ||
    (value.applicantConfirmation !== undefined && !isApplicantConfirmation(value.applicantConfirmation)) ||
    !hasMatchingDecisionBindings(value) ||
    !hasMatchingCreditProgramBindings(value)
  ) {
    return false;
  }
  return true;
}

export function parseDecisionCasesResponse(value: unknown): DecisionCasesResponse {
  if (!isObject(value) || !isArrayOf(value.cases, isDecisionCase)) {
    throw new Error("AI Credit returned an invalid governed decision response");
  }
  return { cases: value.cases };
}
