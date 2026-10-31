import type { DurationSummary, MetricRate, OutcomeReport } from "@bitcredit/ai-credit-shared";
import { TriangleAlert } from "lucide-react";
import { OutcomeFunnel } from "./OutcomeFunnel";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import type { ReactNode } from "react";
import { type IntlShape, type MessageDescriptor, useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { useOutcomeReport } from "@/pages/mint-checks/api";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";

const messages = defineMessages({
  attention: { id: "outcomes.attention", defaultMessage: "Needs attention", description: "Operator dashboard outcomes: attention" },
  reviewWording: {
    id: "outcomes.reviewWording",
    defaultMessage:
      "Review this explanation’s wording with a person before the next demo. No content or policy has been changed automatically.",
    description: "Operator dashboard outcomes: reviewWording",
  },
  attentionRule: {
    id: "outcomes.attentionRule",
    defaultMessage: "Flagged when at least 5 people answer and fewer than half answer correctly.",
    description: "Operator dashboard outcomes: attentionRule",
  },
  title: { id: "outcomes.title", defaultMessage: "Outcomes", description: "Page title of the PRD outcome measures" },
  description: {
    id: "outcomes.description",
    defaultMessage:
      "What the product measures over the cases this Mint holds now. Capability is not success: these show whether applicants finish, understand and get human help, and how people review.",
    description: "What the outcomes page shows",
  },
  synthetic: {
    id: "outcomes.synthetic",
    defaultMessage: "Synthetic demo data · generated {time}. Aggregates only: no applicant text, written basis or identifiers.",
    description: "Synthetic data and aggregation notice",
  },
  applicants: { id: "outcomes.applicants", defaultMessage: "Applicants", description: "Section: applicant journey" },
  opened: { id: "outcomes.opened", defaultMessage: "Interviews opened", description: "Metric" },
  answered: { id: "outcomes.answered", defaultMessage: "Answered at least one question", description: "Metric" },
  reachedReview: { id: "outcomes.reachedReview", defaultMessage: "Reached the review of their answers", description: "Metric" },
  confirmed: { id: "outcomes.confirmed", defaultMessage: "Confirmed their answers", description: "Metric" },
  submitted: { id: "outcomes.submitted", defaultMessage: "Submitted an application", description: "Metric" },
  openToConfirmation: { id: "outcomes.openToConfirmation", defaultMessage: "Time from opening to confirmation", description: "Metric" },
  inProgress: { id: "outcomes.inProgress", defaultMessage: "Still in progress", description: "Metric" },
  stalled: { id: "outcomes.stalled", defaultMessage: "Stalled for over a day, by last step", description: "Metric" },
  fallbackChosen: { id: "outcomes.fallbackChosen", defaultMessage: "Continued without the assistant", description: "Metric" },
  fallbackCompleted: { id: "outcomes.fallbackCompleted", defaultMessage: "…and then submitted", description: "Metric" },
  understanding: { id: "outcomes.understanding", defaultMessage: "Understanding of the quote", description: "Section: comprehension" },
  checks: { id: "outcomes.checks", defaultMessage: "Optional checks taken", description: "Metric" },
  noComprehension: {
    id: "outcomes.noComprehension",
    defaultMessage: "Comprehension checks are not configured for this Mint.",
    description: "Empty state",
  },
  help: { id: "outcomes.help", defaultMessage: "Help from a person", description: "Section: help requests" },
  helpRequests: { id: "outcomes.helpRequests", defaultMessage: "Questions asked", description: "Metric" },
  helpAnswered: { id: "outcomes.helpAnswered", defaultMessage: "Answered", description: "Metric" },
  helpReplyTime: { id: "outcomes.helpReplyTime", defaultMessage: "Time to a reply", description: "Metric" },
  noHelp: { id: "outcomes.noHelp", defaultMessage: "Help requests are not configured for this Mint.", description: "Empty state" },
  review: { id: "outcomes.review", defaultMessage: "Review by people", description: "Section: operator review" },
  cases: { id: "outcomes.cases", defaultMessage: "Current cases", description: "Metric" },
  assessed: { id: "outcomes.assessed", defaultMessage: "Assessed by the policy", description: "Metric" },
  reviewed: {
    id: "outcomes.reviewed",
    defaultMessage: "Acted on by a person (decision or information request)",
    description: "Metric: cases with any recorded operator action",
  },
  reviewTime: {
    id: "outcomes.reviewTime",
    defaultMessage: "Time a ready case waited for a person",
    description: "Metric: from the case first becoming ready for decision to any operator action, including information requests",
  },
  deviations: {
    id: "outcomes.deviations",
    defaultMessage: "Decisions that differ from the policy's recommendation",
    description: "Metric: operator deviations from the engine",
  },
  humanReviews: { id: "outcomes.humanReviews", defaultMessage: "Second reviews requested by applicants", description: "Metric" },
  humanReviewsCompleted: { id: "outcomes.humanReviewsCompleted", defaultMessage: "Second reviews completed", description: "Metric" },
  humanReviewStart: { id: "outcomes.humanReviewStart", defaultMessage: "Time until a second review started", description: "Metric" },
  humanReviewCompletion: {
    id: "outcomes.humanReviewCompletion",
    defaultMessage: "Time until a second review was completed",
    description: "Metric",
  },
  corrections: { id: "outcomes.corrections", defaultMessage: "Corrections after a completed second review", description: "Metric" },
  reproducibility: {
    id: "outcomes.reproducibility",
    defaultMessage: "Current decisions reproduced from stored inputs",
    description: "Metric",
  },
  notMeasured: { id: "outcomes.notMeasured", defaultMessage: "Not measured yet", description: "Section: unavailable metrics" },
  antiMetrics: { id: "outcomes.antiMetrics", defaultMessage: "Never counted as success", description: "Section: PRD anti-metrics" },
  rate: { id: "outcomes.rate", defaultMessage: "{numerator} of {denominator} ({percent})", description: "A rate with its counts" },
  rateNone: { id: "outcomes.rateNone", defaultMessage: "{numerator} of {denominator}", description: "A rate without a percentage" },
  duration: {
    id: "outcomes.duration",
    defaultMessage: "median {median} · longest {maximum} · {count, plural, one {# sample} other {# samples}}",
    description: "A duration summary",
  },
  noSamples: { id: "outcomes.noSamples", defaultMessage: "no samples yet", description: "A duration without samples" },
  noneYet: { id: "outcomes.noneYet", defaultMessage: "none yet", description: "A rate whose denominator is still zero" },
});

const topicMessages = defineMessages({
  amount_now: { id: "outcomes.topic.amountNow", defaultMessage: "Amount received now", description: "Comprehension topic" },
  fee: { id: "outcomes.topic.fee", defaultMessage: "The fee", description: "Comprehension topic" },
  payer_and_maturity: { id: "outcomes.topic.payer", defaultMessage: "Who pays, and when", description: "Comprehension topic" },
  recourse: { id: "outcomes.topic.recourse", defaultMessage: "Recourse if the payer does not pay", description: "Comprehension topic" },
});

const stepMessages = defineMessages({
  opened: { id: "outcomes.step.opened", defaultMessage: "opened", description: "Applicant step" },
  answering: { id: "outcomes.step.answering", defaultMessage: "answering", description: "Applicant step" },
  review: { id: "outcomes.step.review", defaultMessage: "reviewing answers", description: "Applicant step" },
  confirmed: { id: "outcomes.step.confirmed", defaultMessage: "confirmed, not submitted", description: "Applicant step" },
});

const unavailableMessages: Record<string, MessageDescriptor> = defineMessages({
  material_claim_correction_rate: {
    id: "outcomes.unavailable.materialCorrection",
    defaultMessage: "Material-claim correction rate",
    description: "Metric",
  },
  seeded_error_detection: {
    id: "outcomes.unavailable.seededErrors",
    defaultMessage: "Seeded-error detection by reviewers",
    description: "Metric",
  },
  operator_deviation_written_basis: {
    id: "outcomes.unavailable.deviationBasis",
    defaultMessage: "Basis of deviations from the policy",
    description: "Metric",
  },
  historical_decision_reproducibility: {
    id: "outcomes.unavailable.historicalReproducibility",
    defaultMessage: "Reproducibility of past decisions",
    description: "Metric",
  },
  unsupported_claim_and_schema_failure_rates: {
    id: "outcomes.unavailable.schemaFailures",
    defaultMessage: "Unsupported-claim and schema-failure rates",
    description: "Metric",
  },
  untranslated_policy_bearing_copy: {
    id: "outcomes.unavailable.untranslatedCopy",
    defaultMessage: "Untranslated borrower copy",
    description: "Metric",
  },
  complete_historical_cohort: {
    id: "outcomes.unavailable.history",
    defaultMessage: "Complete history of all cases",
    description: "Metric",
  },
  applicant_comprehension: { id: "outcomes.unavailable.comprehension", defaultMessage: "Applicant comprehension", description: "Metric" },
});

const antiMetricMessages: Record<string, MessageDescriptor> = defineMessages({
  agreement_with_the_model: { id: "outcomes.anti.agreement", defaultMessage: "Agreement with the model", description: "Anti-metric" },
  approval_percentage: { id: "outcomes.anti.approval", defaultMessage: "Approval percentage", description: "Anti-metric" },
  chat_volume: { id: "outcomes.anti.chat", defaultMessage: "Chat volume", description: "Anti-metric" },
  model_eloquence: { id: "outcomes.anti.eloquence", defaultMessage: "Model eloquence", description: "Anti-metric" },
  operator_satisfaction_alone: {
    id: "outcomes.anti.satisfaction",
    defaultMessage: "Operator satisfaction alone",
    description: "Anti-metric",
  },
  low_appeal_rate_without_access_to_appeal: {
    id: "outcomes.anti.appeals",
    defaultMessage: "A low appeal rate without access to appeal",
    description: "Anti-metric",
  },
});

function formatRate(intl: IntlShape, rate: MetricRate): string {
  if (rate.denominator === 0) return intl.formatMessage(messages.noneYet);
  return rate.ratio === null
    ? intl.formatMessage(messages.rateNone, { numerator: rate.numerator, denominator: rate.denominator })
    : intl.formatMessage(messages.rate, {
        numerator: rate.numerator,
        denominator: rate.denominator,
        percent: intl.formatNumber(rate.ratio, { style: "percent", maximumFractionDigits: 0 }),
      });
}

function formatSpan(intl: IntlShape, ms: number | null): string {
  if (ms === null) return "–";
  if (ms < 60_000) return intl.formatNumber(ms / 1_000, { style: "unit", unit: "second", unitDisplay: "short", maximumFractionDigits: 0 });
  const minutes = ms / 60_000;
  if (minutes < 60) return intl.formatNumber(minutes, { style: "unit", unit: "minute", unitDisplay: "short", maximumFractionDigits: 0 });
  const hours = minutes / 60;
  if (hours < 48) return intl.formatNumber(hours, { style: "unit", unit: "hour", unitDisplay: "short", maximumFractionDigits: 1 });
  return intl.formatNumber(hours / 24, { style: "unit", unit: "day", unitDisplay: "short", maximumFractionDigits: 1 });
}

function formatDuration(intl: IntlShape, summary: DurationSummary): string {
  if (summary.sampleCount === 0) return intl.formatMessage(messages.noSamples);
  return intl.formatMessage(messages.duration, {
    median: formatSpan(intl, summary.medianMs),
    maximum: formatSpan(intl, summary.maximumMs),
    count: summary.sampleCount,
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Report({ report }: { report: OutcomeReport }) {
  const intl = useIntl();
  const journey = report.applicantJourney;
  const cases = report.cases;
  return (
    <div className="grid gap-4 @4xl:grid-cols-2">
      <div className="@4xl:col-span-2">
        <OutcomeFunnel report={report} />
      </div>
      <Section title={intl.formatMessage(messages.applicants)}>
        <Row label={intl.formatMessage(messages.opened)} value={intl.formatNumber(journey.opened)} />
        <Row label={intl.formatMessage(messages.answered)} value={formatRate(intl, journey.answered)} />
        <Row label={intl.formatMessage(messages.reachedReview)} value={formatRate(intl, journey.reachedReview)} />
        <Row label={intl.formatMessage(messages.confirmed)} value={formatRate(intl, journey.confirmed)} />
        <Row label={intl.formatMessage(messages.submitted)} value={formatRate(intl, journey.submitted)} />
        <Row label={intl.formatMessage(messages.openToConfirmation)} value={formatDuration(intl, journey.openToConfirmation)} />
        <Row label={intl.formatMessage(messages.inProgress)} value={intl.formatNumber(journey.inProgress)} />
        <Row
          label={intl.formatMessage(messages.stalled)}
          value={(["opened", "answering", "review", "confirmed"] as const)
            .map((step) => `${intl.formatMessage(stepMessages[step])} ${String(journey.stalledByStep[step] ?? 0)}`)
            .join(" · ")}
        />
        <Row label={intl.formatMessage(messages.fallbackChosen)} value={formatRate(intl, journey.structuredFallback.selected)} />
        <Row label={intl.formatMessage(messages.fallbackCompleted)} value={formatRate(intl, journey.structuredFallback.completed)} />
      </Section>

      <Section title={intl.formatMessage(messages.understanding)}>
        {report.applicantComprehension === null ? (
          <Row label={intl.formatMessage(messages.noComprehension)} value="" />
        ) : (
          <>
            <Row label={intl.formatMessage(messages.checks)} value={intl.formatNumber(report.applicantComprehension.checks)} />
            {(Object.keys(topicMessages) as (keyof typeof topicMessages)[]).map((topic) => {
              const result = report.applicantComprehension?.byTopic[topic];
              return (
                <Row
                  key={topic}
                  label={intl.formatMessage(topicMessages[topic])}
                  value={
                    result === undefined ? (
                      "–"
                    ) : (
                      <div className="max-w-sm text-right">
                        <span>{formatRate(intl, { numerator: result.correct, denominator: result.answered, ratio: result.ratio })}</span>
                        {result.answered >= 5 && result.correct / result.answered < 0.5 && (
                          <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-left">
                            <strong className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                              <TriangleAlert className="size-3.5" />
                              {intl.formatMessage(messages.attention)}
                            </strong>
                            <p className="mt-1 text-xs font-normal">{intl.formatMessage(messages.reviewWording)}</p>
                            <p className="mt-1 text-[11px] font-normal text-muted-foreground">
                              {intl.formatMessage(messages.attentionRule)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  }
                />
              );
            })}
          </>
        )}
      </Section>

      <Section title={intl.formatMessage(messages.help)}>
        {report.applicantHelp === null ? (
          <Row label={intl.formatMessage(messages.noHelp)} value="" />
        ) : (
          <>
            <Row label={intl.formatMessage(messages.helpRequests)} value={intl.formatNumber(report.applicantHelp.requests)} />
            <Row
              label={intl.formatMessage(messages.helpAnswered)}
              value={formatRate(intl, {
                numerator: report.applicantHelp.answered,
                denominator: report.applicantHelp.requests,
                ratio: report.applicantHelp.requests === 0 ? null : report.applicantHelp.answered / report.applicantHelp.requests,
              })}
            />
            <Row label={intl.formatMessage(messages.helpReplyTime)} value={formatDuration(intl, report.applicantHelp.requestToReply)} />
          </>
        )}
      </Section>

      <Section title={intl.formatMessage(messages.review)}>
        <Row label={intl.formatMessage(messages.cases)} value={intl.formatNumber(cases.coverage.denominator)} />
        <Row label={intl.formatMessage(messages.assessed)} value={formatRate(intl, cases.durableAssessment.casesEverAssessed)} />
        <Row label={intl.formatMessage(messages.reviewed)} value={formatRate(intl, cases.operatorReview.casesEverReviewed)} />
        <Row label={intl.formatMessage(messages.reviewTime)} value={formatDuration(intl, cases.operatorReview.evaluationToAction)} />
        <Row label={intl.formatMessage(messages.deviations)} value={formatRate(intl, cases.operatorReview.deviations)} />
        <Row label={intl.formatMessage(messages.humanReviews)} value={intl.formatNumber(cases.humanReview.requests)} />
        <Row label={intl.formatMessage(messages.humanReviewsCompleted)} value={formatRate(intl, cases.humanReview.completed)} />
        <Row label={intl.formatMessage(messages.humanReviewStart)} value={formatDuration(intl, cases.humanReview.requestToStart)} />
        <Row
          label={intl.formatMessage(messages.humanReviewCompletion)}
          value={formatDuration(intl, cases.humanReview.requestToCompletion)}
        />
        <Row label={intl.formatMessage(messages.corrections)} value={formatRate(intl, cases.humanReview.correctionsAfterCompletedReview)} />
        <Row
          label={intl.formatMessage(messages.reproducibility)}
          value={formatRate(intl, cases.currentDecisionReproducibility.reproducible)}
        />
      </Section>

      <section className="rounded-lg border border-border p-4 @4xl:col-span-2">
        <h2 className="mb-3 font-medium">{intl.formatMessage(messages.notMeasured)}</h2>
        <ul className="space-y-2 text-sm">
          {report.unavailable.map((entry) => (
            <li key={entry.metric}>
              <span className="font-medium">
                {unavailableMessages[entry.metric] ? intl.formatMessage(unavailableMessages[entry.metric]) : entry.metric}
              </span>
              <span className="text-muted-foreground"> · {entry.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border p-4 @4xl:col-span-2">
        <h2 className="mb-3 font-medium">{intl.formatMessage(messages.antiMetrics)}</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {report.antiMetrics.map((metric) => (
            <li key={metric} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              {antiMetricMessages[metric] ? intl.formatMessage(antiMetricMessages[metric]) : metric}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function OutcomesPage() {
  const intl = useIntl();
  const query = useOutcomeReport();
  return (
    <div className="@container space-y-4 p-4 md:p-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{intl.formatMessage(messages.title)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.description)}</p>
      </header>
      {query.data && (
        <BoundaryNotice
          summary={intl.formatMessage({
            id: "outcomes.shortBoundary",
            defaultMessage: "Synthetic aggregates · sample sizes shown.",
            description: "Operator dashboard outcomes: shortBoundary",
          })}
        >
          {intl.formatMessage(messages.synthetic, {
            time: intl.formatDate(query.data.generatedAt, { dateStyle: "medium", timeStyle: "short" }),
          })}
        </BoundaryNotice>
      )}
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <Report report={query.data} />
      ) : (
        <CheckLoading />
      )}
    </div>
  );
}
