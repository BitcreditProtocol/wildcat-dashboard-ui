import { Skeleton } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { CreditAssessmentCard } from "./CreditAssessmentCard";
import { useCreditAssessmentForBill } from "./use-credit-assessment";

/**
 * Slots the AI Credit assessment for this quote's bill into the quote view. Absent by design when
 * the local adapter holds no decision for the bill — most quotes have none, and a placeholder on
 * every one of them would be noise.
 */

const messages = defineMessages({
  absent: {
    id: "credit.quoteCard.absent",
    defaultMessage: "No AI Credit assessment for this bill.",
    description: "Shown when the adapter answered but has no decision for this bill",
  },
});

export function QuoteCreditAssessment({ billId }: { billId: string | undefined }) {
  const intl = useIntl();
  const { decisionCase, isLoading, isAbsent } = useCreditAssessmentForBill(billId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (decisionCase !== undefined) return <CreditAssessmentCard decisionCase={decisionCase} />;
  if (isAbsent) return <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.absent)}</p>;
  return null;
}
