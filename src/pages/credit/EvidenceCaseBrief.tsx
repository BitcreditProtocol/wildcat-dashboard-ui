import { ChevronRight, CircleAlert, CircleCheck, CircleHelp } from "lucide-react";
import { defineMessages, type IntlShape, useIntl } from "react-intl";
import {
  axisLabels,
  displayEvidenceLabel,
  words,
  type DecisionCase,
  type SubmittedEvidence,
  type VerificationRequest,
} from "./decision-types";

export interface EvidenceCaseSummary {
  answerReviewFollowUpCount?: number;
  snapshot: Pick<DecisionCase["snapshot"], "confirmedClaims" | "contradictions" | "bill" | "invoice">;
  assessmentStatus: DecisionCase["result"]["assessmentStatus"];
  recommendation: DecisionCase["result"]["recommendation"];
  assessmentHistory?: readonly {
    snapshot: Pick<DecisionCase["snapshot"], "invoice">;
    result: Pick<DecisionCase["result"], "verificationRequests">;
    submittedEvidence?: readonly SubmittedEvidence[];
  }[];
}

const messages = defineMessages({
  title: {
    id: "credit.evidenceBrief.title",
    defaultMessage: "Claim coverage",
    description: "Heading for the operator-facing map of case claims to their evidence",
  },
  claim: { id: "credit.evidenceBrief.claim", defaultMessage: "Claim", description: "Claim column in the evidence coverage table" },
  value: { id: "credit.evidenceBrief.value", defaultMessage: "Case value", description: "Value column in the evidence coverage table" },
  source: { id: "credit.evidenceBrief.source", defaultMessage: "Basis", description: "Evidence basis column in the coverage table" },
  conclusion: {
    id: "credit.evidenceBrief.conclusion",
    defaultMessage: "Conclusion",
    description: "Conclusion column in the evidence coverage table",
  },
  acceptedBill: {
    id: "credit.evidenceBrief.acceptedBill",
    defaultMessage: "Accepted eBill",
    description: "Claim label for the accepted electronic bill",
  },
  underlyingTrade: {
    id: "credit.evidenceBrief.underlyingTrade",
    defaultMessage: "Underlying trade",
    description: "Claim label for the invoice-described trade",
  },
  useOfFunds: {
    id: "credit.evidenceBrief.useOfFunds",
    defaultMessage: "Use of proceeds",
    description: "Claim label for the applicant's use of proceeds",
  },
  repaymentSource: {
    id: "credit.evidenceBrief.repaymentSource",
    defaultMessage: "Repayment source",
    description: "Claim label for the applicant's repayment source",
  },
  contradictions: {
    id: "credit.evidenceBrief.contradictions",
    defaultMessage: "Deterministic conflicts",
    description: "Claim label for deterministic contradiction checks",
  },
  protocolRecord: {
    id: "credit.evidenceBrief.protocolRecord",
    defaultMessage: "eBill protocol record",
    description: "Evidence basis for protocol-established eBill facts",
  },
  invoiceDocument: {
    id: "credit.evidenceBrief.invoiceDocument",
    defaultMessage: "Submitted invoice",
    description: "Fallback evidence basis when the submitted invoice label is unavailable",
  },
  applicantAnswers: {
    id: "credit.evidenceBrief.applicantAnswers",
    defaultMessage: "Applicant answers",
    description: "Evidence basis for claims stated by the applicant",
  },
  deterministicChecks: {
    id: "credit.evidenceBrief.deterministicChecks",
    defaultMessage: "Deterministic case checks",
    description: "Evidence basis for contradiction checks performed by deterministic code",
  },
  noInvoice: {
    id: "credit.evidenceBrief.noInvoice",
    defaultMessage: "No invoice",
    description: "Case value when no invoice evidence is available",
  },
  noBill: {
    id: "credit.evidenceBrief.noBill",
    defaultMessage: "No accepted bill",
    description: "Case value when no accepted eBill is available",
  },
  noContradictions: {
    id: "credit.evidenceBrief.noContradictions",
    defaultMessage: "No conflict recorded by deterministic checks",
    description: "Absence of a recorded deterministic conflict does not establish that applicant explanations are resolved",
  },
  protocolFact: {
    id: "credit.evidenceBrief.protocolFact",
    defaultMessage: "Protocol fact",
    description: "Conclusion for a fact established by the eBill protocol state",
  },
  notAccepted: {
    id: "credit.evidenceBrief.notAccepted",
    defaultMessage: "Not accepted",
    description: "Conclusion when the eBill has not reached an accepted state",
  },
  supported: {
    id: "credit.evidenceBrief.supported",
    defaultMessage: "Applicant document consistent",
    description: "Conclusion for a claim consistent with an applicant document without asserting independent verification",
  },
  conflict: {
    id: "credit.evidenceBrief.conflict",
    defaultMessage: "Conflict",
    description: "Conclusion for evidence that conflicts with governed case facts",
  },
  reviewRequired: {
    id: "credit.evidenceBrief.reviewRequired",
    defaultMessage: "Review required",
    description: "Conclusion for evidence that has not completed governed review",
  },
  applicantStatement: {
    id: "credit.evidenceBrief.applicantStatement",
    defaultMessage: "Applicant statement",
    description: "Conclusion for a claim stated by the applicant but not independently verified",
  },
  clear: {
    id: "credit.evidenceBrief.clear",
    defaultMessage: "None recorded",
    description: "Conclusion for deterministic checks without a current recorded conflict",
  },
  open: {
    id: "credit.evidenceBrief.open",
    defaultMessage: "Open",
    description: "Conclusion for an unresolved contradiction",
  },
  answerReview: {
    id: "credit.evidenceBrief.answerReview",
    defaultMessage: "Answer review",
    description: "Model-directed follow-up questions, separate from deterministic checks",
  },
  followUpCount: {
    id: "credit.evidenceBrief.followUpCount",
    defaultMessage: "{count, plural, one {# targeted follow-up} other {# targeted follow-ups}}",
    description: "Number of recorded follow-up questions without implying successful resolution",
  },
  interviewerReview: {
    id: "credit.evidenceBrief.interviewerReview",
    defaultMessage: "Interview record",
    description: "Follow-up question provenance",
  },
  unresolvedReview: {
    id: "credit.evidenceBrief.unresolvedReview",
    defaultMessage: "Resolution not independently checked",
    description: "An applicant answer does not independently resolve the concern behind a follow-up",
  },
  nextRequest: {
    id: "credit.evidenceBrief.nextRequest",
    defaultMessage: "Next evidence request",
    description: "Heading for the next unresolved evidence request",
  },
  allApplicantChecksComplete: {
    id: "credit.evidenceBrief.allApplicantChecksComplete",
    defaultMessage: "Applicant loop complete",
    description: "State when there is no open applicant-owned evidence request",
  },
  mintWorkPending: {
    id: "credit.evidenceBrief.mintWorkPending",
    defaultMessage: "Mint-side check pending",
    description: "State when the open verification work belongs to the Mint rather than the applicant",
  },
  readyToRequest: {
    id: "credit.evidenceBrief.readyToRequest",
    defaultMessage: "Ready for operator",
    description: "State when an evidence request is ready for the operator to send",
  },
  awaitingApplicant: {
    id: "credit.evidenceBrief.awaitingApplicant",
    defaultMessage: "Awaiting applicant",
    description: "State after an evidence request was recorded and the case awaits the applicant",
  },
  historicalPolicy: {
    id: "credit.evidenceBrief.historicalPolicy",
    defaultMessage: "Historical assessment · read-only",
    description: "Retained evidence requests are read-only; no historical cause is inferred",
  },
  needed: {
    id: "credit.evidenceBrief.needed",
    defaultMessage: "Needed",
    description: "Label for the evidence or correction being requested",
  },
  why: {
    id: "credit.evidenceBrief.why",
    defaultMessage: "Why",
    description: "Label for the governed reason behind an evidence request",
  },
  response: {
    id: "credit.evidenceBrief.response",
    defaultMessage: "Accepted response",
    description: "Label for the response types supported by the current applicant loop",
  },
  applicantResponse: {
    id: "credit.evidenceBrief.applicantResponse",
    defaultMessage: "Correct answers · upload supporting document",
    description: "Available response types in the governed applicant clarification flow",
  },
  mintResponse: {
    id: "credit.evidenceBrief.mintResponse",
    defaultMessage: "No applicant action",
    description: "Response value when the open check belongs to the Mint",
  },
  channel: {
    id: "credit.evidenceBrief.channel",
    defaultMessage: "Channel",
    description: "Label for the product channel used by an evidence request",
  },
  ebillChannel: {
    id: "credit.evidenceBrief.ebillChannel",
    defaultMessage: "eBill notification and application",
    description: "Channel used for the governed applicant clarification loop",
  },
  internalChannel: {
    id: "credit.evidenceBrief.internalChannel",
    defaultMessage: "Mint operations",
    description: "Channel used for Mint-owned verification work",
  },
  moreRequests: {
    id: "credit.evidenceBrief.moreRequests",
    defaultMessage: "+{count} more",
    description: "Count of additional evidence requests after the next request",
  },
  reasonBillMissing: {
    id: "credit.evidenceBrief.reason.billMissing",
    defaultMessage: "Accepted eBill missing",
    description: "Governed reason for requesting an accepted eBill",
  },
  reasonInvoiceMissing: {
    id: "credit.evidenceBrief.reason.invoiceMissing",
    defaultMessage: "Trade invoice missing",
    description: "Governed reason for requesting an underlying-goods invoice",
  },
  reasonDuplicateCheck: {
    id: "credit.evidenceBrief.reason.duplicateCheck",
    defaultMessage: "Duplicate-financing check incomplete",
    description: "Governed reason for an incomplete duplicate-financing check",
  },
  reasonContradiction: {
    id: "credit.evidenceBrief.reason.contradiction",
    defaultMessage: "Confirmed facts conflict",
    description: "Governed reason for requesting resolution of contradictory case facts",
  },
  reasonAcceptorRisk: {
    id: "credit.evidenceBrief.reason.acceptorRisk",
    defaultMessage: "Acceptor risk evidence missing",
    description: "Governed reason for requesting a current acceptor risk record",
  },
  reasonInvoiceEvidence: {
    id: "credit.evidenceBrief.reason.invoiceEvidence",
    defaultMessage: "Invoice evidence not admissible",
    description: "Governed reason for requesting admissible invoice evidence",
  },
  reasonInvoiceConsistency: {
    id: "credit.evidenceBrief.reason.invoiceConsistency",
    defaultMessage: "Invoice and eBill do not align",
    description: "Governed reason for requesting clarification of invoice and eBill consistency",
  },
  reasonRecourse: {
    id: "credit.evidenceBrief.reason.recourse",
    defaultMessage: "Recourse acknowledgement missing",
    description: "Governed reason for requesting the applicant's whole-face recourse acknowledgement",
  },
});

type FindingTone = "success" | "alert" | "neutral";

interface ClaimRow {
  key: string;
  claim: string;
  value: string;
  source: string;
  conclusion: string;
  tone: FindingTone;
}

function statusIcon(tone: FindingTone) {
  const Icon = tone === "success" ? CircleCheck : tone === "alert" ? CircleAlert : CircleHelp;
  const className = tone === "success" ? "text-signal-success" : tone === "alert" ? "text-signal-alert" : "text-muted-foreground";
  return <Icon className={`size-4 shrink-0 ${className}`} aria-hidden="true" />;
}

function requestReason(request: VerificationRequest, intl: IntlShape): string {
  const reasonMessages: Record<string, (typeof messages)[keyof typeof messages]> = {
    verification_bill_required: messages.reasonBillMissing,
    verification_invoice_required: messages.reasonInvoiceMissing,
    verification_duplicate_check_required: messages.reasonDuplicateCheck,
    verification_contradiction_required: messages.reasonContradiction,
    verification_acceptor_loss_parameters_required: messages.reasonAcceptorRisk,
    verification_invoice_evidence_required: messages.reasonInvoiceEvidence,
    verification_invoice_consistency_required: messages.reasonInvoiceConsistency,
    verification_recourse_acknowledgment_required: messages.reasonRecourse,
  };
  const reason = reasonMessages[request.reasonCode];
  return reason === undefined ? (axisLabels[request.axis] ?? words(request.axis)) : intl.formatMessage(reason);
}

const isApplicantOwnedRequest = (request: VerificationRequest): boolean =>
  request.owner === "applicant" || request.resolutionAction === "request_applicant_information";

function claimRows(summary: EvidenceCaseSummary, submittedEvidence: readonly SubmittedEvidence[], intl: IntlShape): ClaimRow[] {
  const { snapshot } = summary;
  const bill = snapshot.bill;
  const invoice = snapshot.invoice;
  const invoiceEvidence = invoice === null ? undefined : submittedEvidence.find((evidence) => evidence.reference === invoice.reference);
  const invoiceSource =
    invoiceEvidence === undefined ? intl.formatMessage(messages.invoiceDocument) : displayEvidenceLabel(invoiceEvidence.label);
  const invoiceConflict = invoice?.plausibility === "implausible" || invoice?.billAndClaimsConsistency === "mismatch";
  const invoiceSupported =
    invoice?.plausibility === "plausible" && invoice.billAndClaimsConsistency === "match" && invoice.evidenceState === "corroborated";
  // Invoice consistency is a separate governed check, not an entry in snapshot.contradictions.
  // Unknown consistency and model-directed questions do not establish a conflict.
  const deterministicConflicts = [
    ...snapshot.contradictions.map(({ code }) => words(code)),
    ...(invoice?.billAndClaimsConsistency === "mismatch" ? [intl.formatMessage(messages.reasonInvoiceConsistency)] : []),
  ];
  const contradictionValue =
    deterministicConflicts.length === 0 ? intl.formatMessage(messages.noContradictions) : deterministicConflicts.join(" · ");

  const rows: ClaimRow[] = [
    {
      key: "bill",
      claim: intl.formatMessage(messages.acceptedBill),
      value:
        bill === null
          ? intl.formatMessage(messages.noBill)
          : `${words(bill.acceptanceState)} · ${intl.formatNumber(BigInt(bill.faceValueSat))} sat`,
      source: intl.formatMessage(messages.protocolRecord),
      conclusion:
        bill !== null && (bill.acceptanceState === "accepted" || bill.acceptanceState === "endorsed")
          ? intl.formatMessage(messages.protocolFact)
          : intl.formatMessage(messages.notAccepted),
      tone: bill !== null && (bill.acceptanceState === "accepted" || bill.acceptanceState === "endorsed") ? "success" : "alert",
    },
    {
      key: "trade",
      claim: intl.formatMessage(messages.underlyingTrade),
      value:
        invoice === null
          ? intl.formatMessage(messages.noInvoice)
          : `${invoice.goodsDescription} · ${intl.formatNumber(BigInt(invoice.totalSat))} sat`,
      source: invoiceSource,
      conclusion: invoiceConflict
        ? intl.formatMessage(messages.conflict)
        : invoiceSupported
          ? intl.formatMessage(messages.supported)
          : intl.formatMessage(messages.reviewRequired),
      tone: invoiceConflict ? "alert" : invoiceSupported ? "success" : "neutral",
    },
    {
      key: "use",
      claim: intl.formatMessage(messages.useOfFunds),
      value: snapshot.confirmedClaims.useOfFunds,
      source: intl.formatMessage(messages.applicantAnswers),
      conclusion: intl.formatMessage(messages.applicantStatement),
      tone: "neutral",
    },
    {
      key: "repayment",
      claim: intl.formatMessage(messages.repaymentSource),
      value: snapshot.confirmedClaims.repaymentSource,
      source: intl.formatMessage(messages.applicantAnswers),
      conclusion: intl.formatMessage(messages.applicantStatement),
      tone: "neutral",
    },
    {
      key: "contradictions",
      claim: intl.formatMessage(messages.contradictions),
      value: contradictionValue,
      source: intl.formatMessage(messages.deterministicChecks),
      conclusion: deterministicConflicts.length === 0 ? intl.formatMessage(messages.clear) : intl.formatMessage(messages.open),
      tone: deterministicConflicts.length === 0 ? "success" : "alert",
    },
  ];
  if ((summary.answerReviewFollowUpCount ?? 0) > 0)
    rows.push({
      key: "answer-review",
      claim: intl.formatMessage(messages.answerReview),
      value: intl.formatMessage(messages.followUpCount, { count: summary.answerReviewFollowUpCount }),
      source: intl.formatMessage(messages.interviewerReview),
      conclusion: intl.formatMessage(messages.unresolvedReview),
      tone: "neutral",
    });
  return rows;
}

export function EvidenceCaseBrief({
  summary,
  submittedEvidence,
  verificationRequests,
  assessmentCurrency,
}: {
  summary: EvidenceCaseSummary;
  submittedEvidence: readonly SubmittedEvidence[];
  verificationRequests: readonly VerificationRequest[];
  assessmentCurrency: "current" | "historical";
}) {
  const intl = useIntl();
  const rows = claimRows(summary, submittedEvidence, intl);
  const applicantRequests = verificationRequests.filter(isApplicantOwnedRequest);
  const internalRequests = verificationRequests.filter((request) => !isApplicantOwnedRequest(request));
  const nextRequest = applicantRequests[0] ?? internalRequests[0];
  const isApplicantRequest = nextRequest !== undefined && isApplicantOwnedRequest(nextRequest);
  const requestState =
    assessmentCurrency === "historical"
      ? intl.formatMessage(messages.historicalPolicy)
      : nextRequest === undefined
        ? intl.formatMessage(messages.allApplicantChecksComplete)
        : isApplicantRequest
          ? intl.formatMessage(messages.readyToRequest)
          : intl.formatMessage(messages.mintWorkPending);

  return (
    <section className="@container/evidence min-w-0 space-y-4" data-testid="evidence-case-brief">
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-elevation-100 px-4 py-3">
          <h3 className="text-sm font-semibold">{intl.formatMessage(messages.title)}</h3>
        </div>
        <div className="hidden grid-cols-[minmax(9rem,0.9fr)_minmax(0,1.7fr)_minmax(8rem,0.9fr)_9rem] gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground @min-[40rem]/evidence:grid">
          <span>{intl.formatMessage(messages.claim)}</span>
          <span>{intl.formatMessage(messages.value)}</span>
          <span>{intl.formatMessage(messages.source)}</span>
          <span>{intl.formatMessage(messages.conclusion)}</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-2 px-4 py-3 @min-[40rem]/evidence:grid-cols-[minmax(9rem,0.9fr)_minmax(0,1.7fr)_minmax(8rem,0.9fr)_9rem] @min-[40rem]/evidence:items-center @min-[40rem]/evidence:gap-4"
            >
              <span className="text-xs font-medium @min-[40rem]/evidence:text-sm">{row.claim}</span>
              <span className="min-w-0 break-words text-sm">{row.value}</span>
              <span className="text-xs text-muted-foreground">{row.source}</span>
              <span className="flex items-center gap-2 text-xs font-medium">
                {statusIcon(row.tone)}
                {row.conclusion}
              </span>
            </div>
          ))}
        </div>
      </div>

      {nextRequest !== undefined && (
        <section className="rounded-lg border border-signal-alert/50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">{intl.formatMessage(messages.nextRequest)}</h3>
              <p className="mt-1 text-xs font-medium text-signal-alert">{requestState}</p>
            </div>
            {verificationRequests.length > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {intl.formatMessage(messages.moreRequests, { count: verificationRequests.length - 1 })}
              </span>
            )}
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.needed)}</dt>
              <dd className="mt-1 font-medium">{nextRequest.requiredItem}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.why)}</dt>
              <dd className="mt-1">{requestReason(nextRequest, intl)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.response)}</dt>
              <dd className="mt-1">{intl.formatMessage(isApplicantRequest ? messages.applicantResponse : messages.mintResponse)}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.channel)}</dt>
              <dd className="mt-1 flex items-center gap-1">
                {intl.formatMessage(isApplicantRequest ? messages.ebillChannel : messages.internalChannel)}
                <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </dd>
            </div>
          </dl>
        </section>
      )}
    </section>
  );
}
