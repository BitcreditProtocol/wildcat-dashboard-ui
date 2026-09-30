import type { CaseNextStep } from "@bitcredit/ai-credit-shared";
import { defineMessages, type IntlShape } from "react-intl";
import type { DecisionCase } from "./decision-types";

type Preparation = NonNullable<DecisionCase["casePreparation"]>;
const reasons = defineMessages({
  awaiting_applicant_reply: { id: "credit.preparation.awaitingReply", defaultMessage: "Waiting for the applicant's reply." },
  applicant_answering: { id: "credit.preparation.answering", defaultMessage: "The applicant is answering." },
  agent_review_queued: { id: "credit.preparation.queued", defaultMessage: "Agent review is queued." },
  agent_review_running: { id: "credit.preparation.running", defaultMessage: "An agent is assessing the answers and evidence." },
  agent_review_failed: { id: "credit.preparation.failed", defaultMessage: "Agent review failed. The case is not ready for a decision." },
  agent_review_missing: { id: "credit.preparation.missing", defaultMessage: "The current application has not been reviewed by an agent." },
  agent_review_limit_reached: { id: "credit.preparation.reviewLimit", defaultMessage: "The case reached its agent-review limit." },
  agent_review_not_configured: { id: "credit.preparation.notConfigured", defaultMessage: "Agent review is not configured for this case." },
  agent_request_pending: {
    id: "credit.preparation.requestPending",
    defaultMessage: "The agents are preparing the next applicant request.",
  },
  automatic_request_budget_exhausted: {
    id: "credit.preparation.budgetExhausted",
    defaultMessage: "Automatic follow-ups reached their limit. Remaining gaps are shown below.",
  },
  automatic_requests_not_consented: {
    id: "credit.preparation.noConsent",
    defaultMessage: "This application has no consent for automatic follow-ups.",
  },
  legacy_consent_one_question: {
    id: "credit.preparation.legacyConsent",
    defaultMessage: "This older application allows only one automatic follow-up.",
  },
  automatic_requests_disabled: { id: "credit.preparation.disabled", defaultMessage: "Automatic follow-ups are disabled for this case." },
  contradiction_needs_operator: {
    id: "credit.preparation.contradiction",
    defaultMessage: "The agent flagged a possible difference between answers. Review the remaining uncertainty.",
  },
  applicant_verification_unresolved: {
    id: "credit.preparation.applicantGate",
    defaultMessage: "Required applicant evidence is still missing.",
  },
  applicant_reported_unavailable: {
    id: "credit.preparation.unavailableEvidence",
    defaultMessage: "The applicant reported that some evidence is unavailable. This remains an uncertainty, not verification.",
  },
  mint_verification_required: { id: "credit.preparation.mintGate", defaultMessage: "A required Mint-owned check is outstanding." },
  reassessment_pending: { id: "credit.preparation.reassessment", defaultMessage: "The updated application is being assessed." },
  operator_decision_recorded: { id: "credit.preparation.decided", defaultMessage: "The operator's decision is recorded." },
  no_further_eligible_work: {
    id: "credit.preparation.prepared",
    defaultMessage: "Agent preparation is complete. Review the case and proposed terms.",
  },
} satisfies Record<Preparation["reasons"][number], { id: string; defaultMessage: string }>);

const finished = defineMessages({
  termsExpired: {
    id: "credit.preparation.preparedTermsExpired",
    defaultMessage:
      "Agent preparation is complete, but the proposed terms expired on {date}. New terms need a new request from the applicant.",
    description: "Preparation finished; the terms it prepared lapsed and cannot be approved",
  },
  notDecidable: {
    id: "credit.preparation.preparedNotDecidable",
    defaultMessage: "Agent preparation is complete. Approval is not available; see the next step for what remains.",
    description: "Preparation finished, but the case's current next step is not an offer decision",
  },
});

/**
 * With `next`, finished preparation invites a review of terms only when they can be decided now.
 * Without it (the brief's own reasons), the reason copy is unchanged.
 */
export function preparationReason(intl: IntlShape, reason: Preparation["reasons"][number], next?: CaseNextStep): string {
  if (reason === "no_further_eligible_work" && next !== undefined && next.kind !== "decide_offer") {
    return next.kind === "terms_expired"
      ? intl.formatMessage(finished.termsExpired, { date: next.offerExpiresOn })
      : intl.formatMessage(finished.notDecidable);
  }
  return intl.formatMessage(reasons[reason]);
}
