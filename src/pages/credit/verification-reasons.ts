import { defineMessages, type IntlShape } from "react-intl";
import { axisLabels, words, type VerificationRequest } from "./decision-types";

/** Operator wording for governed verification reason codes, shared by the overview and Claim coverage. */
export const reasonMessages = defineMessages({
  reasonBillMissing: {
    id: "credit.evidenceBrief.reason.billMissing",
    defaultMessage: "Accepted eBill missing",
    description: "Governed reason for requesting an accepted eBill",
  },
  reasonInvoiceMissing: {
    id: "credit.evidenceBrief.reason.invoiceMissing",
    defaultMessage: "Trade invoice missing",
    description: "Governed reason for requesting an underlying-goods invoice",
  },
  reasonDuplicateCheck: {
    id: "credit.evidenceBrief.reason.duplicateCheck",
    defaultMessage: "Duplicate-financing check incomplete",
    description: "Governed reason for an incomplete duplicate-financing check",
  },
  reasonContradiction: {
    id: "credit.evidenceBrief.reason.contradiction",
    defaultMessage: "Confirmed facts conflict",
    description: "Governed reason for requesting resolution of contradictory case facts",
  },
  reasonAcceptorRisk: {
    id: "credit.evidenceBrief.reason.acceptorRisk",
    defaultMessage: "Acceptor risk evidence missing",
    description: "Governed reason for requesting a current acceptor risk record",
  },
  reasonInvoiceEvidence: {
    id: "credit.evidenceBrief.reason.invoiceEvidence",
    defaultMessage: "Invoice evidence not admissible",
    description: "Governed reason for requesting admissible invoice evidence",
  },
  reasonInvoiceConsistency: {
    id: "credit.evidenceBrief.reason.invoiceConsistency",
    defaultMessage: "Invoice and eBill do not align",
    description: "Governed reason for requesting clarification of invoice and eBill consistency",
  },
  reasonRecourse: {
    id: "credit.evidenceBrief.reason.recourse",
    defaultMessage: "Recourse acknowledgement missing",
    description: "Governed reason for requesting the applicant's whole-face recourse acknowledgement",
  },
});

export function requestReason(request: Pick<VerificationRequest, "reasonCode" | "axis">, intl: IntlShape): string {
  const byCode: Record<string, (typeof reasonMessages)[keyof typeof reasonMessages]> = {
    verification_bill_required: reasonMessages.reasonBillMissing,
    verification_invoice_required: reasonMessages.reasonInvoiceMissing,
    verification_duplicate_check_required: reasonMessages.reasonDuplicateCheck,
    verification_contradiction_required: reasonMessages.reasonContradiction,
    verification_acceptor_loss_parameters_required: reasonMessages.reasonAcceptorRisk,
    verification_invoice_evidence_required: reasonMessages.reasonInvoiceEvidence,
    verification_invoice_consistency_required: reasonMessages.reasonInvoiceConsistency,
    verification_recourse_acknowledgment_required: reasonMessages.reasonRecourse,
  };
  const reason = byCode[request.reasonCode];
  return reason === undefined ? (axisLabels[request.axis] ?? words(request.axis)) : intl.formatMessage(reason);
}
