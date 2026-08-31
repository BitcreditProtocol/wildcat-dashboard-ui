import { AppIcon, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@bitcredit/ui-library";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { CreditAssessmentCard } from "./CreditAssessmentCard";
import { operatorVisibleAxes } from "./decision-types";
import { useCreditAssessmentForBill } from "./use-credit-assessment";

/**
 * Slots the AI Credit assessment for this quote's bill into the quote view. Absent by design when
 * the local adapter holds no decision for the bill — most quotes have none, and a placeholder on
 * every one of them would be noise.
 */

const messages = defineMessages({
  loading: {
    id: "credit.quoteCard.loading",
    defaultMessage: "Loading assessment…",
    description: "Visible status while the deterministic assessment is loading",
  },
  unavailable: {
    id: "credit.quoteCard.unavailable",
    defaultMessage: "Assessment unavailable. Do not offer until it can be loaded.",
    description: "Fail-closed error when the deterministic assessment cannot be loaded",
  },
  absent: {
    id: "credit.quoteCard.absent",
    defaultMessage: "No AI Credit assessment for this bill.",
    description: "Shown when the adapter answered but has no decision for this bill",
  },
  fullAssessment: {
    id: "credit.quoteCard.fullAssessment",
    defaultMessage: "Risk details",
    description: "Collapsed heading for the detailed credit assessment below the summary",
  },
  checksPassed: {
    id: "credit.quoteCard.checksPassed",
    defaultMessage: "{passed}/{total} checks passed",
    description: "Compact risk-panel summary when every policy axis passes",
  },
  checksOpen: {
    id: "credit.quoteCard.checksOpen",
    defaultMessage: "{count, plural, one {# check needs attention} other {# checks need attention}} · {passed}/{total} passed",
    description: "Compact risk-panel summary when policy axes are not all passing",
  },
  show: {
    id: "credit.quoteCard.showDetails",
    defaultMessage: "Show details",
    description: "Action to expand the risk details card",
  },
  hide: {
    id: "credit.quoteCard.hideDetails",
    defaultMessage: "Hide details",
    description: "Action to collapse the risk details card",
  },
});

export function QuoteCreditAssessment({ billId, mintQuoteId }: { billId: string | undefined; mintQuoteId: string | undefined }) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
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
    const assessedAxes = operatorVisibleAxes(decisionCase.result.axes).filter((axis) => axis.status !== "not_assessed");
    const passed = assessedAxes.filter((axis) => axis.status === "pass").length;
    const total = assessedAxes.length;
    const attention = total - passed;
    const summary = intl.formatMessage(attention === 0 ? messages.checksPassed : messages.checksOpen, {
      count: attention,
      passed,
      total,
    });
    return (
      <Card id="full-governed-assessment" className="scroll-mt-4 print:hidden">
        <CardHeader className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 p-6 text-left"
            onClick={() => setIsExpanded((value) => !value)}
            aria-expanded={isExpanded}
          >
            <span className="min-w-0">
              <CardTitle>{intl.formatMessage(messages.fullAssessment)}</CardTitle>
              <span className="mt-1 block truncate text-sm text-muted-foreground">{summary}</span>
            </span>
            <span className="flex h-8 shrink-0 items-center gap-1 px-2 py-0">
              <span className="text-xs text-muted-foreground">{intl.formatMessage(isExpanded ? messages.hide : messages.show)}</span>
              {isExpanded ? <AppIcon icon={ChevronUp} size="sm" /> : <AppIcon icon={ChevronDown} size="sm" />}
            </span>
          </button>
        </CardHeader>
        {isExpanded && (
          <CardContent className="border-t border-border p-0">
            <CreditAssessmentCard decisionCase={decisionCase} />
          </CardContent>
        )}
      </Card>
    );
  }
  if (error === null && isAbsent) return <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.absent)}</p>;
  return (
    <p role="alert" className="rounded-lg border border-signal-alert/40 p-3 text-xs text-signal-alert">
      {intl.formatMessage(messages.unavailable)}
    </p>
  );
}
