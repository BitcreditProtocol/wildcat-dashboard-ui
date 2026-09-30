import { Badge } from "@/components/ui/badge";
import { caseNextStep, caseNextStepOwner } from "@bitcredit/ai-credit-shared";
import { defineMessages, useIntl } from "react-intl";
import { useCreditAssessmentForBill } from "./use-credit-assessment";
import { casePreparationBlocksDecision } from "./evidence-review-readiness";
import { isEvidenceInsufficientClosure } from "./decision-types";

/**
 * The AI Credit outcome for a bill, compact enough for a quote list row. Absent when the local
 * adapter holds no decision for the bill, so quotes that were never assessed look exactly as they
 * did before. Triage only: the reasoning lives on the quote itself.
 */

const messages = defineMessages({
  verification: {
    id: "credit.badge.verification",
    defaultMessage: "Verification required",
    description: "List-row badge when the assessment is blocked pending verification",
  },
  offer: {
    id: "credit.badge.offer",
    defaultMessage: "Ready for decision",
    description: "List-row badge when governed code can offer",
  },
  termsExpired: {
    id: "credit.badge.termsExpired",
    defaultMessage: "Terms expired",
    description: "List-row badge when the prepared terms lapsed; not approvable and not a denial",
  },
  attention: {
    id: "credit.badge.attention",
    defaultMessage: "Needs your attention",
    description: "List-row badge when terms exist but the operator must act before the case can be approved",
  },
  approvalUnavailable: {
    id: "credit.badge.approvalUnavailable",
    defaultMessage: "Approval unavailable",
    description: "Neutral list-row badge when terms exist but approval is unavailable and no operator action is required",
  },
  noFit: {
    id: "credit.badge.noFit",
    defaultMessage: "No product fit",
    description: "List-row badge when policy produced no terms",
  },
  unableToAssess: {
    id: "credit.badge.unableToAssess",
    defaultMessage: "Unable to assess",
    description: "List-row outcome when unresolved evidence closed the quote without an adverse credit finding",
  },
  unknown: {
    id: "credit.badge.unknown",
    defaultMessage: "Assessment unavailable",
    description: "List-row badge when the payload does not match this build",
  },
  pending: { id: "quote.status.Pending", defaultMessage: "Pending" },
  preparing: { id: "credit.badge.preparing", defaultMessage: "Agents preparing case" },
  awaitingApplicant: { id: "credit.badge.awaitingApplicant", defaultMessage: "Waiting for applicant" },
});

export function CreditAssessmentBadge({
  billId,
  mintQuoteId,
  quoteStatus = "Pending",
}: {
  billId: string | undefined;
  mintQuoteId: string | undefined;
  quoteStatus?: "Pending" | "Denied";
}) {
  const intl = useIntl();
  const assessment = useCreditAssessmentForBill(billId, mintQuoteId);
  const { decisionCase } = assessment;

  if (quoteStatus === "Denied") {
    return isEvidenceInsufficientClosure(decisionCase) ? (
      <Badge variant="secondary">{intl.formatMessage(messages.unableToAssess)}</Badge>
    ) : (
      <Badge variant="destructive">{intl.formatMessage({ id: "quote.status.Denied", defaultMessage: "Denied" })}</Badge>
    );
  }

  if (assessment.status === "isolated") return <Badge variant="pending">{intl.formatMessage(messages.verification)}</Badge>;
  if (decisionCase === undefined) return <Badge variant="default">{intl.formatMessage(messages.pending)}</Badge>;
  if (decisionCase.assessmentCurrency !== "current")
    return (
      <Badge variant="pending">
        {intl.formatMessage({
          id: "credit.assessment.historicalAssessment",
          defaultMessage: "Historical assessment · read-only",
          description: "Status for a retained assessment that cannot authorize operator actions, without inferring why it is historical",
        })}
      </Badge>
    );

  const { result } = decisionCase;
  const preparing = <Badge variant="pending">{intl.formatMessage(messages.preparing)}</Badge>;
  const awaitingApplicant = <Badge variant="pending">{intl.formatMessage(messages.awaitingApplicant)}</Badge>;
  if (decisionCase.casePreparation?.status === "preparing") return preparing;
  if (decisionCase.casePreparation?.status === "awaiting_applicant") return awaitingApplicant;
  if (result.assessmentStatus === "blocked_pending_verification" || casePreparationBlocksDecision(decisionCase)) {
    return <Badge variant="pending">{intl.formatMessage(messages.verification)}</Badge>;
  }
  if (result.recommendation === "offer_available") {
    // The detail page's time-aware next step decides; prepared terms alone are not readiness.
    const next = caseNextStep(decisionCase, { quoteId: mintQuoteId ?? null, now: Date.now() });
    if (next.kind === "decide_offer") return <Badge variant="success">{intl.formatMessage(messages.offer)}</Badge>;
    if (next.kind === "terms_expired") return <Badge variant="secondary">{intl.formatMessage(messages.termsExpired)}</Badge>;
    if (next.kind === "wait_agent") return preparing;
    if (next.kind === "wait_applicant") return awaitingApplicant;
    if (next.kind === "retry_sources" || next.kind === "wait_mint_risk")
      return <Badge variant="pending">{intl.formatMessage(messages.verification)}</Badge>;
    // Ask for attention only when the operator owns the step; otherwise approval is simply unavailable.
    return caseNextStepOwner(next) === "operator" ? (
      <Badge variant="pending">{intl.formatMessage(messages.attention)}</Badge>
    ) : (
      <Badge variant="secondary">{intl.formatMessage(messages.approvalUnavailable)}</Badge>
    );
  }
  // An outcome this build cannot read must never read as a refusal.
  if (result.recommendation !== "no_current_product_fit") {
    return <Badge variant="destructive">{intl.formatMessage(messages.unknown)}</Badge>;
  }
  return <Badge variant="secondary">{intl.formatMessage(messages.noFit)}</Badge>;
}
