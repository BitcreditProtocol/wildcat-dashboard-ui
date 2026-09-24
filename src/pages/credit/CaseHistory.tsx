import type { ServerInitialObservation } from "@bitcredit/ai-credit-shared";
import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";
import { buildCaseHistory, type CaseInvestigationRunRecord, type CaseRound, type CaseRoundRequest, type RecordedNeed } from "./case-rounds";
import { LiveSessionRecord, ServerDialogueRecord, TranscriptMessages } from "./CaseReviewTrail";
import { ClaimInvestigationPanel } from "./ClaimInvestigationPanel";
import { words, type DecisionCase } from "./decision-types";
import { clarificationItemText } from "./clarification-item-text";
import { informationNeedStatusMessage, investigationNeedKindMessages } from "./information-need-status";

const messages = defineMessages({
  operatorQuestion: {
    id: "credit.history.operatorQuestion",
    defaultMessage: "Operator question",
    description: "Question from a human operator, not an automated request or financial decision",
  },
  title: {
    id: "credit.history.title",
    defaultMessage: "Case history",
    description: "Read-only recorded case activity grouped by submission",
  },
  overview: {
    id: "credit.history.overview",
    defaultMessage: "{count, plural, =0 {No submissions recorded} one {# submission} other {# submissions}} · View only",
    description: "Number of retained applicant submissions; the history has no controls",
  },
  live: { id: "credit.history.live", defaultMessage: "Live updates", description: "Existing authenticated polling is receiving updates" },
  reconnecting: {
    id: "credit.history.reconnecting",
    defaultMessage: "Reconnecting · showing last received record",
    description: "Retained record is not evidence of current processing",
  },
  unavailable: {
    id: "credit.history.unavailable",
    defaultMessage: "Updates unavailable · showing last received record",
    description: "Retained record is stale because polling failed",
  },
  inProgress: {
    id: "credit.history.inProgress",
    defaultMessage: "In progress · not submitted",
    description: "Unsubmitted conversations and queued work; nothing here changes the assessment",
  },
  investigationQueued: {
    id: "credit.history.investigationQueued",
    defaultMessage: "Queued for answer review",
    description: "Answer review has not started; no model activity is implied",
  },
  submissions: {
    id: "credit.history.submissions",
    defaultMessage: "Submissions",
    description: "Accessible label for the list of submissions",
  },
  submission: {
    id: "credit.history.submission",
    defaultMessage: "Submission {number}",
    description: "Retained submission in recorded order",
  },
  latest: { id: "credit.history.latest", defaultMessage: "Latest", description: "Most recent retained submission" },
  roundSummary: {
    id: "credit.history.roundSummary",
    defaultMessage:
      "{reviews, plural, =0 {no answer review} one {# answer review} other {# answer reviews}} · {questions, plural, =0 {no evidence questions} one {# evidence question} other {# evidence questions}} · {requests, plural, =0 {no linked request} one {# linked request} other {# linked requests}}",
    description: "Counts of records bound to one submission by recorded identifiers",
  },
  respondsTo: { id: "credit.history.respondsTo", defaultMessage: "Responds to", description: "Requests answered by this submission" },
  conversation: {
    id: "credit.history.conversation",
    defaultMessage: "Applicant conversation",
    description: "Exact recorded applicant and interviewer messages for this submission",
  },
  submitted: {
    id: "credit.history.submitted",
    defaultMessage: "Submitted conversation · claims unverified",
    description: "Provenance of a submitted transcript; applicant statements are not verified",
  },
  scripted: { id: "credit.history.scripted", defaultMessage: "Scripted interview", description: "Interview used a scripted model" },
  noNewMessages: {
    id: "credit.history.noNewMessages",
    defaultMessage: "No new messages · earlier answers carried over",
    description: "Every message of this submission was already recorded in an earlier submission",
  },
  exactSnapshot: {
    id: "credit.history.exactSnapshot",
    defaultMessage: "Exact submission snapshot ({count, plural, one {# message} other {# messages}})",
    description: "Disclosure with the complete retained transcript, including carried-over answers",
  },
  technicalReceipt: {
    id: "credit.history.technicalReceipt",
    defaultMessage: "Technical receipt",
    description: "Disclosure for recorded model, prompt and identifier metadata",
  },
  initialDialogue: {
    id: "credit.history.initialDialogue",
    defaultMessage: "Server-recorded application conversation",
    description: "Exact server copy of the initial interview whose messages are part of this submission",
  },
  answerReview: { id: "credit.history.answerReview", defaultMessage: "Answer review", description: "Recorded model answer-review runs" },
  noAnswerReview: {
    id: "credit.history.noAnswerReview",
    defaultMessage: "No answer review recorded for this submission",
    description: "Absence of a run record; no review is implied",
  },
  runRunning: {
    id: "credit.history.run.running",
    defaultMessage: "Reviewing applicant answers",
    description: "A bounded model review is running",
  },
  runCompleted: {
    id: "credit.history.run.completed",
    defaultMessage: "Answer review completed",
    description: "Review completion does not verify claims",
  },
  runFailed: {
    id: "credit.history.run.failed",
    defaultMessage: "Review unavailable",
    description: "No result may be inferred from a failed run",
  },
  runInterrupted: { id: "credit.history.run.interrupted", defaultMessage: "Interrupted", description: "Run stopped and was not replayed" },
  previousInput: {
    id: "credit.history.previousInput",
    defaultMessage: "Previous input",
    description: "The run reviewed an earlier submission or assessment digest than the current case",
  },
  modelScope: {
    id: "credit.history.modelScope",
    defaultMessage: "Answer reviewer · model proposals · no claim verification",
    description: "Authorship and authority of answer-review output",
  },
  finishedAt: { id: "credit.history.finishedAt", defaultMessage: "Finished {time}", description: "Recorded run finish time" },
  stoppedBecause: {
    id: "credit.history.stoppedBecause",
    defaultMessage: "Stopping reason: {reason}",
    description: "Recorded run stopping reason",
  },
  runId: { id: "credit.history.runId", defaultMessage: "Run ID", description: "Recorded answer-review run identifier" },
  noProposal: {
    id: "credit.history.noProposal",
    defaultMessage: "No additional question proposed",
    description: "Not a claim that evidence is verified",
  },
  admitted: {
    id: "credit.history.admitted",
    defaultMessage: "Admitted as evidence question",
    description: "A recorded evidence question carries this proposal's run and index",
  },
  notSent: {
    id: "credit.history.notSent",
    defaultMessage: "Not sent",
    description: "No recorded evidence question carries this proposal",
  },
  statementsReviewed: {
    id: "credit.history.statementsReviewed",
    defaultMessage: "Applicant statements reviewed",
    description: "Exact applicant quotes the model cited",
  },
  publicBasis: {
    id: "credit.history.publicBasis",
    defaultMessage: "Public context behind this follow-up",
    description: "Exact retained research basis for a proposed question, not independent verification",
  },
  publicBasisBoundary: {
    id: "credit.history.publicBasisBoundary",
    defaultMessage: "Model-cited context · applicant claims remain unverified. Page retrieval not independently recorded.",
    description: "A public-context source index is not proof that a page was retrieved or a claim verified",
  },
  publicBasisUnavailable: {
    id: "credit.history.publicBasisUnavailable",
    defaultMessage: "The original source record is unavailable in this view.",
    description: "Do not substitute newer public research for an older follow-up's retained source basis",
  },
  evidenceQuestions: {
    id: "credit.history.evidenceQuestions",
    defaultMessage: "Evidence questions",
    description: "Questions recorded against this submission",
  },
  previousRequest: {
    id: "credit.history.previousRequest",
    defaultMessage: "Previous request",
    description: "Retained question from an earlier request, not the current evidence gate",
  },
  policyRequested: {
    id: "credit.history.policyRequested",
    defaultMessage: "Policy-requested",
    description: "Sent by the bounded question-only policy, not a human credit decision",
  },
  purpose: { id: "credit.history.purpose", defaultMessage: "Why this is needed", description: "Governed purpose of an evidence question" },
  promptedBy: { id: "credit.history.promptedBy", defaultMessage: "Prompted by", description: "Applicant statements behind a question" },
  applicantAnswer: {
    id: "credit.history.applicantAnswer",
    defaultMessage: "Applicant answer",
    description: "Recorded applicant response, not verified evidence",
  },
  noResponse: {
    id: "credit.history.noResponse",
    defaultMessage: "Response not recorded",
    description: "Do not invent an applicant answer",
  },
  evidenceReview: { id: "credit.history.evidenceReview", defaultMessage: "Evidence review", description: "Recorded human evidence review" },
  priorReview: {
    id: "credit.history.priorReview",
    defaultMessage: "Previous evidence review",
    description: "Retained review that is not current resolution",
  },
  reviewMeta: {
    id: "credit.history.reviewMeta",
    defaultMessage: "{reviewer} · {role} · {time} · {count, plural, one {# evidence reference} other {# evidence references}}",
    description: "Recorded reviewer, role, time and number of cited evidence items",
  },
  requestsSent: {
    id: "credit.history.requestsSent",
    defaultMessage: "Requests to applicant",
    description: "Requests bound to this submission's recorded questions",
  },
  mintRequest: {
    id: "credit.history.mintRequest",
    defaultMessage: "Mint request",
    description: "Governed clarification request to the applicant",
  },
  requestedAt: { id: "credit.history.requestedAt", defaultMessage: "Requested {time}", description: "Recorded request time" },
  sentAfter: {
    id: "credit.history.sentAfter",
    defaultMessage: "Carries questions from submission {number}",
    description: "The request carries questions recorded against that submission; send time is not inferred",
  },
  requestNotLinked: {
    id: "credit.history.requestNotLinked",
    defaultMessage: "Not linked to an earlier submission",
    description: "A recorded applicant request has no retained submission link; do not infer which round triggered it",
  },
  answeredIn: {
    id: "credit.history.answeredIn",
    defaultMessage: "In submission {number}",
    description: "That submission's conversation contains this exact request; an answer is not inferred",
  },
  conversationInProgress: {
    id: "credit.history.conversationInProgress",
    defaultMessage: "Applicant conversation in progress",
    description: "An unsubmitted conversation for this request exists",
  },
  noAnswer: { id: "credit.history.noAnswer", defaultMessage: "No answer recorded", description: "No submission contains this request" },
  requestItemsUnavailable: {
    id: "credit.history.requestItemsUnavailable",
    defaultMessage: "Request wording not retained in this view",
    description: "The exact request copy is not part of the retained records",
  },
  requestQuestions: {
    id: "credit.history.requestQuestions",
    defaultMessage: "{count, plural, one {# evidence question} other {# evidence questions}} in this request",
    description: "Number of recorded questions carrying this request id; the questions are listed under their submission",
  },
  requestId: { id: "credit.history.requestId", defaultMessage: "Request ID", description: "Exact request identifier" },
  caseLevel: {
    id: "credit.history.caseLevel",
    defaultMessage: "Case level",
    description: "Heading for records shown for the whole case, such as public-source research, not for one submission",
  },
  unlinked: {
    id: "credit.history.unlinked",
    defaultMessage: "Unlinked recorded activity",
    description: "Records whose identifiers match no retained submission; never placed by timestamp",
  },
  transcriptUnavailable: {
    id: "credit.history.transcriptUnavailable",
    defaultMessage: "Full conversation not recorded",
    description: "Legacy case retained only confirmed answers",
  },
  useOfFunds: { id: "credit.history.useOfFunds", defaultMessage: "Use of proceeds", description: "Confirmed use of proceeds" },
  repayment: { id: "credit.history.repayment", defaultMessage: "Repayment source", description: "Confirmed repayment source" },
  empty: {
    id: "credit.history.empty",
    defaultMessage: "No conversation recorded for this case.",
    description: "No fabricated transcript when the case has no conversation",
  },
});

const runStatusMessage = {
  running: messages.runRunning,
  completed: messages.runCompleted,
  failed: messages.runFailed,
  interrupted: messages.runInterrupted,
} satisfies Record<CaseInvestigationRunRecord["status"], (typeof messages)[keyof typeof messages]>;

type HistoryCase = Pick<
  DecisionCase,
  | "interviewTranscript"
  | "interviewHistory"
  | "caseInvestigation"
  | "informationNeeds"
  | "historicalInformationNeeds"
  | "automaticInformationRequest"
  | "informationRequests"
  | "serverClarificationDialogues"
  | "liveInterview"
  | "claimInvestigation"
  | "submissionDigest"
  | "resultDigest"
  | "applicantConfirmation"
>;
/** Rendering context; empty when only an unsubmitted initial application exists. */
type HistoryContext = Partial<HistoryCase>;

function automaticRequestIds(decisionCase: HistoryContext | undefined): Set<string> {
  const requests =
    decisionCase?.informationRequests ??
    (decisionCase?.automaticInformationRequest === undefined ? [] : [decisionCase.automaticInformationRequest]);
  return new Set(requests.filter((record) => record.actor.kind === "bounded_policy").map((record) => record.request.requestId));
}

const formatTime = (intl: ReturnType<typeof useIntl>, value: string) => intl.formatDate(value, { dateStyle: "medium", timeStyle: "short" });

function Step({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section className="min-w-0 px-4 py-4" aria-labelledby={headingId}>
      <h4 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function Receipt({ children }: { children: ReactNode }) {
  const intl = useIntl();
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">{intl.formatMessage(messages.technicalReceipt)}</summary>
      <div className="mt-1 space-y-1 break-all font-mono">{children}</div>
    </details>
  );
}

function Quotes({ sources }: { sources: readonly { answerIndex: number; quote: string }[] }) {
  return (
    <>
      {sources.map((source) => (
        <blockquote key={`${String(source.answerIndex)}:${source.quote}`} className="mt-2 break-words border-l-2 border-border pl-3">
          {source.quote}
        </blockquote>
      ))}
    </>
  );
}

function AnswerReviewRun({ run, decisionCase }: { run: CaseInvestigationRunRecord; decisionCase: HistoryContext }) {
  const intl = useIntl();
  const isCurrent = run.submissionDigest === decisionCase.submissionDigest && run.resultDigest === decisionCase.resultDigest;
  const recordedNeeds = [...(decisionCase.informationNeeds ?? []), ...(decisionCase.historicalInformationNeeds ?? [])];
  const basis = run.publicContextBasis;
  const research = decisionCase.claimInvestigation?.status === "available" ? decisionCase.claimInvestigation.proposal : undefined;
  const finding =
    basis !== undefined && research?.inputDigest === basis.researchInputDigest && research.caseId === run.caseId
      ? research.findings[basis.findingIndex]
      : undefined;
  const basisSources = basis?.sourceIndices.map((index) => finding?.sources[index]);
  const completeBasis = finding !== undefined && basisSources?.every((source) => source !== undefined) === true;
  return (
    <article className="rounded-md border border-border p-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">{intl.formatMessage(runStatusMessage[run.status])}</span>
        <time dateTime={run.startedAt} className="text-xs text-muted-foreground">
          {formatTime(intl, run.startedAt)}
        </time>
        {!isCurrent && <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.previousInput)}</span>}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.modelScope)}</p>
      <div className="mt-2">
        <Receipt>
          <p>
            {run.modelId} · {run.promptVersion}
          </p>
          {run.finishedAt !== undefined && <p>{intl.formatMessage(messages.finishedAt, { time: formatTime(intl, run.finishedAt) })}</p>}
          {run.stoppingReason !== undefined && <p>{intl.formatMessage(messages.stoppedBecause, { reason: words(run.stoppingReason) })}</p>}
          <p>
            {intl.formatMessage(messages.runId)}: {run.runId}
          </p>
        </Receipt>
      </div>
      {run.status === "completed" && run.needs.length === 0 && <p className="mt-3 text-sm">{intl.formatMessage(messages.noProposal)}</p>}
      {run.needs.map((need, needIndex) => {
        const admitted = recordedNeeds.some((entry) => entry.origin?.runId === run.runId && entry.origin.needIndex === needIndex);
        return (
          <div key={`${run.runId}:${String(needIndex)}`} className="mt-3 border-t border-border pt-3">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium">{intl.formatMessage(investigationNeedKindMessages[need.kind])}</span>
              <span className="text-xs text-muted-foreground">{intl.formatMessage(admitted ? messages.admitted : messages.notSent)}</span>
            </p>
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">{intl.formatMessage(messages.statementsReviewed)}</summary>
              <Quotes sources={need.sources} />
            </details>
          </div>
        );
      })}
      {basis !== undefined && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">{intl.formatMessage(messages.publicBasis)}</summary>
          <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(messages.publicBasisBoundary)}</p>
          {!completeBasis ? (
            <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(messages.publicBasisUnavailable)}</p>
          ) : (
            <>
              <p className="mt-2 break-words">{finding.summary}</p>
              <ul className="mt-2 space-y-2">
                {basisSources.map((source, index) => (
                  <li key={`${source.url}:${String(index)}`} className="border-l-2 border-border pl-3 text-xs">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="break-words text-primary hover:underline"
                    >
                      {source.title}
                    </a>
                    <blockquote className="mt-1 break-words text-muted-foreground">{source.excerpt}</blockquote>
                  </li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
    </article>
  );
}

function NeedRecord({ recorded, policyRequestIds }: { recorded: RecordedNeed; policyRequestIds: ReadonlySet<string> }) {
  const intl = useIntl();
  const { need, historical } = recorded;
  const review = need.review;
  return (
    <details className="border-l-2 border-border pl-3">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium break-words">{need.question}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {intl.formatMessage(historical ? messages.previousRequest : informationNeedStatusMessage(need))}
        </span>
        {need.origin?.requestId !== undefined && policyRequestIds.has(need.origin.requestId) && (
          <span className="ml-2 text-xs text-muted-foreground">{intl.formatMessage(messages.policyRequested)}</span>
        )}
      </summary>
      <dl className="mt-2 space-y-3 text-sm">
        {need.purpose !== undefined && (
          <div>
            <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.purpose)}</dt>
            <dd className="mt-1 break-words">{need.purpose}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.promptedBy)}</dt>
          <dd>
            <Quotes sources={need.objective.sources} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.applicantAnswer)}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words">{need.response ?? intl.formatMessage(messages.noResponse)}</dd>
        </div>
        {review !== undefined && (
          <div>
            <dt className="text-xs text-muted-foreground">
              {intl.formatMessage(historical || need.reviewIsStale ? messages.priorReview : messages.evidenceReview)}
            </dt>
            <dd className="mt-1">
              <p className="whitespace-pre-wrap break-words">{review.basis}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {intl.formatMessage(messages.reviewMeta, {
                  reviewer: review.reviewedBy,
                  role: words(review.reviewerRole),
                  time: formatTime(intl, review.reviewedAt),
                  count: review.evidenceDigests.length,
                })}
              </p>
            </dd>
          </div>
        )}
      </dl>
    </details>
  );
}

function RequestRecord({
  entry,
  variant,
  liveUpdates,
}: {
  entry: CaseRoundRequest;
  variant: "sent" | "answered" | "unlinked";
  liveUpdates: boolean;
}) {
  const intl = useIntl();
  const request = entry.request;
  // A request shown under both submissions carries its detail where it was sent; the answering
  // submission's conversation already contains its exact wording.
  const full = variant !== "answered" || entry.issuedAfter === undefined;
  return (
    <article className="rounded-md border border-border p-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">
          {intl.formatMessage(
            entry.policyRequested ? messages.policyRequested : entry.operatorRequested ? messages.operatorQuestion : messages.mintRequest
          )}
        </span>
        {request !== undefined && (
          <time dateTime={request.requestedAt} className="text-xs text-muted-foreground">
            {intl.formatMessage(messages.requestedAt, { time: formatTime(intl, request.requestedAt) })}
          </time>
        )}
        {variant === "answered" && entry.issuedAfter !== undefined && (
          <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.sentAfter, { number: entry.issuedAfter })}</span>
        )}
        {variant === "answered" && entry.issuedAfter === undefined && (
          <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.requestNotLinked)}</span>
        )}
        {variant !== "answered" && (
          <span className="text-xs text-muted-foreground">
            {entry.answeredIn !== undefined
              ? intl.formatMessage(messages.answeredIn, { number: entry.answeredIn })
              : intl.formatMessage(entry.hasActiveDialogue ? messages.conversationInProgress : messages.noAnswer)}
          </span>
        )}
      </p>
      {full && variant !== "answered" && (
        <>
          {request === undefined ? (
            <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(messages.requestItemsUnavailable)}</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {request.requiredItems.map((item, index) => (
                <li key={index} className="break-words">
                  {clarificationItemText(item)}
                </li>
              ))}
            </ul>
          )}
          {entry.needs.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {intl.formatMessage(messages.requestQuestions, { count: entry.needs.length })}
            </p>
          )}
        </>
      )}
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer">{intl.formatMessage(messages.requestId)}</summary>
        <p className="mt-1 break-all font-mono">{entry.requestId}</p>
      </details>
      {full &&
        entry.dialogues.map((dialogue) => <ServerDialogueRecord key={dialogue.dialogueId} dialogue={dialogue} liveUpdates={liveUpdates} />)}
    </article>
  );
}

function RoundRecord({
  round,
  isLatest,
  decisionCase,
  serverRecordedKeys,
  liveUpdates,
}: {
  round: CaseRound;
  isLatest: boolean;
  decisionCase: HistoryContext;
  serverRecordedKeys: ReadonlySet<string>;
  liveUpdates: boolean;
}) {
  const intl = useIntl();
  const { transcript } = round;
  const policyRequestIds = automaticRequestIds(decisionCase);
  return (
    <li>
      <details
        open={isLatest}
        id={`submission-${String(round.number)}`}
        className="group scroll-mt-4 overflow-hidden rounded-lg border border-border"
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-elevation-100 px-4 py-3 marker:hidden">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {intl.formatMessage(messages.submission, { number: round.number })}
            {isLatest && (
              <span className="rounded-full border border-border px-2 text-xs font-medium text-muted-foreground">
                {intl.formatMessage(messages.latest)}
              </span>
            )}
          </h3>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {intl.formatMessage(messages.roundSummary, {
              reviews: round.runs.length,
              questions: round.needs.length,
              requests: new Set([...round.requestsSent, ...round.requestsAnswered].map((entry) => entry.requestId)).size,
            })}
            <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </summary>
        <div className="divide-y divide-border border-t border-border">
          {round.requestsAnswered.length > 0 && (
            <Step title={intl.formatMessage(messages.respondsTo)}>
              {round.requestsAnswered.map((entry) => (
                <RequestRecord key={entry.requestId} entry={entry} variant="answered" liveUpdates={liveUpdates} />
              ))}
            </Step>
          )}
          <Step title={intl.formatMessage(messages.conversation)}>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage(transcript.modelId.startsWith("scripted") ? messages.scripted : messages.submitted)}
            </p>
            {round.newMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noNewMessages)}</p>
            ) : (
              <TranscriptMessages transcript={{ messages: round.newMessages }} serverRecordedKeys={serverRecordedKeys} capToRecent />
            )}
            {round.newMessages.length !== transcript.messages.length && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  {intl.formatMessage(messages.exactSnapshot, { count: transcript.messages.length })}
                </summary>
                <TranscriptMessages transcript={transcript} serverRecordedKeys={serverRecordedKeys} />
              </details>
            )}
            <Receipt>
              <p>
                {transcript.modelId} · {transcript.promptVersion} · {transcript.questionGraphVersion} · {transcript.language}
              </p>
              <p>{transcript.preparedInputId}</p>
            </Receipt>
            {round.initialDialogue !== undefined && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{intl.formatMessage(messages.initialDialogue)}</summary>
                <ServerDialogueRecord dialogue={round.initialDialogue} liveUpdates={liveUpdates} />
              </details>
            )}
          </Step>
          <Step title={intl.formatMessage(messages.answerReview)}>
            {round.runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noAnswerReview)}</p>
            ) : (
              round.runs.map((run) => <AnswerReviewRun key={run.runId} run={run} decisionCase={decisionCase} />)
            )}
          </Step>
          {round.needs.length > 0 && (
            <Step title={intl.formatMessage(messages.evidenceQuestions)}>
              {round.needs.map((recorded) => (
                <NeedRecord key={recorded.need.needId} recorded={recorded} policyRequestIds={policyRequestIds} />
              ))}
            </Step>
          )}
          {round.requestsSent.length > 0 && (
            <Step title={intl.formatMessage(messages.requestsSent)}>
              {round.requestsSent.map((entry) => (
                <RequestRecord key={entry.requestId} entry={entry} variant="sent" liveUpdates={liveUpdates} />
              ))}
            </Step>
          )}
        </div>
      </details>
    </li>
  );
}

/**
 * Read-only case record grouped by submission. Only recorded identifiers bind records to a
 * submission; there are no controls here — evidence review and proposal selection live in Review.
 */
export function CaseHistory({
  decisionCase,
  initialApplication,
  updatesStatus,
  updatesUnavailable = false,
}: {
  decisionCase: HistoryCase | undefined;
  initialApplication?: ServerInitialObservation;
  updatesStatus?: "live" | "reconnecting" | "unavailable";
  updatesUnavailable?: boolean;
}) {
  const intl = useIntl();
  const headingId = useId();
  const model = buildCaseHistory(decisionCase, initialApplication);
  const disconnected = updatesUnavailable || updatesStatus === "reconnecting" || updatesStatus === "unavailable";
  const liveUpdates = updatesStatus === "live" && !disconnected;
  const { rounds, inProgress, unlinked } = model;
  const queued = decisionCase?.caseInvestigation?.status === "queued";
  const hasInProgress =
    inProgress.dialogues.length > 0 || inProgress.initialDialogue !== undefined || inProgress.liveInterview !== undefined || queued;
  const hasUnlinked =
    unlinked.runs.length > 0 || unlinked.needs.length > 0 || unlinked.requests.length > 0 || unlinked.initialDialogue !== undefined;
  const policyRequestIds = automaticRequestIds(decisionCase);

  if (decisionCase === undefined && initialApplication === undefined) {
    return (
      <section id="case-history">
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.empty)}</p>
      </section>
    );
  }

  return (
    <section id="case-history" aria-labelledby={headingId} className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold">
          {intl.formatMessage(messages.title)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(messages.overview, { count: rounds.length })}
          {liveUpdates && hasInProgress && <> · {intl.formatMessage(messages.live)}</>}
        </p>
      </header>
      {disconnected && (
        <p role="status" className="text-sm text-signal-alert">
          {intl.formatMessage(updatesStatus === "reconnecting" ? messages.reconnecting : messages.unavailable)}
        </p>
      )}

      {hasInProgress && (
        <section className="rounded-lg border border-border p-4" aria-labelledby={`${headingId}-in-progress`}>
          <h3 id={`${headingId}-in-progress`} className="text-sm font-semibold">
            {intl.formatMessage(messages.inProgress)}
          </h3>
          {queued && <p className="mt-2 text-sm">{intl.formatMessage(messages.investigationQueued)}</p>}
          {inProgress.initialDialogue !== undefined && (
            <ServerDialogueRecord dialogue={inProgress.initialDialogue} liveUpdates={liveUpdates} />
          )}
          {inProgress.dialogues.map((dialogue) => (
            <ServerDialogueRecord key={dialogue.dialogueId} dialogue={dialogue} liveUpdates={liveUpdates} />
          ))}
          {inProgress.liveInterview !== undefined && <LiveSessionRecord liveInterview={inProgress.liveInterview} />}
        </section>
      )}

      {rounds.length > 0 ? (
        <div id="case-investigation" className="scroll-mt-4">
          <ol id="case-conversation" className="scroll-mt-4 space-y-3" aria-label={intl.formatMessage(messages.submissions)}>
            {[...rounds].reverse().map((round) => (
              <RoundRecord
                key={round.preparedInputId}
                round={round}
                isLatest={round.number === rounds.length}
                decisionCase={decisionCase ?? {}}
                serverRecordedKeys={model.serverRecordedKeys}
                liveUpdates={liveUpdates}
              />
            ))}
          </ol>
        </div>
      ) : (
        !hasInProgress && (
          <div id="case-conversation">
            <p className="text-xs font-medium text-signal-alert">{intl.formatMessage(messages.transcriptUnavailable)}</p>
            {decisionCase?.applicantConfirmation !== undefined && (
              <dl className="mt-3 divide-y divide-border rounded-md border border-border">
                <div className="px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.useOfFunds)}</dt>
                  <dd className="mt-1 text-sm">{decisionCase.applicantConfirmation.useOfFunds}</dd>
                </div>
                <div className="px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.repayment)}</dt>
                  <dd className="mt-1 text-sm">{decisionCase.applicantConfirmation.repaymentSource}</dd>
                </div>
              </dl>
            )}
          </div>
        )
      )}

      {decisionCase?.claimInvestigation !== undefined && decisionCase.claimInvestigation.status !== "disabled" && (
        <section id="public-research" className="scroll-mt-4 space-y-2" aria-labelledby={`${headingId}-case-level`}>
          <h3 id={`${headingId}-case-level`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {intl.formatMessage(messages.caseLevel)}
          </h3>
          <ClaimInvestigationPanel state={decisionCase.claimInvestigation} />
        </section>
      )}

      {hasUnlinked && (
        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold marker:hidden">
            <h3 className="text-sm font-semibold">{intl.formatMessage(messages.unlinked)}</h3>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div className="divide-y divide-border border-t border-border">
            {unlinked.initialDialogue !== undefined && (
              <Step title={intl.formatMessage(messages.conversation)}>
                <ServerDialogueRecord dialogue={unlinked.initialDialogue} liveUpdates={liveUpdates} />
              </Step>
            )}
            {unlinked.runs.length > 0 && (
              <Step title={intl.formatMessage(messages.answerReview)}>
                {unlinked.runs.map((run) => (
                  <AnswerReviewRun key={run.runId} run={run} decisionCase={decisionCase ?? {}} />
                ))}
              </Step>
            )}
            {unlinked.needs.length > 0 && (
              <Step title={intl.formatMessage(messages.evidenceQuestions)}>
                {unlinked.needs.map((recorded) => (
                  <NeedRecord key={recorded.need.needId} recorded={recorded} policyRequestIds={policyRequestIds} />
                ))}
              </Step>
            )}
            {unlinked.requests.length > 0 && (
              <Step title={intl.formatMessage(messages.requestsSent)}>
                {unlinked.requests.map((entry) => (
                  <RequestRecord key={entry.requestId} entry={entry} variant="unlinked" liveUpdates={liveUpdates} />
                ))}
              </Step>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
