import { defineMessages, type IntlShape } from "react-intl";
import type { CaseBrief, CaseNextStep } from "./case-brief";
import { requestReason } from "./verification-reasons";
import { preparationReason } from "./case-preparation-copy";

const headlines = defineMessages({
  decide_offer: {
    id: "quotes.brief.headline.decideOffer",
    defaultMessage: "Ready for your decision",
    description: "Pending quote whose required checks passed and whose governed terms are current",
  },
  confirm_no_fit: {
    id: "quotes.summary.noFitCompact",
    defaultMessage: "No offer recommended",
    description: "Non-binding no-fit recommendation for the operator",
  },
  manual_review: {
    id: "quotes.summary.manualReviewCompact",
    defaultMessage: "Manual review required",
    description: "Current assessment needs an operator review",
  },
  preparation_attention: {
    id: "quotes.brief.headline.preparationAttention",
    defaultMessage: "Preparation needs attention",
    description: "Preparation has stopped or cannot complete; not a financial denial",
  },
  review_evidence: {
    id: "quotes.summary.reviewEvidenceQuestions",
    defaultMessage: "Evidence review needed",
    description: "Evidence work needs a reviewer before an offer can be sent",
  },
  decide_unresolved: {
    id: "quotes.brief.headline.evidenceUnavailable",
    defaultMessage: "Evidence unavailable",
    description: "Reviewed evidence questions ended without support; a preparation stop, not an adverse finding",
  },
  send_applicant_request: {
    id: "quotes.brief.headline.applicantInformation",
    defaultMessage: "Applicant information needed",
    description: "The case needs information that only the applicant can supply",
  },
  retry_sources: {
    id: "quotes.brief.headline.sourceCheck",
    defaultMessage: "Mint source check failed",
    description: "A Mint-owned or system source could not be read for this assessment",
  },
  respond_applicant_review: {
    id: "quotes.brief.headline.humanReview",
    defaultMessage: "Human review requested",
    description: "The applicant asked for a person to review the case",
  },
  wait_agent: {
    id: "quotes.brief.headline.answerReview",
    defaultMessage: "Answer review in progress",
    description: "An agent is reviewing applicant answers; not a credit decision",
  },
  wait_applicant: {
    id: "quotes.brief.headline.waitingApplicant",
    defaultMessage: "Waiting for the applicant",
    description: "The applicant owns the next step",
  },
  wait_mint_risk: {
    id: "quotes.brief.headline.mintRisk",
    defaultMessage: "Mint risk record missing",
    description: "The Mint has no current signed acceptor risk record for this payer",
  },
  wait_reassessment: {
    id: "quotes.brief.headline.historical",
    defaultMessage: "Assessment not current",
    description: "Only a retained assessment is available; decisions stay disabled",
  },
  not_actionable: {
    id: "quotes.brief.headline.programRequired",
    defaultMessage: "Credit program required",
    description: "The assessment lacks the Mint-owned quote-to-program binding",
  },
  terms_expired: {
    id: "quotes.summary.termsExpired",
    defaultMessage: "Terms expired",
    description: "Primary operator status when the prepared terms are no longer actionable",
  },
  closed: {
    id: "quotes.summary.unableToAssess",
    defaultMessage: "Unable to assess",
    description: "Primary operator status when unresolved evidence prevents a credit assessment without an adverse inference",
  },
} satisfies Record<CaseNextStep["kind"], { id: string; defaultMessage: string; description: string }>);

const reasons = defineMessages({
  checksPassed: {
    id: "quotes.brief.reason.checksPassed",
    defaultMessage: "All required checks passed. Terms valid through {date}.",
    description: "Why a pending quote is ready; the material uncertainty is shown with the case facts",
  },
  manualReview: {
    id: "quotes.brief.reason.manualReview",
    defaultMessage: "The assessment has no recommendation to act on. Check the calculation before deciding.",
    description: "Ready assessment without a recommendation",
  },
  noFit: {
    id: "quotes.brief.reason.noFit",
    defaultMessage: "The governed calculation found no compliant terms for this bill.",
    description: "Fallback reason for a no-fit recommendation",
  },
  repliesToReview: {
    id: "quotes.brief.reason.repliesToReview",
    defaultMessage:
      "{count, plural, one {# applicant reply has} other {# applicant replies have}} not been checked against the documents. Terms stay paused until each one is reviewed.",
    description: "Applicant replies are recorded but not reviewed; a preparation hold, not a credit denial",
  },
  evidenceUnavailable: {
    id: "quotes.brief.reason.evidenceUnavailable",
    defaultMessage:
      "{count, plural, one {# evidence question} other {# evidence questions}} ended without supporting evidence, so terms stay paused. This is not an adverse finding.",
    description: "Exhausted evidence questions keep the offer blocked without implying dishonesty",
  },
  outstanding: {
    id: "quotes.brief.reason.outstanding",
    defaultMessage: "Outstanding: {items}.",
    description: "Governed checks or questions that block terms, listed in plain words",
  },
  unansweredQuestions: {
    id: "quotes.brief.reason.unansweredQuestions",
    defaultMessage: "{count, plural, one {# evidence question without an answer} other {# evidence questions without an answer}}",
    description: "List item: evidence questions with no recorded applicant answer",
  },
  mintRisk: {
    id: "quotes.brief.reason.mintRisk",
    defaultMessage: "The Mint has no current default and loss estimate for the payer, {name}. Terms cannot be calculated without it.",
    description: "Missing Mint-owned acceptor risk record blocks the calculation",
  },
  humanReview: {
    id: "quotes.brief.reason.humanReview",
    defaultMessage: "The applicant asked for a person to review this case. Decisions wait until that review is complete.",
    description: "Applicant-requested human review pauses decisions",
  },
  answerReview: {
    id: "quotes.brief.reason.answerReview",
    defaultMessage: "An agent is reviewing the applicant's answers. Terms stay paused until it finishes.",
    description: "Running or queued answer review blocks an offer",
  },
  applicantAnswering: {
    id: "quotes.brief.reason.applicantAnswering",
    defaultMessage: "The applicant is answering the Mint's request. The case is reassessed when they submit.",
    description: "Active applicant clarification; nothing is verified until submission and review",
  },
  applicantAsked: {
    id: "quotes.brief.reason.applicantAsked",
    defaultMessage: "A question was sent to the applicant and has no reply yet.",
    description: "Recorded request with no applicant response",
  },
  historical: {
    id: "quotes.summary.historicalAssessment",
    defaultMessage: "Historical assessment · read-only",
    description: "Retained assessment is read-only; no reason for its historical status is inferred",
  },
  programRequired: {
    id: "quotes.actions.creditProgram.unavailable",
    defaultMessage: "A fresh Mint credit-program assignment is required before this quote can be acted on.",
    description: "Explanation shown when an older assessment lacks the Mint-owned quote-to-program binding",
  },
  expired: {
    id: "quotes.summary.expiredTermsCompact",
    defaultMessage: "Expired {date} · awaiting applicant request",
    description: "Expired terms require an applicant-initiated request",
  },
  closed: {
    id: "quotes.summary.unableToAssessCompact",
    defaultMessage: "Material evidence unavailable · no adverse finding",
    description: "Closed evidence-insufficient case distinguished from an adverse credit denial",
  },
});

/** Primary status for a pending quote with a governed case. */
export function caseHeadline(intl: IntlShape, brief: CaseBrief): string {
  // A no-fit recommendation still leads when only the program binding blocks acting on it.
  if (brief.next.kind === "not_actionable" && brief.next.noFit) return intl.formatMessage(headlines.confirm_no_fit);
  return intl.formatMessage(headlines[brief.next.kind]);
}

/** One case-specific sentence explaining the status. */
export function caseReason(intl: IntlShape, brief: CaseBrief, payerName: string): string {
  const { next, work } = brief;
  const outstanding = () => {
    const items = work.flatMap((item) => (item.kind === "verification" ? [requestReason(item, intl)] : []));
    const evidence = work.find((item) => item.kind === "evidence_review");
    if (evidence !== undefined && evidence.noReply > 0)
      items.push(intl.formatMessage(reasons.unansweredQuestions, { count: evidence.noReply }));
    return intl.formatMessage(reasons.outstanding, { items: intl.formatList([...new Set(items)], { type: "conjunction" }) });
  };
  switch (next.kind) {
    case "decide_offer":
      return [
        ...(brief.preparation?.status === "attention" ? brief.preparation.reasons.map((reason) => preparationReason(intl, reason)) : []),
        intl.formatMessage(reasons.checksPassed, { date: next.offerExpiresOn }),
      ].join(" ");
    case "confirm_no_fit":
      return intl.formatMessage(reasons.noFit);
    case "manual_review":
      return intl.formatMessage(reasons.manualReview);
    case "preparation_attention":
      return next.reasons.map((reason) => preparationReason(intl, reason)).join(" ");
    case "review_evidence":
      return intl.formatMessage(reasons.repliesToReview, { count: next.count });
    case "decide_unresolved":
      return intl.formatMessage(reasons.evidenceUnavailable, { count: next.count });
    case "send_applicant_request":
    case "retry_sources":
      return outstanding();
    case "wait_mint_risk":
      return work.some((item) => item.kind === "verification" && item.owner !== "mint_risk")
        ? outstanding()
        : intl.formatMessage(reasons.mintRisk, { name: payerName });
    case "respond_applicant_review":
      return intl.formatMessage(reasons.humanReview);
    case "wait_agent":
      return intl.formatMessage(reasons.answerReview);
    case "wait_applicant":
      return work.some((item) => item.kind === "applicant" && item.state === "answering")
        ? intl.formatMessage(reasons.applicantAnswering)
        : intl.formatMessage(reasons.applicantAsked);
    case "wait_reassessment":
      return intl.formatMessage(reasons.historical);
    case "not_actionable":
      return intl.formatMessage(reasons.programRequired);
    case "terms_expired":
      return intl.formatMessage(reasons.expired, { date: next.offerExpiresOn });
    case "closed":
      return intl.formatMessage(reasons.closed);
  }
}
