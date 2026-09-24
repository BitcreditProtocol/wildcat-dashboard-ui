import type { InformationNeed, InterviewInformationNeed } from "@bitcredit/ai-credit-shared";
import { defineMessages } from "react-intl";

/** One status vocabulary for the Review form and the read-only Case history. */
export const informationNeedStatusMessages = defineMessages({
  open: {
    id: "credit.needs.status.noResponse",
    defaultMessage: "Response not recorded",
    description: "No applicant answer and no current evidence review; do not invent an answer",
  },
  answered: {
    id: "credit.needs.status.pendingReview",
    defaultMessage: "Evidence review pending",
    description: "Applicant reply does not prove the claim or resolve the question",
  },
  earlierSubmission: {
    id: "credit.needs.status.earlierUnresolved",
    defaultMessage: "Earlier · unresolved",
    description: "An unresolved evidence concern retained from an earlier applicant submission",
  },
  resolved: {
    id: "credit.needs.status.reviewed",
    defaultMessage: "Evidence reviewed",
    description: "Human-reviewed support, not independent truth",
  },
  exhausted: {
    id: "credit.needs.status.unresolved",
    defaultMessage: "Unresolved",
    description: "Review ended without resolving the evidence gap, not an adverse credit decision",
  },
  stale: {
    id: "credit.needs.status.recheck",
    defaultMessage: "Recheck required",
    description: "Previous evidence review is no longer current",
  },
});

/** Labels for answer-review proposal objectives; source-bound proposals, not confirmed findings. */
export const investigationNeedKindMessages = defineMessages({
  answer_difference: {
    id: "credit.followUps.kind.answerDifference",
    defaultMessage: "Clarify differing answers",
    description: "Source-bound proposed objective, not confirmed inconsistency",
  },
  repayment_timing: {
    id: "credit.followUps.kind.repaymentTiming",
    defaultMessage: "Support repayment timing",
    description: "Proposed repayment timing question",
  },
  cost_breakdown: {
    id: "credit.followUps.kind.costBreakdown",
    defaultMessage: "Support the cost breakdown",
    description: "Proposed spending evidence question",
  },
  sales_evidence: {
    id: "credit.followUps.kind.salesEvidence",
    defaultMessage: "Support expected sales",
    description: "Proposed sales evidence question",
  },
} satisfies Record<InterviewInformationNeed["kind"], { id: string; defaultMessage: string; description: string }>);

export function informationNeedStatusMessage(need: Pick<InformationNeed, "reviewIsStale" | "status" | "response">) {
  return need.reviewIsStale
    ? informationNeedStatusMessages.stale
    : need.status === "resolved"
      ? informationNeedStatusMessages.resolved
      : need.status === "exhausted"
        ? informationNeedStatusMessages.exhausted
        : need.response === undefined
          ? informationNeedStatusMessages.open
          : informationNeedStatusMessages.answered;
}
