import type { InformationNeed, ServerInitialObservation } from "@bitcredit/ai-credit-shared";
import type { DecisionCase, InterviewTranscript, LiveInterviewProgress, ServerClarificationObservation } from "./decision-types";

type InterviewMessage = InterviewTranscript["messages"][number];
export type CaseInvestigationRunRecord = NonNullable<DecisionCase["caseInvestigation"]>["runs"][number];
export type GovernedClarificationRequest = NonNullable<Extract<InterviewMessage, { role: "assistant" }>["governedClarification"]>;

/** Exact-message fingerprint; the same equality `mergeInterviewMessages` uses for carried turns. */
export function interviewMessageKey(message: unknown): string {
  return JSON.stringify(message);
}

/** Earlier applicant answers are context for the service, not new clarification turns. */
export function currentServerMessages(dialogue: ServerClarificationObservation) {
  const requestIndex = dialogue.messages.findIndex((message) => {
    if (message.role !== "assistant") return false;
    const request = message.governedClarification;
    return (
      request?.requestId === dialogue.requestId &&
      request.caseId === dialogue.caseId &&
      request.snapshotDigest === dialogue.snapshotDigest &&
      request.resultDigest === dialogue.resultDigest
    );
  });
  return requestIndex < 0 ? dialogue.messages : dialogue.messages.slice(requestIndex);
}

const isActiveDialogue = (dialogue: { status: ServerClarificationObservation["status"] }) =>
  dialogue.status !== "submitted" && dialogue.status !== "superseded";

export interface RecordedNeed {
  need: InformationNeed;
  /** Retained from an earlier request; its status is not the current evidence gate. */
  historical: boolean;
}

export interface CaseRoundRequest {
  requestId: string;
  /** Exact recorded request copy, when one is retained. */
  request?: GovernedClarificationRequest;
  policyRequested: boolean;
  operatorRequested?: boolean;
  /** Submission whose recorded questions carry this request id. */
  issuedAfter?: number;
  /** Submission whose recorded conversation contains this exact request. */
  answeredIn?: number;
  needs: RecordedNeed[];
  /** Submitted or superseded server dialogues for this request. */
  dialogues: ServerClarificationObservation[];
  hasActiveDialogue: boolean;
}

export interface CaseRound {
  /** 1-based, in retained submission order. */
  number: number;
  preparedInputId: string;
  transcript: InterviewTranscript;
  /** Messages first recorded in this submission; exact carried turns are omitted. */
  newMessages: InterviewMessage[];
  runs: CaseInvestigationRunRecord[];
  needs: RecordedNeed[];
  requestsSent: CaseRoundRequest[];
  requestsAnswered: CaseRoundRequest[];
  /** Submitted initial server dialogue whose every exact message is part of this submission. */
  initialDialogue?: ServerInitialObservation;
}

export interface CaseHistoryModel {
  rounds: CaseRound[];
  inProgress: {
    dialogues: ServerClarificationObservation[];
    initialDialogue?: ServerInitialObservation;
    liveInterview?: LiveInterviewProgress;
  };
  unlinked: {
    runs: CaseInvestigationRunRecord[];
    needs: RecordedNeed[];
    requests: CaseRoundRequest[];
    initialDialogue?: ServerInitialObservation;
  };
  /** Exact messages that also have a server-recorded copy. */
  serverRecordedKeys: Set<string>;
}

export type CaseHistoryInput = Pick<
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
>;

/**
 * Groups recorded case activity into submissions using recorded identifiers only:
 * `preparedInputId` (submission ↔ answer-review run ↔ evidence question), `origin.requestId`
 * and the automatic request's `preparedInputId` (question ↔ request), and an exact
 * `governedClarification.requestId` inside a submitted conversation (request ↔ answering
 * submission). Timestamps never bind anything; whatever cannot be bound is returned as unlinked.
 * Submission order is the retained order: `interviewHistory` (oldest first) then the current transcript.
 */
export function buildCaseHistory(
  decisionCase: CaseHistoryInput | undefined,
  initialApplication: ServerInitialObservation | undefined
): CaseHistoryModel {
  const transcripts: InterviewTranscript[] = [];
  const retained = [
    ...(decisionCase?.interviewHistory ?? []),
    ...(decisionCase?.interviewTranscript === undefined ? [] : [decisionCase.interviewTranscript]),
  ];
  for (const transcript of retained) {
    if (!transcripts.some((known) => known.preparedInputId === transcript.preparedInputId)) transcripts.push(transcript);
  }
  const seen = new Set<string>();
  const rounds: CaseRound[] = transcripts.map((transcript, index) => ({
    number: index + 1,
    preparedInputId: transcript.preparedInputId,
    transcript,
    newMessages: transcript.messages.filter((message) => {
      const key = interviewMessageKey(message);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    runs: [],
    needs: [],
    requestsSent: [],
    requestsAnswered: [],
  }));
  const roundFor = (preparedInputId: string) => rounds.find((round) => round.preparedInputId === preparedInputId);
  const unlinked: CaseHistoryModel["unlinked"] = { runs: [], needs: [], requests: [] };

  for (const run of decisionCase?.caseInvestigation?.runs ?? []) {
    const round = roundFor(run.preparedInputId);
    if (round === undefined) unlinked.runs.push(run);
    else round.runs.push(run);
  }

  const recordedNeeds: RecordedNeed[] = [
    ...(decisionCase?.informationNeeds ?? []).map((need) => ({ need, historical: false })),
    ...(decisionCase?.historicalInformationNeeds ?? []).map((need) => ({ need, historical: true })),
  ];
  for (const recorded of recordedNeeds) {
    const round = roundFor(recorded.need.preparedInputId);
    if (round === undefined) unlinked.needs.push(recorded);
    else round.needs.push(recorded);
  }

  const requests = new Map<string, CaseRoundRequest>();
  const requestFor = (requestId: string) => {
    let entry = requests.get(requestId);
    if (entry === undefined) {
      entry = { requestId, policyRequested: false, needs: [], dialogues: [], hasActiveDialogue: false };
      requests.set(requestId, entry);
    }
    return entry;
  };
  const latest = (current: number | undefined, candidate: number | undefined) =>
    candidate === undefined ? current : current === undefined ? candidate : Math.max(current, candidate);
  for (const recorded of recordedNeeds) {
    const requestId = recorded.need.origin?.requestId;
    if (requestId === undefined) continue;
    const entry = requestFor(requestId);
    entry.needs.push(recorded);
    // A request cannot precede the latest submission whose questions it carries.
    entry.issuedAfter = latest(entry.issuedAfter, roundFor(recorded.need.preparedInputId)?.number);
  }
  const requestHistory =
    decisionCase?.informationRequests ??
    (decisionCase?.automaticInformationRequest === undefined ? [] : [decisionCase.automaticInformationRequest]);
  for (const record of requestHistory) {
    const entry = requestFor(record.request.requestId);
    entry.policyRequested = record.schemaVersion !== "information-request-record-v2" || record.actor.kind === "bounded_policy";
    if (!entry.policyRequested) entry.operatorRequested = true;
    entry.request ??= record.request;
    entry.issuedAfter = latest(entry.issuedAfter, roundFor(record.preparedInputId)?.number);
  }
  for (const round of rounds) {
    for (const message of round.newMessages) {
      if (message.role !== "assistant" || message.governedClarification === undefined) continue;
      const entry = requestFor(message.governedClarification.requestId);
      entry.request = message.governedClarification;
      entry.answeredIn ??= round.number;
    }
  }
  // A question recorded against the answering (or a later) submission cannot establish
  // which earlier submission triggered the request. Keep the question, but do not invent
  // a send position or present the answering round as preceding itself.
  for (const entry of requests.values()) {
    if (entry.issuedAfter !== undefined && entry.answeredIn !== undefined && entry.issuedAfter >= entry.answeredIn) {
      entry.issuedAfter = undefined;
    }
  }

  const inProgress: CaseHistoryModel["inProgress"] = { dialogues: [] };
  const serverRecordedKeys = new Set<string>();
  for (const dialogue of decisionCase?.serverClarificationDialogues ?? []) {
    for (const message of currentServerMessages(dialogue)) serverRecordedKeys.add(interviewMessageKey(message));
    if (isActiveDialogue(dialogue)) {
      inProgress.dialogues.push(dialogue);
      if (requests.has(dialogue.requestId)) requestFor(dialogue.requestId).hasActiveDialogue = true;
    } else {
      requestFor(dialogue.requestId).dialogues.push(dialogue);
    }
  }
  const liveInterview = decisionCase?.liveInterview;
  if (liveInterview !== undefined && !inProgress.dialogues.some((dialogue) => dialogue.requestId === liveInterview.requestId)) {
    inProgress.liveInterview = liveInterview;
    if (requests.has(liveInterview.requestId)) requestFor(liveInterview.requestId).hasActiveDialogue = true;
  }

  for (const entry of requests.values()) {
    const sent = entry.issuedAfter === undefined ? undefined : rounds[entry.issuedAfter - 1];
    const answered = entry.answeredIn === undefined ? undefined : rounds[entry.answeredIn - 1];
    if (sent !== undefined) sent.requestsSent.push(entry);
    if (answered !== undefined) answered.requestsAnswered.push(entry);
    if (sent === undefined && answered === undefined) unlinked.requests.push(entry);
  }

  if (initialApplication !== undefined) {
    for (const message of initialApplication.messages) serverRecordedKeys.add(interviewMessageKey(message));
    if (isActiveDialogue(initialApplication)) {
      inProgress.initialDialogue = initialApplication;
    } else {
      const keys = initialApplication.messages.map(interviewMessageKey);
      const covering = rounds.find((round) => {
        const roundKeys = new Set(round.transcript.messages.map(interviewMessageKey));
        return keys.length > 0 && keys.every((key) => roundKeys.has(key));
      });
      if (covering === undefined) unlinked.initialDialogue = initialApplication;
      else covering.initialDialogue = initialApplication;
    }
  }

  return { rounds, inProgress, unlinked, serverRecordedKeys };
}
