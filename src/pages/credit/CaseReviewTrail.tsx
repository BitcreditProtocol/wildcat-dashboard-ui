import { countCitedEvidenceClaims, operatorVisibleAxes, words } from "./decision-types";
import type {
  ApplicantConfirmation,
  ApplicantHumanReviewRecord,
  ClaimInvestigationState,
  DecisionCase,
  EvidencePacket,
  InterviewTranscript,
  SubmittedEvidence,
  VerificationRequest,
  LiveInterviewProgress,
  ServerClarificationObservation,
} from "./decision-types";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { InformationNeedsPanel } from "./InformationNeedsPanel";
import { currentServerMessages, interviewMessageKey } from "./case-rounds";
import type { OperatorCapability } from "./record-operator-decision";
import type { InterviewAssistantTemplate, ServerInitialObservation } from "@bitcredit/ai-credit-shared";
import { mergeInterviewMessages } from "@bitcredit/ai-credit-shared";
import { clarificationItemText } from "./clarification-item-text";

// Reviewed objective labels, never reconstructed question wording.
const promptObjectives = defineMessages({
  "aiCredit.interview.welcome": {
    id: "credit.livePrompt.use",
    defaultMessage: "Use of proceeds",
    description: "Recorded use of proceeds prompt objective, not exact question wording",
  },
  "aiCredit.interview.repayment": {
    id: "credit.livePrompt.repayment",
    defaultMessage: "Repayment source",
    description: "Recorded repayment source prompt objective, not exact question wording",
  },
  "aiCredit.interview.documentRequest": {
    id: "credit.livePrompt.documents",
    defaultMessage: "Supporting documents",
    description: "Recorded supporting documents prompt objective, not exact question wording",
  },
  "aiCredit.interview.anythingElse": {
    id: "credit.livePrompt.additional",
    defaultMessage: "Additional information",
    description: "Recorded additional information prompt objective, not exact question wording",
  },
  "aiCredit.interview.clarification": {
    id: "credit.livePrompt.clarification",
    defaultMessage: "Clarify missing answers",
    description: "Recorded clarify missing answers prompt objective, not exact question wording",
  },
  "aiCredit.interview.limit": {
    id: "credit.livePrompt.limit",
    defaultMessage: "Interview limit reached",
    description: "Recorded interview limit reached prompt objective, not exact question wording",
  },
  "aiCredit.interview.review": {
    id: "credit.livePrompt.review",
    defaultMessage: "Review proposed answers",
    description: "Recorded review proposed answers prompt objective, not exact question wording",
  },
  "aiCredit.interview.answerDifference": {
    id: "credit.livePrompt.difference",
    defaultMessage: "Explain differing statements",
    description: "Recorded explain differing statements prompt objective, not exact question wording",
  },
  "aiCredit.interview.repaymentTiming": {
    id: "credit.livePrompt.timing",
    defaultMessage: "Explain repayment timing",
    description: "Recorded explain repayment timing prompt objective, not exact question wording",
  },
  "aiCredit.interview.costBreakdown": {
    id: "credit.livePrompt.costs",
    defaultMessage: "Explain costs",
    description: "Recorded explain costs prompt objective, not exact question wording",
  },
  "aiCredit.interview.salesEvidence": {
    id: "credit.livePrompt.sales",
    defaultMessage: "Support sales claims",
    description: "Recorded support sales claims prompt objective, not exact question wording",
  },
  "aiCredit.interview.governedClarification": {
    id: "credit.livePrompt.governedClarification",
    defaultMessage: "Answer the Mint's evidence request",
    description: "Recorded objective for an exact governed Mint clarification request",
  },
} satisfies Record<InterviewAssistantTemplate, { id: string; defaultMessage: string; description: string }>);

const messages = defineMessages({
  earlierMessages: {
    id: "credit.caseRecord.earlierMessages",
    defaultMessage: "Show {count} earlier messages",
    description: "Reveal exact older messages in the continuous conversation, without hiding audit records",
  },
  latestMessages: {
    id: "credit.caseRecord.latestMessages",
    defaultMessage: "Latest messages",
    description: "Return to the recent part of the applicant conversation",
  },
  title: { id: "credit.caseRecord.title", defaultMessage: "Case record", description: "Operator case audit disclosure" },
  conversationTitle: {
    id: "credit.caseRecord.conversationTitle",
    defaultMessage: "Conversation & review",
    description: "Read-only operator conversation and review panel",
  },
  viewOnly: {
    id: "credit.caseRecord.viewOnly",
    defaultMessage: "View only",
    description: "Operator cannot write into applicant conversation",
  },
  show: { id: "credit.caseRecord.show", defaultMessage: "Show conversation", description: "Expand conversation and review panel" },
  hide: { id: "credit.caseRecord.hide", defaultMessage: "Hide conversation", description: "Collapse conversation and review panel" },
  questionUnavailable: {
    id: "credit.caseRecord.questionUnavailable",
    defaultMessage: "Question text not recorded",
    description: "Missing exact question text must not be fabricated from an internal template identifier",
  },
  scripted: {
    id: "credit.caseRecord.scripted",
    defaultMessage: "Scripted interview",
    description: "Interview used a scripted model rather than a live language model",
  },
  recorded: {
    id: "credit.caseRecord.recorded",
    defaultMessage: "Submitted conversation",
    description: "Transcript of the submitted application, not a live session",
  },
  followUp: {
    id: "credit.caseRecord.followUp",
    defaultMessage: "Required follow-up",
    description: "Information requests resulting from checks",
  },
  requestedBecause: {
    id: "credit.caseRecord.requestedBecause",
    defaultMessage: "Check: {reason}",
    description: "Check that requires further applicant evidence",
  },
  activeSession: {
    id: "credit.caseRecord.activeSession",
    defaultMessage: "Unconfirmed clarification receipt",
    description: "Unsubmitted conversation reported by the applicant session",
  },
  serverDialogue: {
    id: "credit.caseRecord.serverDialogue",
    defaultMessage: "Clarification conversation",
    description: "Server-owned clarification dialogue bound to an admitted Mint request",
  },
  initialDialogue: {
    id: "credit.caseRecord.initialDialogue",
    defaultMessage: "Application conversation",
    description: "Server-owned initial interview before or after its application is submitted",
  },
  initialNotSubmitted: {
    id: "credit.caseRecord.initialNotSubmitted",
    defaultMessage: "Not submitted · no credit decision",
    description: "Initial interview does not grant credit or minting authority",
  },
  serverRecorded: {
    id: "credit.caseRecord.serverRecorded",
    defaultMessage: "Server-recorded messages · claims unverified",
    description: "Exact wording recorded by the interview service is not independent evidence verification",
  },
  serverInterviewer: {
    id: "credit.caseRecord.serverInterviewer",
    defaultMessage: "Interviewer · server-recorded",
    description: "Authorship of exact interviewer wording from the server-owned dialogue",
  },
  serverInterviewing: {
    id: "credit.caseRecord.serverInterviewing",
    defaultMessage: "Awaiting applicant answer",
    description: "Server-owned dialogue is waiting for an applicant turn",
  },
  serverProcessing: {
    id: "credit.caseRecord.serverProcessing",
    defaultMessage: "Interviewer responding",
    description: "Server has reserved and is processing the next dialogue turn",
  },
  serverInterrupted: {
    id: "credit.caseRecord.serverInterrupted",
    defaultMessage: "Interview interrupted",
    description: "Server dialogue stopped; no result is inferred",
  },
  serverReview: {
    id: "credit.caseRecord.serverReview",
    defaultMessage: "Awaiting answer confirmation",
    description: "Applicant must review answers before confirming the server dialogue",
  },
  serverConfirmed: {
    id: "credit.caseRecord.serverConfirmed",
    defaultMessage: "Answers confirmed",
    description: "Dialogue answers confirmed but the application has not yet been submitted",
  },
  serverSubmitted: {
    id: "credit.caseRecord.serverSubmitted",
    defaultMessage: "Submitted",
    description: "Recorded clarification was submitted, not a resolved investigation or approval",
  },
  serverSuperseded: {
    id: "credit.caseRecord.serverSuperseded",
    defaultMessage: "Superseded",
    description: "The request is no longer active and this clarification dialogue was not submitted",
  },
  savedAt: {
    id: "credit.caseRecord.savedAt",
    defaultMessage: "Saved {time}",
    description: "Server update timestamp for the dialogue, not a timestamp for every message",
  },
  requestReference: {
    id: "credit.caseRecord.requestReference",
    defaultMessage: "Mint request",
    description: "Exact admitted clarification request identity for this conversation",
  },
  reconnecting: {
    id: "credit.caseRecord.reconnecting",
    defaultMessage: "Reconnecting · showing last received record",
    description: "Transport is reconnecting; retained conversation is not evidence of current processing",
  },
  liveUpdates: {
    id: "credit.caseRecord.liveUpdates",
    defaultMessage: "Live updates",
    description: "The existing authenticated polling is receiving updates, not token streaming",
  },
  lastRecorded: {
    id: "credit.caseRecord.lastRecorded",
    defaultMessage: "Last recorded: {status}",
    description: "Saved dialogue status when this view has no confirmed live transport",
  },
  waitingReview: {
    id: "credit.caseRecord.waitingReview",
    defaultMessage: "Last reported: reviewing answers",
    description: "Live session is reviewing answers before submission",
  },
  interviewing: {
    id: "credit.caseRecord.interviewing",
    defaultMessage: "Last reported: answering questions",
    description: "Live applicant session is answering questions",
  },
  updatesUnavailable: {
    id: "credit.caseRecord.updatesUnavailable",
    defaultMessage: "Updates unavailable · showing last received record",
    description: "Read-only conversation cache is stale because polling failed",
  },
  disconnected: {
    id: "credit.caseRecord.disconnected",
    defaultMessage: "Updates unavailable",
    description: "Visible even when the stale read-only conversation card is collapsed",
  },
  receivedAt: {
    id: "credit.caseRecord.receivedAt",
    defaultMessage: "Received {time}",
    description: "Time the server received the latest applicant session progress, not a per-message timestamp",
  },
  notSubmitted: {
    id: "credit.caseRecord.notSubmitted",
    defaultMessage: "Not submitted · current assessment unchanged",
    description: "Applicant-session messages are not confirmed evidence and do not change financial assessment",
  },
  emptySession: {
    id: "credit.caseRecord.emptySession",
    defaultMessage: "Waiting for the first message",
    description: "Active applicant session has not published messages",
  },
  claimReview: {
    id: "credit.caseRecord.claimReview",
    defaultMessage: "Follow-up from answer review",
    description: "Question proposed by the interviewer model after reviewing applicant answers, not an independently verified finding",
  },
  priorConversations: {
    id: "credit.caseRecord.priorConversations",
    defaultMessage: "Submission snapshots ({count})",
    description: "All retained submissions in oldest-first order, with no invented timestamps",
  },
  priorConversation: {
    id: "credit.caseRecord.priorConversation",
    defaultMessage: "Submission {number}",
    description: "Ordinal of a retained submitted interview in oldest-first order",
  },
  sessionRestarted: {
    id: "credit.caseRecord.sessionRestarted",
    defaultMessage: "Session restarted",
    description: "Applicant explicitly started another live session for the same clarification request",
  },
  questionUnverified: {
    id: "credit.caseRecord.questionUnverified",
    defaultMessage: "Resolution not independently checked",
    description: "A recorded follow-up or applicant reply does not establish resolution",
  },
  summary: {
    id: "credit.caseRecord.summary",
    defaultMessage: "Interview and review record",
    description: "Compact description of the available applicant interview and review record",
  },
  legacySummary: {
    id: "credit.caseRecord.legacySummary",
    defaultMessage: "Confirmed answers only · transcript unavailable",
    description: "Compact honest summary when a legacy case retained confirmed answers but not the applicant conversation",
  },
  interview: { id: "credit.caseRecord.interview", defaultMessage: "Applicant interview", description: "Interview transcript heading" },
  applicant: { id: "credit.caseRecord.applicant", defaultMessage: "Applicant", description: "Applicant message author" },
  interviewer: { id: "credit.caseRecord.interviewer", defaultMessage: "Interviewer", description: "Interviewer message author" },
  documents: {
    id: "credit.caseRecord.documents",
    defaultMessage: "Documents added: {labels}",
    description: "Document attachment turn in the applicant interview",
  },
  transcriptUnavailable: {
    id: "credit.caseRecord.transcriptUnavailable",
    defaultMessage: "Full conversation not recorded for this submission",
    description: "Honest legacy state when only confirmed applicant answers were retained",
  },
  useOfFunds: { id: "credit.caseRecord.useOfFunds", defaultMessage: "Use of proceeds", description: "Confirmed use of proceeds" },
  repayment: { id: "credit.caseRecord.repayment", defaultMessage: "Repayment source", description: "Confirmed repayment source" },
  reviewWork: { id: "credit.caseRecord.reviewWork", defaultMessage: "Review work", description: "Structured review work heading" },
  review: { id: "credit.caseRecord.review", defaultMessage: "Review", description: "Review-work table column" },
  result: { id: "credit.caseRecord.result", defaultMessage: "Result", description: "Review-work table result column" },
  authority: { id: "credit.caseRecord.authority", defaultMessage: "Authority", description: "Review-work authority column" },
  policyChecks: { id: "credit.caseRecord.policyChecks", defaultMessage: "Policy checks", description: "Deterministic checks row" },
  checksPassed: {
    id: "credit.caseRecord.checksPassed",
    defaultMessage: "{passed}/{total} passed",
    description: "Policy checks result",
  },
  deterministic: { id: "credit.caseRecord.deterministic", defaultMessage: "Deterministic", description: "Deterministic authority" },
  documentReview: { id: "credit.caseRecord.documentReview", defaultMessage: "Document analysis", description: "Document analysis row" },
  citedClaims: {
    id: "credit.caseRecord.citedClaims",
    defaultMessage:
      "{documents, plural, one {# document} other {# documents}} · {claims, plural, one {# cited claim} other {# cited claims}}",
    description: "Document-analysis result",
  },
  evidenceBound: { id: "credit.caseRecord.evidenceBound", defaultMessage: "Evidence-bound", description: "Evidence analysis authority" },
  publicResearch: { id: "credit.caseRecord.publicResearch", defaultMessage: "Public research", description: "Public research row" },
  publicResearchResult: {
    id: "credit.caseRecord.publicResearchResult",
    defaultMessage: "{findings, plural, one {# finding} other {# findings}} · {sources, plural, one {# source} other {# sources}}",
    description: "Public research result",
  },
  supplementalAi: { id: "credit.caseRecord.supplementalAi", defaultMessage: "Supplemental AI", description: "Public research authority" },
  unavailable: { id: "credit.caseRecord.unavailable", defaultMessage: "Unavailable", description: "Unavailable review result" },
  notRun: { id: "credit.caseRecord.notRun", defaultMessage: "Not run", description: "Review stage that did not run" },
  queued: {
    id: "credit.caseRecord.queued",
    defaultMessage: "Not started",
    description: "Research has not started; no worker activity is implied",
  },
  inProgress: { id: "credit.caseRecord.inProgress", defaultMessage: "In progress", description: "Review stage currently running" },
  disabled: { id: "credit.caseRecord.disabled", defaultMessage: "Disabled", description: "Review stage disabled by configuration" },
  humanReview: { id: "credit.caseRecord.humanReview", defaultMessage: "Human review", description: "Human review row" },
  human: { id: "credit.caseRecord.human", defaultMessage: "Human", description: "Human authority" },
});

interface CaseReviewTrailProps {
  embedded?: boolean;
  decisionCase?: DecisionCase;
  capability?: OperatorCapability;
  standalone?: boolean;
  transcript?: InterviewTranscript;
  applicantConfirmation?: ApplicantConfirmation;
  applicantHumanReview?: ApplicantHumanReviewRecord;
  axes?: DecisionCase["result"]["axes"];
  submittedEvidence: readonly SubmittedEvidence[];
  evidencePackets: readonly EvidencePacket[];
  claimInvestigation?: ClaimInvestigationState;
  verificationRequests?: readonly VerificationRequest[];
  liveInterview?: LiveInterviewProgress;
  serverClarificationDialogues?: readonly ServerClarificationObservation[];
  serverInitialApplication?: ServerInitialObservation;
  interviewHistory?: readonly InterviewTranscript[];
  updatesUnavailable?: boolean;
  updatesStatus?: "live" | "reconnecting" | "unavailable";
}

export function TranscriptMessages({
  transcript,
  followLatest = false,
  live = false,
  serverRecorded = false,
  serverRecordedKeys,
  capToRecent = false,
}: {
  transcript: Pick<InterviewTranscript, "messages">;
  followLatest?: boolean;
  live?: boolean;
  serverRecorded?: boolean;
  /** Exact messages that also have a server-recorded copy; only those gain server authorship. */
  serverRecordedKeys?: ReadonlySet<string>;
  capToRecent?: boolean;
}) {
  const intl = useIntl();
  const [showEarlier, setShowEarlier] = useState(false);
  const listId = useId();
  const lastRequestIndex = transcript.messages.reduce(
    (latest, message, index) => (message.role === "assistant" && message.governedClarification !== undefined ? index : latest),
    -1
  );
  const recentStart = Math.max(0, transcript.messages.length - 10);
  // Keep the request that gives the current replies their context, even beyond ten messages.
  const earlierCount = capToRecent ? (lastRequestIndex < 0 ? recentStart : Math.min(recentStart, lastRequestIndex)) : 0;
  const visibleMessages = showEarlier || earlierCount === 0 ? transcript.messages : transcript.messages.slice(earlierCount);
  const scrollRef = useRef<HTMLOListElement>(null);
  const followLatestRef = useRef(followLatest);
  useEffect(() => {
    const list = scrollRef.current;
    if (list !== null && followLatest && followLatestRef.current) list.scrollTop = list.scrollHeight;
  }, [followLatest, transcript.messages]);
  return (
    <>
      {earlierCount > 0 && (
        <button
          type="button"
          className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          aria-expanded={showEarlier}
          aria-controls={listId}
          onClick={() => setShowEarlier((value) => !value)}
        >
          {intl.formatMessage(showEarlier ? messages.latestMessages : messages.earlierMessages, { count: earlierCount })}
        </button>
      )}
      <ol
        id={listId}
        ref={scrollRef}
        className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto pr-1"
        aria-label={intl.formatMessage(messages.interview)}
        onScroll={(event) => {
          const list = event.currentTarget;
          followLatestRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
        }}
      >
        {visibleMessages.map((message) => {
          const isServerRecorded = serverRecorded || serverRecordedKeys?.has(interviewMessageKey(message)) === true;
          const remainingRequirements =
            message.role === "assistant"
              ? (message.governedClarification?.requiredItems ?? [])
                  .map(clarificationItemText)
                  .filter((item) => !isServerRecorded || !message.text?.includes(item))
              : [];
          return message.role === "applicant_documents" ? (
            <li
              key={message.messageId}
              className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground break-words"
            >
              {intl.formatMessage(messages.documents, { labels: message.labels.join(", ") })}
            </li>
          ) : (
            <li key={message.messageId} className={message.role === "applicant" ? "ml-6" : "mr-6"}>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {intl.formatMessage(
                  message.role === "applicant" ? messages.applicant : isServerRecorded ? messages.serverInterviewer : messages.interviewer
                )}
              </div>
              <p
                className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-5 ${message.role === "applicant" ? "border border-border bg-background" : "bg-muted/50"}`}
              >
                {message.role === "applicant"
                  ? message.text
                  : live
                    ? intl.formatMessage(
                        {
                          id: "credit.livePrompt.objective",
                          defaultMessage: "Recorded prompt objective: {objective}",
                          description: "Reviewed objective of an applicant-reported prompt, not a reconstructed transcript",
                        },
                        { objective: intl.formatMessage(promptObjectives[message.templateId]) }
                      )
                    : (message.text ?? intl.formatMessage(messages.questionUnavailable))}
              </p>
              {message.role === "assistant" && message.followUp !== undefined && (
                <details className="mt-1 px-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">{intl.formatMessage(messages.claimReview)}</summary>
                  {message.followUp.sources.map((source) => (
                    <blockquote
                      key={`${source.answerIndex}:${source.quote}`}
                      className="mt-2 border-l-2 border-border pl-2 whitespace-pre-wrap break-words"
                    >
                      {source.quote}
                    </blockquote>
                  ))}
                  <p className="mt-2">{intl.formatMessage(messages.questionUnverified)}</p>
                </details>
              )}
              {remainingRequirements.length > 0 && (
                <ul className="mt-2 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                  {remainingRequirements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function ReviewRow({ label, result, authority }: { label: string; result: string; authority: string }) {
  return (
    <tr className="border-t border-border first:border-t-0">
      <th scope="row" className="px-3 py-2.5 text-left text-xs font-medium">
        {label}
      </th>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {result}
        <span className="mt-1 block text-[11px] sm:hidden">{authority}</span>
      </td>
      <td className="hidden px-3 py-2.5 text-right text-xs text-muted-foreground sm:table-cell">{authority}</td>
    </tr>
  );
}

export function ServerDialogueRecord({
  dialogue,
  liveUpdates,
}: {
  dialogue: ServerClarificationObservation | ServerInitialObservation;
  liveUpdates: boolean;
}) {
  const intl = useIntl();
  const statusLabels = {
    interviewing: messages.serverInterviewing,
    processing: messages.serverProcessing,
    interrupted: messages.serverInterrupted,
    review: messages.serverReview,
    confirmed: messages.serverConfirmed,
    submitted: messages.serverSubmitted,
    superseded: messages.serverSuperseded,
  } satisfies Record<ServerClarificationObservation["status"], (typeof messages)[keyof typeof messages]>;
  const submitted = dialogue.status === "submitted";
  const isClarification = "requestId" in dialogue;
  const inactive = submitted || dialogue.status === "superseded";
  const status = intl.formatMessage(statusLabels[dialogue.status]);
  return (
    <details className="mt-4 border-t border-border pt-3" open={!inactive}>
      <summary className="cursor-pointer text-sm font-medium">
        {intl.formatMessage(isClarification ? messages.serverDialogue : messages.initialDialogue)} ·{" "}
        {liveUpdates || inactive ? status : intl.formatMessage(messages.lastRecorded, { status })}
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(messages.serverRecorded)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <time dateTime={dialogue.updatedAt}>
          {intl.formatMessage(messages.savedAt, {
            time: intl.formatDate(dialogue.updatedAt, { dateStyle: "medium", timeStyle: "short" }),
          })}
        </time>
        {!submitted && <> · {intl.formatMessage(isClarification ? messages.notSubmitted : messages.initialNotSubmitted)}</>}
      </p>
      {isClarification && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">{intl.formatMessage(messages.requestReference)}</summary>
          <p className="mt-1 break-all font-mono">{dialogue.requestId}</p>
        </details>
      )}
      <TranscriptMessages
        transcript={{ messages: isClarification ? currentServerMessages(dialogue) : dialogue.messages }}
        followLatest={!inactive}
        serverRecorded
        capToRecent
      />
    </details>
  );
}

/** Applicant-session progress: prompt objectives only, never reconstructed interviewer wording. */
export function LiveSessionRecord({ liveInterview }: { liveInterview: LiveInterviewProgress }) {
  const intl = useIntl();
  return (
    <div className="mt-3">
      {liveInterview.attempt > 1 && <p className="mb-1 text-xs text-muted-foreground">{intl.formatMessage(messages.sessionRestarted)}</p>}
      <p role="status" className="text-sm font-medium">
        {intl.formatMessage(liveInterview.status === "review" ? messages.waitingReview : messages.interviewing)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {intl.formatMessage(messages.receivedAt, {
          time: intl.formatTime(liveInterview.updatedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        })}{" "}
        · {intl.formatMessage(messages.notSubmitted)}
      </p>
      {liveInterview.messages.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{intl.formatMessage(messages.emptySession)}</p>
      ) : (
        <TranscriptMessages transcript={liveInterview} followLatest live />
      )}
    </div>
  );
}

export function CaseReviewTrail({
  embedded = false,
  decisionCase,
  capability,
  standalone = false,
  transcript,
  applicantConfirmation,
  applicantHumanReview,
  axes = [],
  submittedEvidence,
  evidencePackets,
  claimInvestigation,
  verificationRequests = [],
  liveInterview: legacyLiveInterview,
  serverClarificationDialogues = [],
  serverInitialApplication,
  interviewHistory = [],
  updatesUnavailable = false,
  updatesStatus,
}: CaseReviewTrailProps) {
  const intl = useIntl();
  const reconnecting = updatesStatus === "reconnecting";
  const disconnected = updatesUnavailable || reconnecting || updatesStatus === "unavailable";
  const liveInterview =
    legacyLiveInterview !== undefined &&
    serverClarificationDialogues.some(
      (dialogue) =>
        dialogue.requestId === legacyLiveInterview.requestId && dialogue.status !== "submitted" && dialogue.status !== "superseded"
    )
      ? undefined
      : legacyLiveInterview;
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const revealEvidenceQuestions = () => {
      if (embedded || !standalone || window.location.hash !== "#evidence-questions" || disclosure.current === null) return;
      disclosure.current.open = true;
      disclosure.current.querySelector("#evidence-questions")?.scrollIntoView?.({ block: "start" });
    };
    revealEvidenceQuestions();
    window.addEventListener("hashchange", revealEvidenceQuestions);
    return () => window.removeEventListener("hashchange", revealEvidenceQuestions);
  }, [standalone, embedded]);
  const visibleAxes = operatorVisibleAxes(axes);
  const passed = visibleAxes.filter((axis) => axis.status === "pass").length;
  const citedClaims = countCitedEvidenceClaims(evidencePackets);
  const investigation = claimInvestigation?.status === "available" ? claimInvestigation.proposal : null;
  const investigationSources = investigation?.findings.reduce((count, finding) => count + finding.sources.length, 0) ?? 0;
  const publicResearchResult = (() => {
    if (investigation !== null) {
      return intl.formatMessage(messages.publicResearchResult, {
        findings: investigation.findings.length,
        sources: investigationSources,
      });
    }
    if (claimInvestigation === undefined) return intl.formatMessage(messages.notRun);
    if (claimInvestigation.status === "running") return intl.formatMessage(messages.inProgress);
    if (claimInvestigation.status === "idle") return intl.formatMessage(messages.queued);
    if (claimInvestigation.status === "disabled") return intl.formatMessage(messages.disabled);
    return intl.formatMessage(messages.unavailable);
  })();
  const submittedConversations = [...interviewHistory, ...(transcript === undefined ? [] : [transcript])];
  // Only exact current-request turns can be represented by their server-authored copy.
  // Carried context stays beside its original questions; different legacy wording never gains server authorship.
  const serverMessageKeys = new Set(
    [...(serverInitialApplication?.messages ?? []), ...serverClarificationDialogues.flatMap(currentServerMessages)].map((message) =>
      JSON.stringify(message)
    )
  );
  const submittedMessages = mergeInterviewMessages(submittedConversations.map((submitted) => submitted.messages));
  const legacyMessages = submittedMessages.filter((message) => !serverMessageKeys.has(JSON.stringify(message)));
  const hasServerCopies = legacyMessages.length !== submittedMessages.length;

  const submittedConversationRecord =
    submittedConversations.length === 0 ? null : (
      <div className="mt-3">
        {submittedConversations.length === 1 && liveInterview === undefined && legacyMessages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {submittedConversations.length === 1
              ? intl.formatMessage(submittedConversations[0]?.modelId.startsWith("scripted") ? messages.scripted : messages.recorded)
              : intl.formatMessage(messages.priorConversations, { count: submittedConversations.length })}
          </p>
        )}
        {legacyMessages.length > 0 && (
          <TranscriptMessages
            key={transcript?.caseId ?? submittedConversations[0]?.caseId}
            capToRecent
            transcript={{ messages: legacyMessages }}
          />
        )}
        {(submittedConversations.length > 1 || hasServerCopies) && (
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {intl.formatMessage(messages.priorConversations, { count: submittedConversations.length })}
            </summary>
            <div className="mt-3 space-y-5">
              {submittedConversations.map((submitted, index) => (
                <section key={submitted.preparedInputId}>
                  {submittedConversations.length > 1 && (
                    <h5 className="text-sm font-medium">
                      {intl.formatMessage(messages.priorConversation, { number: index + 1 })}
                      {submitted.modelId.startsWith("scripted") ? ` · ${intl.formatMessage(messages.scripted)}` : ""}
                    </h5>
                  )}
                  <TranscriptMessages transcript={submitted} />
                </section>
              ))}
            </div>
          </details>
        )}
      </div>
    );

  return (
    <details
      ref={disclosure}
      open={embedded ? true : undefined}
      id={standalone ? "case-conversation" : undefined}
      className={embedded ? "group/case" : `group/case rounded-lg border border-border ${standalone ? "bg-card text-card-foreground" : ""}`}
    >
      <summary
        hidden={embedded}
        className={`flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 marker:hidden ${standalone ? "p-6" : "px-4 py-3"}`}
      >
        <span className={standalone ? "text-lg font-semibold" : "text-sm font-medium"}>
          {intl.formatMessage(standalone ? messages.conversationTitle : messages.title)}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {standalone && liveInterview === undefined && !disconnected ? (
            <>
              <span className="group-open/case:hidden">{intl.formatMessage(messages.show)}</span>
              <span className="hidden group-open/case:inline">{intl.formatMessage(messages.hide)}</span>
            </>
          ) : standalone ? (
            intl.formatMessage(
              disconnected
                ? messages.disconnected
                : liveInterview === undefined
                  ? messages.show
                  : liveInterview.status === "review"
                    ? messages.waitingReview
                    : messages.interviewing
            )
          ) : (
            intl.formatMessage(transcript === undefined ? messages.legacySummary : messages.summary)
          )}
          <ChevronDown
            className="size-4 transition-transform group-open/case:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
      </summary>

      {disconnected && (
        <p role="status" className="border-t border-border px-4 py-3 text-sm text-signal-alert">
          {intl.formatMessage(reconnecting ? messages.reconnecting : messages.updatesUnavailable)}
        </p>
      )}

      <div className={embedded ? "min-w-0" : "grid border-t border-border lg:grid-cols-2"}>
        <section className={embedded ? "min-w-0" : "min-w-0 border-b border-border p-4 lg:border-r lg:border-b-0"}>
          <h4 className="text-sm font-semibold">
            {intl.formatMessage(liveInterview === undefined ? messages.interview : messages.activeSession)}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.viewOnly)}</p>
          {updatesStatus === "live" &&
            !disconnected &&
            (serverClarificationDialogues.some((dialogue) => dialogue.status !== "submitted" && dialogue.status !== "superseded") ||
              (serverInitialApplication !== undefined &&
                serverInitialApplication.status !== "submitted" &&
                serverInitialApplication.status !== "superseded")) && (
              <p role="status" className="mt-1 text-xs text-muted-foreground">
                {intl.formatMessage(messages.liveUpdates)}
              </p>
            )}
          {submittedConversationRecord}
          {serverInitialApplication !== undefined && (
            <ServerDialogueRecord dialogue={serverInitialApplication} liveUpdates={updatesStatus === "live" && !disconnected} />
          )}
          {serverClarificationDialogues.map((dialogue) => (
            <ServerDialogueRecord key={dialogue.dialogueId} dialogue={dialogue} liveUpdates={updatesStatus === "live" && !disconnected} />
          ))}
          {liveInterview !== undefined && <LiveSessionRecord liveInterview={liveInterview} />}
          {submittedConversations.length === 0 &&
          liveInterview === undefined &&
          serverClarificationDialogues.length === 0 &&
          serverInitialApplication === undefined ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-signal-alert">{intl.formatMessage(messages.transcriptUnavailable)}</p>
              {applicantConfirmation !== undefined && (
                <dl className="mt-3 divide-y divide-border rounded-md border border-border">
                  <div className="px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.useOfFunds)}</dt>
                    <dd className="mt-1 text-sm">{applicantConfirmation.useOfFunds}</dd>
                  </div>
                  <div className="px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.repayment)}</dt>
                    <dd className="mt-1 text-sm">{applicantConfirmation.repaymentSource}</dd>
                  </div>
                </dl>
              )}
            </div>
          ) : null}
        </section>

        {!embedded && (
          <section className="min-w-0 p-4">
            <h4 className="text-sm font-semibold">{intl.formatMessage(messages.reviewWork)}</h4>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {intl.formatMessage(messages.review)}
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      {intl.formatMessage(messages.result)}
                    </th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                      {intl.formatMessage(messages.authority)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ReviewRow
                    label={intl.formatMessage(messages.policyChecks)}
                    result={intl.formatMessage(messages.checksPassed, { passed, total: visibleAxes.length })}
                    authority={intl.formatMessage(messages.deterministic)}
                  />
                  <ReviewRow
                    label={intl.formatMessage(messages.documentReview)}
                    result={intl.formatMessage(messages.citedClaims, { documents: submittedEvidence.length, claims: citedClaims })}
                    authority={intl.formatMessage(messages.evidenceBound)}
                  />
                  <ReviewRow
                    label={intl.formatMessage(messages.publicResearch)}
                    result={publicResearchResult}
                    authority={intl.formatMessage(messages.supplementalAi)}
                  />
                  {applicantHumanReview !== undefined && (
                    <ReviewRow
                      label={intl.formatMessage(messages.humanReview)}
                      result={words(applicantHumanReview.status)}
                      authority={intl.formatMessage(messages.human)}
                    />
                  )}
                </tbody>
              </table>
            </div>
            {verificationRequests.some((request) => request.owner === "applicant") && (
              <section className="mt-4 border-t border-border pt-4">
                <h5 className="text-sm font-semibold">{intl.formatMessage(messages.followUp)}</h5>
                <ul className="mt-2 space-y-3">
                  {verificationRequests
                    .filter((request) => request.owner === "applicant")
                    .map((request) => (
                      <li key={`${request.code}:${request.requiredItem}`} className="border-l-2 border-signal-alert pl-3">
                        <p className="text-sm">{request.requiredItem}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {intl.formatMessage(messages.requestedBecause, { reason: words(request.reasonCode) })}
                        </p>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {decisionCase !== undefined && (
              <InformationNeedsPanel decisionCase={decisionCase} capability={updatesUnavailable ? undefined : capability} />
            )}
          </section>
        )}
      </div>
    </details>
  );
}
