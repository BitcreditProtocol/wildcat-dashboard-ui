import { defineMessages, type IntlShape } from "react-intl";

export const fraudMessages = defineMessages({
  invoice: { id: "credit.fraud.invoice", defaultMessage: "Invoice and tax authority", description: "Invoice fraud controls heading" },
  synthetic: {
    id: "credit.fraud.synthetic",
    defaultMessage: "Synthetic register · test data only",
    description: "Always visible register scope",
  },
  scope: {
    id: "credit.fraud.scope",
    defaultMessage: "Register facts verify the document, not delivery, the trade, identity or solvency. Operators cannot waive hard gates.",
    description: "Register authority and human decision limits",
  },
  unavailable: {
    id: "credit.fraud.unavailable",
    defaultMessage: "Not available · verification required",
    description: "Missing fraud control observation",
  },
  notRecorded: {
    id: "credit.fraud.notRecorded",
    defaultMessage: "Not recorded in this snapshot",
    description: "Absent display field does not independently create a gate",
  },
  satInvoice: {
    id: "credit.fraud.satInvoice",
    defaultMessage: "SAT invoice · FX conversion does not apply",
    description: "Legacy sat invoice needs no FX comparison",
  },
  amountMatch: {
    id: "credit.fraud.amountMatch",
    defaultMessage: "Within tolerance",
    description: "Governed invoice amount comparison pass",
  },
  legacy: {
    id: "credit.fraud.legacy",
    defaultMessage: "Fraud controls are not recorded in this snapshot. Review the pinned policy and evidence; no clearance is implied.",
    description: "Older assessment without fraud controls",
  },
  documentId: { id: "credit.fraud.documentId", defaultMessage: "Authority document ID", description: "FEL or DTE identifier" },
  register: { id: "credit.fraud.register", defaultMessage: "Register", description: "Tax authority register name" },
  status: { id: "credit.fraud.status", defaultMessage: "Register status", description: "Register observation status" },
  stamp: { id: "credit.fraud.stamp", defaultMessage: "Reception stamp", description: "El Salvador DTE reception stamp" },
  issueDate: { id: "credit.fraud.issueDate", defaultMessage: "Issue date", description: "Invoice issue date" },
  sellerName: { id: "credit.fraud.sellerName", defaultMessage: "Issuer name", description: "Invoice issuer name" },
  sellerTaxId: { id: "credit.fraud.sellerTaxId", defaultMessage: "Issuer tax ID", description: "Invoice issuer tax identifier" },
  buyerName: { id: "credit.fraud.buyerName", defaultMessage: "Buyer name", description: "Invoice receiver name" },
  buyerTaxId: { id: "credit.fraud.buyerTaxId", defaultMessage: "Buyer tax ID", description: "Invoice receiver tax identifier" },
  currency: { id: "credit.fraud.currency", defaultMessage: "Invoice currency", description: "Currency of original invoice amounts" },
  scale: { id: "credit.fraud.scale", defaultMessage: "Minor-unit scale", description: "Scale of invoice integer amounts" },
  total: { id: "credit.fraud.total", defaultMessage: "Total including tax", description: "Original invoice total" },
  tax: { id: "credit.fraud.tax", defaultMessage: "Tax total", description: "Original invoice tax total" },
  lines: { id: "credit.fraud.lines", defaultMessage: "Invoice lines", description: "Invoice line items" },
  bill: { id: "credit.fraud.bill", defaultMessage: "This bill", description: "Bill face value included once" },
  tolerance: {
    id: "credit.fraud.tolerance",
    defaultMessage: "Invoice / bill tolerance: {result} · policy {bps} bps",
    description: "Governed amount consistency result and pinned tolerance",
  },
  pdf: { id: "credit.fraud.pdf", defaultMessage: "PDF / register consistency: {result}", description: "Governed PDF consistency result" },
  alternative: {
    id: "credit.fraud.alternative",
    defaultMessage: "No electronic invoice: alternative path, lower cap {cap}. This is not an adverse finding.",
    description: "Permitted non electronic invoice path",
  },
  checkedAt: { id: "credit.fraud.checkedAt", defaultMessage: "Register checked at {time}", description: "Register observation time" },
  exposure: {
    id: "credit.fraud.exposure",
    defaultMessage: "Counterparty exposure at this Mint",
    description: "Mint local counterparty concentration heading",
  },
  drawee: { id: "credit.fraud.drawee", defaultMessage: "Drawee / buyer", description: "Buyer exposure actor" },
  drawer: { id: "credit.fraud.drawer", defaultMessage: "Drawer / issuer", description: "Issuer exposure actor" },
  existing: { id: "credit.fraud.existing", defaultMessage: "Existing exposure", description: "Exposure before this bill" },
  projected: { id: "credit.fraud.projected", defaultMessage: "Including this bill", description: "Exposure inclusive of current bill" },
  cap: { id: "credit.fraud.cap", defaultMessage: "Policy cap", description: "Pinned counterparty cap" },
  headroom: { id: "credit.fraud.headroom", defaultMessage: "Headroom after this bill", description: "Signed cap less projected exposure" },
  coverage: {
    id: "credit.fraud.coverage",
    defaultMessage:
      "As of {date} · scanned {scanned}/{listed} quotes · scan limit {limit} · failures {failures}. This bill is counted once.",
    description: "Bounded scan coverage",
  },
  complete: {
    id: "credit.fraud.complete",
    defaultMessage: "Complete Mint-local scan",
    description: "Complete local coverage without a network wide claim",
  },
  incomplete: {
    id: "credit.fraud.incomplete",
    defaultMessage: "Incomplete scan · verification required. Exposure and headroom are provisional; no clearance is implied.",
    description: "Incomplete exposure scan must never show clear",
  },
  confirmation: { id: "credit.fraud.confirmation", defaultMessage: "Buyer confirmation", description: "Buyer confirmation panel heading" },
  required: {
    id: "credit.fraud.required",
    defaultMessage: "Required by policy above {threshold}",
    description: "Policy strictly above buyer confirmation threshold",
  },
  notRequired: {
    id: "credit.fraud.notRequired",
    defaultMessage: "Not required by policy for this bill · threshold above {threshold}",
    description: "Below or equal threshold still retaining any denial",
  },
  noHistory: {
    id: "credit.fraud.noHistory",
    defaultMessage: "No buyer confirmations recorded.",
    description: "Empty append only buyer confirmation history",
  },
  independent: {
    id: "credit.fraud.independent",
    defaultMessage: "Use an independent channel. An applicant-supplied contact is not allowed.",
    description: "Buyer contact independence requirement",
  },
  material: {
    id: "credit.fraud.material",
    defaultMessage:
      "Recording a confirmation creates a new snapshot and requires fresh review. A retained denial remains a hard gate even after a later confirmation.",
    description: "Buyer confirmation materiality and retained denial rule",
  },
  method: { id: "credit.fraud.method", defaultMessage: "Method", description: "Buyer contact method" },
  contactSource: { id: "credit.fraud.contactSource", defaultMessage: "Contact source", description: "Independent source of buyer contact" },
  reference: {
    id: "credit.fraud.reference",
    defaultMessage: "Contact reference",
    description: "Independent registry record URL or relationship reference",
  },
  outcome: { id: "credit.fraud.outcome", defaultMessage: "Outcome", description: "Buyer obligation confirmation result" },
  note: { id: "credit.fraud.note", defaultMessage: "Operator note", description: "Written account of buyer check" },
  performedAt: {
    id: "credit.fraud.performedAt",
    defaultMessage: "Performed at (local time)",
    description: "Actual check time in operator local timezone",
  },
  recordedAt: { id: "credit.fraud.recordedAt", defaultMessage: "Recorded at {time}", description: "Server recorded confirmation time" },
  save: { id: "credit.fraud.save", defaultMessage: "Record buyer confirmation", description: "Append buyer confirmation command" },
  saving: { id: "credit.fraud.saving", defaultMessage: "Recording and refreshing…", description: "Confirmation write in progress" },
  saved: {
    id: "credit.fraud.saved",
    defaultMessage: "Confirmation recorded. The case has been refreshed for review.",
    description: "Buyer confirmation saved and refreshed",
  },
  readOnly: {
    id: "credit.fraud.readOnly",
    defaultMessage: "Recording requires a current assessment and an authenticated operator capability.",
    description: "Fail closed historical or unauthenticated buyer check",
  },
  invalid: {
    id: "credit.fraud.invalid",
    defaultMessage: "Complete every field and enter a valid performance time that is not in the future.",
    description: "Buyer form validation error",
  },
  phone: { id: "credit.fraud.phone", defaultMessage: "Phone", description: "Buyer confirmation method phone" },
  email: { id: "credit.fraud.email", defaultMessage: "Email", description: "Buyer confirmation method email" },
  in_person: { id: "credit.fraud.inPerson", defaultMessage: "In person", description: "Buyer confirmation method in person" },
  registry: { id: "credit.fraud.registry", defaultMessage: "Registry", description: "Buyer confirmation method registry" },
  public_registry: {
    id: "credit.fraud.publicRegistry",
    defaultMessage: "Public registry",
    description: "Allowed independent contact source",
  },
  public_directory: {
    id: "credit.fraud.publicDirectory",
    defaultMessage: "Public directory",
    description: "Allowed independent contact source",
  },
  prior_relationship: {
    id: "credit.fraud.priorRelationship",
    defaultMessage: "Prior relationship",
    description: "Allowed independent contact source",
  },
  confirmed_obligation: { id: "credit.fraud.confirmed", defaultMessage: "Confirmed obligation", description: "Buyer confirms obligation" },
  denied_obligation: { id: "credit.fraud.denied", defaultMessage: "Denied obligation", description: "Buyer denies obligation" },
  unreachable: { id: "credit.fraud.unreachable", defaultMessage: "Unreachable", description: "Buyer unreachable means verification" },
  tax_authority_register: { id: "credit.fraud.sourceRegister", defaultMessage: "Register", description: "Invoice field source badge" },
  model_extraction: {
    id: "credit.fraud.sourceModel",
    defaultMessage: "Model extraction",
    description: "Invoice field source badge not independent verification",
  },
  applicant: { id: "credit.fraud.sourceApplicant", defaultMessage: "Applicant", description: "Invoice field source badge" },
  unconfirmed: { id: "credit.fraud.unconfirmed", defaultMessage: "Unconfirmed", description: "Evidence state" },
  applicant_confirmed: { id: "credit.fraud.applicantConfirmed", defaultMessage: "Applicant confirmed", description: "Evidence state" },
  corroborated: { id: "credit.fraud.corroborated", defaultMessage: "Corroborated", description: "Evidence state" },
  independently_verified: {
    id: "credit.fraud.verified",
    defaultMessage: "Independently verified",
    description: "Evidence state about a document field",
  },
  contradicted: { id: "credit.fraud.contradicted", defaultMessage: "Contradicted", description: "Evidence state" },
  not_verifiable: { id: "credit.fraud.notVerifiable", defaultMessage: "Not verifiable", description: "Evidence state" },
  stale: { id: "credit.fraud.stale", defaultMessage: "Stale", description: "Evidence state" },
  source_unavailable: {
    id: "credit.fraud.sourceUnavailable",
    defaultMessage: "Source unavailable · verification required",
    description: "Evidence and register unavailable state",
  },
  withdrawn: { id: "credit.fraud.withdrawn", defaultMessage: "Withdrawn", description: "Evidence state" },
  valid: { id: "credit.fraud.valid", defaultMessage: "Valid document", description: "Register valid status is document scoped" },
  cancelled: {
    id: "credit.fraud.cancelled",
    defaultMessage: "Cancelled invoice · hard gate; cannot be waived",
    description: "Register cancelled document hard gate",
  },
  not_found: {
    id: "credit.fraud.notFound",
    defaultMessage: "Document not found in register · verification required",
    description: "Register no match never adverse",
  },
  document_id_not_found: {
    id: "credit.fraud.idMissing",
    defaultMessage: "Document ID missing or ambiguous · verification required",
    description: "Governed identifier extraction hold",
  },
  not_applicable: {
    id: "credit.fraud.notApplicable",
    defaultMessage: "No electronic invoice",
    description: "Non electronic invoice status",
  },
  match: { id: "credit.fraud.match", defaultMessage: "Match", description: "Governed consistency match" },
  mismatch: {
    id: "credit.fraud.mismatch",
    defaultMessage: "Mismatch · verification required",
    description: "Governed consistency mismatch",
  },
  unknown: { id: "credit.fraud.unknown", defaultMessage: "Unknown · verification required", description: "Unresolved consistency" },
});

export const fraudReasonMessages = defineMessages({
  finance_lock_held_elsewhere: {
    id: "credit.fraud.gate.lockHeld",
    defaultMessage:
      "Finance lock held elsewhere · hard gate; operators cannot override it. The holding Mint must release the lock or it must expire before a fresh check can permit an offer.",
    description: "Non waivable finance lock gate and resolution",
  },
  finance_lock_check_incomplete: {
    id: "credit.fraud.gate.lockIncomplete",
    defaultMessage:
      "Finance lock check incomplete · verification required. Restore followed-relay reachability and retry; missing coverage never establishes clearance.",
    description: "Incomplete finance lock verification hold and retry",
  },
  invoice_cancelled_at_tax_authority: {
    id: "credit.fraud.gate.cancelled",
    defaultMessage: "Invoice cancelled at tax authority · hard gate; operators cannot waive it",
    description: "Cancelled invoice hard gate explanation",
  },
  tax_authority_document_not_found: {
    id: "credit.fraud.gate.notFound",
    defaultMessage: "Invoice not found in the synthetic register · verification required",
    description: "Register not found hold",
  },
  document_id_not_found: {
    id: "credit.fraud.gate.idMissing",
    defaultMessage: "Invoice document ID missing or ambiguous · verification required",
    description: "Governed document identifier hold",
  },
  tax_authority_check_unavailable: {
    id: "credit.fraud.gate.unavailable",
    defaultMessage: "Tax authority check unavailable · verification required",
    description: "Register unavailable hold",
  },
  invoice_bill_amount_mismatch: {
    id: "credit.fraud.gate.amount",
    defaultMessage: "Invoice and bill amounts exceed the policy FX tolerance · verification required",
    description: "Amount mismatch hold",
  },
  tax_authority_document_mismatch: {
    id: "credit.fraud.gate.pdf",
    defaultMessage: "Invoice PDF and register facts differ · verification required",
    description: "Document mismatch hold",
  },
  counterparty_exposure_above_policy_cap: {
    id: "credit.fraud.gate.exposure",
    defaultMessage: "Counterparty exposure exceeds the policy cap · hard gate; operators cannot waive it",
    description: "Counterparty exposure hard gate",
  },
  counterparty_exposure_within_policy_caps: {
    id: "credit.fraud.gate.within",
    defaultMessage: "Counterparty exposure within the pinned policy caps at this Mint",
    description: "Scoped exposure pass",
  },
  counterparty_exposure_check_incomplete: {
    id: "credit.fraud.gate.scan",
    defaultMessage: "Counterparty exposure scan incomplete · verification required",
    description: "Incomplete scan never clear",
  },
  buyer_confirmation_missing: {
    id: "credit.fraud.gate.confirmation",
    defaultMessage: "Buyer confirmation missing or buyer unreachable · verification required",
    description: "Buyer confirmation hold",
  },
  buyer_denied_obligation: {
    id: "credit.fraud.gate.denial",
    defaultMessage: "Buyer denied the obligation · hard gate; a later confirmation cannot erase a retained denial",
    description: "Retained buyer denial hard gate",
  },
  bill_sum_without_tax_document_above_policy_cap: {
    id: "credit.fraud.gate.alternative",
    defaultMessage: "Bill exceeds the lower cap for the alternative invoice path · hard gate; operators cannot waive it",
    description: "Alternative path cap hard gate",
  },
});

export function fraudReason(code: string, intl: IntlShape): string | undefined {
  const message = Object.entries(fraudReasonMessages).find(([key]) => key === code)?.[1];
  return message === undefined ? undefined : intl.formatMessage(message);
}
