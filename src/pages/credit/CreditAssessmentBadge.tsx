import { Badge } from "@/components/ui/badge";
import { defineMessages, useIntl } from "react-intl";
import { useCreditAssessmentForBill } from "./use-credit-assessment";

/**
 * The AI Credit outcome for a bill, compact enough for a quote list row. Absent when the local
 * adapter holds no decision for the bill, so quotes that were never assessed look exactly as they
 * did before. Triage only: the reasoning lives on the quote itself.
 */

const messages = defineMessages({
  verification: {
    id: "credit.badge.verification",
    defaultMessage: "AI Credit: verify",
    description: "List-row badge when the assessment is blocked pending verification",
  },
  offer: {
    id: "credit.badge.offer",
    defaultMessage: "AI Credit: offer available",
    description: "List-row badge when governed code can offer",
  },
  noFit: {
    id: "credit.badge.noFit",
    defaultMessage: "AI Credit: no fit",
    description: "List-row badge when policy produced no terms",
  },
  unknown: {
    id: "credit.badge.unknown",
    defaultMessage: "AI Credit: unreadable",
    description: "List-row badge when the payload does not match this build",
  },
});

export function CreditAssessmentBadge({ billId, mintQuoteId }: { billId: string | undefined; mintQuoteId: string | undefined }) {
  const intl = useIntl();
  const { decisionCase } = useCreditAssessmentForBill(billId, mintQuoteId);
  if (decisionCase === undefined) return null;

  const { result } = decisionCase;
  if (result.assessmentStatus === "blocked_pending_verification") {
    return <Badge variant="pending">{intl.formatMessage(messages.verification)}</Badge>;
  }
  if (result.recommendation === "offer_available") {
    return <Badge variant="success">{intl.formatMessage(messages.offer)}</Badge>;
  }
  // An outcome this build cannot read must never read as a refusal.
  if (result.recommendation !== "no_current_product_fit") {
    return <Badge variant="destructive">{intl.formatMessage(messages.unknown)}</Badge>;
  }
  return <Badge variant="secondary">{intl.formatMessage(messages.noFit)}</Badge>;
}
