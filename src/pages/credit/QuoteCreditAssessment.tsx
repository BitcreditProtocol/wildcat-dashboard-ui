import { AppIcon, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@bitcredit/ui-library";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { OperatorSubmittedCaseIssue } from "@bitcredit/ai-credit-shared";
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
  verificationRequired: {
    id: "credit.quoteCard.issue.title",
    defaultMessage: "Verification required",
    description: "Heading for a submitted credit case that was isolated before assessment",
  },
  issueAmbiguousQuote: {
    id: "credit.quoteCard.issue.ambiguousMintQuote",
    defaultMessage: "Quote conflict",
    description: "Reason label when the submitted application cannot be bound to one Mint quote",
  },
  issueQuoteInvalid: {
    id: "credit.quoteCard.issue.mintQuoteInvalid",
    defaultMessage: "Quote unreadable",
    description: "Reason label when the bound Mint quote is malformed",
  },
  issueQuoteChanged: {
    id: "credit.quoteCard.issue.mintQuoteChanged",
    defaultMessage: "Quote changed",
    description: "Reason label when the bound Mint quote changed after submission",
  },
  issueProgramInvalid: {
    id: "credit.quoteCard.issue.mintProgramInvalid",
    defaultMessage: "Credit program invalid",
    description: "Reason label when the Mint credit program cannot be verified",
  },
  issueMintEvidenceInvalid: {
    id: "credit.quoteCard.issue.mintCreditEvidenceInvalid",
    defaultMessage: "Mint evidence invalid",
    description: "Reason label when Mint-provided credit evidence cannot be verified",
  },
  issueBillMismatch: {
    id: "credit.quoteCard.issue.billStateMismatch",
    defaultMessage: "Bill state mismatch",
    description: "Reason label when the application and current bill state disagree",
  },
  issueHolderUnavailable: {
    id: "credit.quoteCard.issue.holderIdentityUnavailable",
    defaultMessage: "Holder identity unavailable",
    description: "Reason label when the current bill holder cannot be established",
  },
  issueLegacyAuthority: {
    id: "credit.quoteCard.issue.legacyAuthorityMissing",
    defaultMessage: "Applicant authority missing",
    description: "Reason label when a legacy submission has no current applicant authority binding",
  },
  issueEvidenceUnavailable: {
    id: "credit.quoteCard.issue.submittedEvidenceUnavailable",
    defaultMessage: "Evidence unavailable",
    description: "Reason label when submitted evidence cannot be loaded safely",
  },
  actionQuote: {
    id: "credit.quoteCard.issue.action.changedQuote",
    defaultMessage: "Ask the applicant to request current terms and resubmit.",
    description: "Next action when the submitted Mint quote changed",
  },
  actionResolveQuote: {
    id: "credit.quoteCard.issue.action.resolveQuote",
    defaultMessage: "Resolve the active quote, then rerun verification.",
    description: "Next action when the submission cannot be bound to one Mint quote",
  },
  actionRepairQuote: {
    id: "credit.quoteCard.issue.action.repairQuote",
    defaultMessage: "Correct the quote record, then rerun verification.",
    description: "Next action when the bound Mint quote is malformed",
  },
  actionProgram: {
    id: "credit.quoteCard.issue.action.program",
    defaultMessage: "Review the Mint credit program, then rerun verification.",
    description: "Next action for an invalid Mint credit program",
  },
  actionMintEvidence: {
    id: "credit.quoteCard.issue.action.mintEvidence",
    defaultMessage: "Correct the Mint evidence record, then rerun verification.",
    description: "Next action for invalid Mint-provided evidence",
  },
  actionBill: {
    id: "credit.quoteCard.issue.action.bill",
    defaultMessage: "Reconcile the current bill state before continuing.",
    description: "Next action for a bill state mismatch",
  },
  actionApplicant: {
    id: "credit.quoteCard.issue.action.applicant",
    defaultMessage: "Ask the applicant to reopen onboarding and resubmit.",
    description: "Next action when applicant authority cannot be established",
  },
  actionHolder: {
    id: "credit.quoteCard.issue.action.holder",
    defaultMessage: "Confirm the current holder, then ask the applicant to resubmit.",
    description: "Next action when the current bill holder cannot be established",
  },
  actionEvidence: {
    id: "credit.quoteCard.issue.action.evidence",
    defaultMessage: "Ask the applicant to resubmit the missing evidence.",
    description: "Next action when submitted evidence cannot be loaded",
  },
});

const issuePresentation: Record<OperatorSubmittedCaseIssue["reasonCode"], { label: keyof typeof messages; action: keyof typeof messages }> =
  {
    ambiguous_mint_quote: { label: "issueAmbiguousQuote", action: "actionResolveQuote" },
    mint_quote_invalid: { label: "issueQuoteInvalid", action: "actionRepairQuote" },
    mint_quote_changed: { label: "issueQuoteChanged", action: "actionQuote" },
    mint_program_invalid: { label: "issueProgramInvalid", action: "actionProgram" },
    mint_credit_evidence_invalid: { label: "issueMintEvidenceInvalid", action: "actionMintEvidence" },
    bill_state_mismatch: { label: "issueBillMismatch", action: "actionBill" },
    holder_identity_unavailable: { label: "issueHolderUnavailable", action: "actionHolder" },
    legacy_authority_missing: { label: "issueLegacyAuthority", action: "actionApplicant" },
    submitted_evidence_unavailable: { label: "issueEvidenceUnavailable", action: "actionEvidence" },
  };

export function QuoteCreditAssessment({ billId, mintQuoteId }: { billId: string | undefined; mintQuoteId: string | undefined }) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const { decisionCase, issue, isLoading, isAbsent, error } = useCreditAssessmentForBill(billId, mintQuoteId);

  if (isLoading) {
    return (
      <div role="status" className="flex flex-col gap-2 text-xs text-muted-foreground">
        <Skeleton className="h-24 rounded-lg" />
        <span>{intl.formatMessage(messages.loading)}</span>
      </div>
    );
  }
  if (error === null && issue !== undefined) {
    const presentation = issuePresentation[issue.reasonCode];
    return (
      <Card className="print:hidden" role="status">
        <CardContent className="grid gap-1.5 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-signal-pending">
              {intl.formatMessage(messages.verificationRequired)}
            </p>
            <p className="mt-1 font-medium">{intl.formatMessage(messages[presentation.label])}</p>
          </div>
          <p className="text-sm text-muted-foreground sm:self-center">{intl.formatMessage(messages[presentation.action])}</p>
        </CardContent>
      </Card>
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
