import { defineMessages } from "react-intl";
export const briefMessages = defineMessages({
  title: { id: "decisionBrief.title", defaultMessage: "Decision brief", description: "Operator dashboard decisionBrief: title" },
  recorded: {
    id: "decisionBrief.recorded",
    defaultMessage: "Recorded snapshot · {date}",
    description: "Operator dashboard decisionBrief: recorded",
  },
  noAssessment: {
    id: "decisionBrief.noAssessment",
    defaultMessage: "No governed assessment recorded. Checks below remain unknown.",
    description: "Operator dashboard decisionBrief: noAssessment",
  },
  historical: {
    id: "decisionBrief.historical",
    defaultMessage: "Historical assessment — refresh before any decision.",
    description: "Operator dashboard decisionBrief: historical",
  },
  amount: { id: "decisionBrief.amount", defaultMessage: "Bill face value", description: "Operator dashboard decisionBrief: amount" },
  tenor: { id: "decisionBrief.tenor", defaultMessage: "Time to maturity", description: "Operator dashboard decisionBrief: tenor" },
  days: {
    id: "decisionBrief.days",
    defaultMessage: "{count, plural, one {# day} other {# days}}",
    description: "Operator dashboard decisionBrief: days",
  },
  fee: { id: "decisionBrief.fee", defaultMessage: "Total fee", description: "Operator dashboard decisionBrief: fee" },
  net: { id: "decisionBrief.net", defaultMessage: "Applicant receives now", description: "Operator dashboard decisionBrief: net" },
  notPriced: {
    id: "decisionBrief.notPriced",
    defaultMessage: "No governed price",
    description: "Operator dashboard decisionBrief: notPriced",
  },
  checks: {
    id: "decisionBrief.checks",
    defaultMessage: "Hard gates · recorded results",
    description: "Operator dashboard decisionBrief: checks",
  },
  pass: { id: "decisionBrief.pass", defaultMessage: "Passed", description: "Operator dashboard decisionBrief: pass" },
  fail: { id: "decisionBrief.fail", defaultMessage: "Failed", description: "Operator dashboard decisionBrief: fail" },
  unknown: { id: "decisionBrief.unknown", defaultMessage: "Not established", description: "Operator dashboard decisionBrief: unknown" },
  components: {
    id: "decisionBrief.components",
    defaultMessage: "What makes the price",
    description: "Operator dashboard decisionBrief: components",
  },
  buyer: { id: "decisionBrief.buyer", defaultMessage: "Buyer confirmation", description: "Operator dashboard decisionBrief: buyer" },
  confirmed: {
    id: "decisionBrief.confirmed",
    defaultMessage: "Obligation confirmed",
    description: "Operator dashboard decisionBrief: confirmed",
  },
  denied: { id: "decisionBrief.denied", defaultMessage: "Obligation denied", description: "Operator dashboard decisionBrief: denied" },
  unreachable: {
    id: "decisionBrief.unreachable",
    defaultMessage: "Buyer unreachable",
    description: "Operator dashboard decisionBrief: unreachable",
  },
  required: {
    id: "decisionBrief.required",
    defaultMessage: "Confirmation due · independent contact required",
    description: "Operator dashboard decisionBrief: required",
  },
  notRequired: {
    id: "decisionBrief.notRequired",
    defaultMessage: "Below this policy’s confirmation threshold",
    description: "Operator dashboard decisionBrief: notRequired",
  },
  intelligence: {
    id: "decisionBrief.intelligence",
    defaultMessage: "Intelligence for this decision",
    description: "Operator dashboard decisionBrief: intelligence",
  },
  noNotes: {
    id: "decisionBrief.noNotes",
    defaultMessage: "No matched notes in the observed catalogue.",
    description: "Operator dashboard decisionBrief: noNotes",
  },
  notesUnknown: {
    id: "decisionBrief.notesUnknown",
    defaultMessage: "Intelligence unavailable; no empty result is implied.",
    description: "Operator dashboard decisionBrief: notesUnknown",
  },
  dates: {
    id: "decisionBrief.dates",
    defaultMessage: "Authored {authored} · review by {review}",
    description: "Operator dashboard decisionBrief: dates",
  },
  undated: { id: "decisionBrief.undated", defaultMessage: "not set", description: "Operator dashboard decisionBrief: undated" },
  stale: { id: "decisionBrief.stale", defaultMessage: "Review overdue", description: "Operator dashboard decisionBrief: stale" },
  directory: {
    id: "decisionBrief.directory",
    defaultMessage: "Directory look-alikes",
    description: "Operator dashboard decisionBrief: directory",
  },
  noMatches: {
    id: "decisionBrief.noMatches",
    defaultMessage: "No look-alikes in the observed directory.",
    description: "Operator dashboard decisionBrief: noMatches",
  },
  directoryUnknown: {
    id: "decisionBrief.directoryUnknown",
    defaultMessage: "Directory unavailable or incomplete — no clearance implied.",
    description: "Operator dashboard decisionBrief: directoryUnknown",
  },
  context: {
    id: "decisionBrief.context",
    defaultMessage: "Notes and matches inform human review; they change no rule.",
    description: "Operator dashboard decisionBrief: context",
  },
  contextFull: {
    id: "decisionBrief.contextFull",
    defaultMessage:
      "Mint Intelligence is dated context, never pricing, gates or authorization input. Directory listings are their authors’ statements and coverage is local and partial. A look-alike is a reason to ask, never a finding. Gate labels reflect only the recorded governed result, not a new assessment. Missing or unresolved checks remain unknown. The operator decides within policy bounds; no hard gate can be waived.",
    description: "Operator dashboard decisionBrief: contextFull",
  },
  openCaseChat: {
    id: "decisionBrief.caseChat",
    defaultMessage: "Ask about this case",
    description: "Operator dashboard decisionBrief: caseChat",
  },
  funding: { id: "decisionBrief.funding", defaultMessage: "Cost of funds", description: "Operator dashboard decisionBrief: funding" },
  payerRisk: {
    id: "decisionBrief.payerRisk",
    defaultMessage: "Payer expected loss",
    description: "Operator dashboard decisionBrief: payerRisk",
  },
  uncertainty: {
    id: "decisionBrief.uncertainty",
    defaultMessage: "Uncertainty margin",
    description: "Operator dashboard decisionBrief: uncertainty",
  },
  mintReturn: {
    id: "decisionBrief.mintReturn",
    defaultMessage: "Mint return",
    description: "Operator dashboard decisionBrief: mintReturn",
  },
  subsidy: { id: "decisionBrief.subsidy", defaultMessage: "Subsidy", description: "Operator dashboard decisionBrief: subsidy" },
  operating: {
    id: "decisionBrief.operating",
    defaultMessage: "Operating cost",
    description: "Operator dashboard decisionBrief: operating",
  },
  bill_already_financed: {
    id: "decisionBrief.gate.alreadyFinanced",
    defaultMessage: "Already-financed bill",
    description: "Operator dashboard decisionBrief: gate alreadyFinanced",
  },
  finance_lock_held_elsewhere: {
    id: "decisionBrief.gate.financeLock",
    defaultMessage: "Finance lock at another Mint",
    description: "Operator dashboard decisionBrief: gate financeLock",
  },
  bill_not_accepted: {
    id: "decisionBrief.gate.acceptance",
    defaultMessage: "Accepted bill",
    description: "Operator dashboard decisionBrief: gate acceptance",
  },
  tenor_outside_policy: {
    id: "decisionBrief.gate.tenor",
    defaultMessage: "Maturity within policy",
    description: "Operator dashboard decisionBrief: gate tenor",
  },
  bill_sum_above_policy_cap: {
    id: "decisionBrief.gate.amount",
    defaultMessage: "Bill amount within cap",
    description: "Operator dashboard decisionBrief: gate amount",
  },
  invoice_commercially_implausible: {
    id: "decisionBrief.gate.plausibility",
    defaultMessage: "Trade plausibility",
    description: "Operator dashboard decisionBrief: gate plausibility",
  },
  invoice_cancelled_at_tax_authority: {
    id: "decisionBrief.gate.cancelled",
    defaultMessage: "Tax-authority cancellation",
    description: "Operator dashboard decisionBrief: gate cancelled",
  },
  counterparty_exposure_above_policy_cap: {
    id: "decisionBrief.gate.exposure",
    defaultMessage: "Counterparty exposure caps",
    description: "Operator dashboard decisionBrief: gate exposure",
  },
  buyer_denied_obligation: {
    id: "decisionBrief.gate.buyer",
    defaultMessage: "Buyer has not denied obligation",
    description: "Operator dashboard decisionBrief: gate buyer",
  },
  bill_sum_without_tax_document_above_policy_cap: {
    id: "decisionBrief.gate.alternative",
    defaultMessage: "Alternative-evidence cap",
    description: "Operator dashboard decisionBrief: gate alternative",
  },
});
