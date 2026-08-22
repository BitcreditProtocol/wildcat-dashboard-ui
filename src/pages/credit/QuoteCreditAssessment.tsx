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
  loading: {
    id: "credit.quoteCard.loading",
    defaultMessage: "Loading governed credit assessment…",
    description: "Visible status while the deterministic assessment is loading",
  },
  unavailable: {
    id: "credit.quoteCard.unavailable",
    defaultMessage: "Governed credit assessment unavailable. Do not offer from this panel until it can be loaded.",
    description: "Fail-closed error when the deterministic assessment cannot be loaded",
  },
  absent: {
    id: "credit.quoteCard.absent",
    defaultMessage: "No AI Credit assessment for this bill.",
    description: "Shown when the adapter answered but has no decision for this bill",
  },
  fullAssessment: {
    id: "credit.quoteCard.fullAssessment",
    defaultMessage: "Full governed assessment",
    description: "Collapsed heading for the detailed governed credit assessment below the executive summary",
  },
});

export function QuoteCreditAssessment({
  billId,
  mintQuoteId,
  mintQuoteAmountSat,
}: {
  billId: string | undefined;
  mintQuoteId: string | undefined;
  mintQuoteAmountSat?: string;
}) {
  const intl = useIntl();
  const { decisionCase, isLoading, isAbsent, error } = useCreditAssessmentForBill(billId, mintQuoteId);

  if (isLoading) {
    return (
      <div role="status" className="flex flex-col gap-2 text-xs text-muted-foreground">
        <Skeleton className="h-24 rounded-lg" />
        <span>{intl.formatMessage(messages.loading)}</span>
      </div>
    );
  }
  if (error === null && decisionCase !== undefined) {
    return (
      <details id="full-governed-assessment" className="scroll-mt-4 rounded-lg border border-border print:hidden">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">{intl.formatMessage(messages.fullAssessment)}</summary>
        <div className="border-t border-border p-4">
          <CreditAssessmentCard decisionCase={decisionCase} mintQuoteAmountSat={mintQuoteAmountSat} />
        </div>
      </details>
    );
  }
  if (error === null && isAbsent) return <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.absent)}</p>;
  return (
    <p role="alert" className="rounded-lg border border-signal-alert/40 p-3 text-xs text-signal-alert">
      {intl.formatMessage(messages.unavailable)}
    </p>
  );
}
