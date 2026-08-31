import { operatorVisibleAxes, type AssessmentRevision } from "./decision-types";

export interface AssessmentChange {
  field:
    | "assessment"
    | "recommendation"
    | "axis"
    | "required_information"
    | "contradictions"
    | "invoice_plausibility"
    | "invoice_consistency"
    | "invoice_evidence"
    | "invoice_amount"
    | "invoice_amount_vs_bill"
    | "use_of_funds"
    | "acceptor"
    | "repayment_source"
    | "recourse_acknowledgement"
    | "claim_evidence"
    | "document_count"
    | "documents"
    | "minting_fee"
    | "amount_available"
    | "offer_expiry";
  axis?: string;
  before: string;
  after: string;
}

const empty = "";
const values = (items: readonly string[]) => (items.length === 0 ? empty : [...items].sort().join("; "));
const documents = (revision: AssessmentRevision) =>
  values((revision.submittedEvidence ?? []).map(({ label, reference, contentDigest }) => `${label} [${reference}] ${contentDigest}`));
const invoiceAmountVsBill = (revision: AssessmentRevision) => {
  const invoice = revision.snapshot.invoice;
  const bill = revision.snapshot.bill;
  if (invoice === null || bill === null) return empty;
  return invoice.totalSat === bill.faceValueSat ? "match" : "mismatch";
};

export function assessmentChanges(previous: AssessmentRevision, current: AssessmentRevision): AssessmentChange[] {
  const changes: AssessmentChange[] = [];
  const add = (field: AssessmentChange["field"], before: string | null | undefined, after: string | null | undefined, axis?: string) => {
    const left = before ?? empty;
    const right = after ?? empty;
    if (left !== right) changes.push({ field, ...(axis === undefined ? {} : { axis }), before: left, after: right });
  };

  add("assessment", previous.result.assessmentStatus, current.result.assessmentStatus);
  add("recommendation", previous.result.recommendation, current.result.recommendation);
  add("use_of_funds", previous.snapshot.confirmedClaims.useOfFunds, current.snapshot.confirmedClaims.useOfFunds);
  add("acceptor", previous.snapshot.confirmedClaims.acceptorRef, current.snapshot.confirmedClaims.acceptorRef);
  add("repayment_source", previous.snapshot.confirmedClaims.repaymentSource, current.snapshot.confirmedClaims.repaymentSource);
  add(
    "recourse_acknowledgement",
    String(previous.snapshot.confirmedClaims.wholeFaceRecourseAcknowledged),
    String(current.snapshot.confirmedClaims.wholeFaceRecourseAcknowledged)
  );
  add("claim_evidence", previous.snapshot.confirmedClaims.evidenceState, current.snapshot.confirmedClaims.evidenceState);
  for (const axis of operatorVisibleAxes(current.result.axes)) {
    add("axis", previous.result.axes.find((candidate) => candidate.axis === axis.axis)?.status, axis.status, axis.axis);
  }
  add(
    "required_information",
    values(previous.result.verificationRequests.map(({ requiredItem }) => requiredItem)),
    values(current.result.verificationRequests.map(({ requiredItem }) => requiredItem))
  );
  add(
    "contradictions",
    values(previous.snapshot.contradictions.map(({ code }) => code)),
    values(current.snapshot.contradictions.map(({ code }) => code))
  );
  add("invoice_plausibility", previous.snapshot.invoice?.plausibility, current.snapshot.invoice?.plausibility);
  add("invoice_consistency", previous.snapshot.invoice?.billAndClaimsConsistency, current.snapshot.invoice?.billAndClaimsConsistency);
  add("invoice_evidence", previous.snapshot.invoice?.evidenceState, current.snapshot.invoice?.evidenceState);
  add("invoice_amount", previous.snapshot.invoice?.totalSat, current.snapshot.invoice?.totalSat);
  add("invoice_amount_vs_bill", invoiceAmountVsBill(previous), invoiceAmountVsBill(current));
  add("document_count", String(previous.submittedEvidence?.length ?? 0), String(current.submittedEvidence?.length ?? 0));
  add("documents", documents(previous), documents(current));
  add("minting_fee", previous.result.terms?.effectiveFeeSat, current.result.terms?.effectiveFeeSat);
  add("amount_available", previous.result.terms?.discountedSat, current.result.terms?.discountedSat);
  add("offer_expiry", previous.result.terms?.offerExpiresOn, current.result.terms?.offerExpiresOn);
  return changes;
}
