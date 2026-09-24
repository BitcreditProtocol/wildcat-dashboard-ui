import { describe, expect, it } from "vitest";
import {
  activeDialogue,
  firstInput,
  firstRun,
  firstSubmission,
  initialApplication,
  orphanDialogue,
  orphanQuestion,
  orphanRun,
  request,
  salesQuestion,
  secondInput,
  secondRun,
  submittedDialogue,
  twoSubmissionCase,
} from "./case-history.test-fixtures";
import { buildCaseHistory, interviewMessageKey } from "./case-rounds";

describe("buildCaseHistory", () => {
  it("orders submissions as retained and shows carried answers only where they were first recorded", () => {
    const { rounds } = buildCaseHistory(twoSubmissionCase, undefined);
    expect(rounds.map((round) => [round.number, round.preparedInputId])).toEqual([
      [1, firstInput],
      [2, secondInput],
    ]);
    expect(rounds[0]?.newMessages.map((message) => message.messageId)).toEqual(["q1", "a1"]);
    expect(rounds[1]?.newMessages.map((message) => message.messageId)).toEqual(["q2", "a2"]);
    expect(rounds[1]?.transcript.messages).toHaveLength(4);
  });

  it("does not duplicate a submission retained in both history and the current transcript", () => {
    const { rounds } = buildCaseHistory({ interviewHistory: [firstSubmission], interviewTranscript: firstSubmission }, undefined);
    expect(rounds).toHaveLength(1);
  });

  it("binds runs and questions by prepared input and leaves unmatched records unlinked regardless of time", () => {
    const { rounds, unlinked } = buildCaseHistory(twoSubmissionCase, undefined);
    expect(rounds[0]?.runs).toEqual([firstRun]);
    expect(rounds[1]?.runs).toEqual([secondRun]);
    expect(rounds[0]?.needs).toEqual([{ need: salesQuestion, historical: false }]);
    expect(rounds[1]?.needs).toEqual([]);
    // Started between the two submissions, yet never placed by timestamp.
    expect(unlinked.runs).toEqual([orphanRun]);
    expect(unlinked.needs).toEqual([{ need: orphanQuestion, historical: false }]);
  });

  it("links a request to the submission its questions came from and the submission that contains it", () => {
    const { rounds } = buildCaseHistory(twoSubmissionCase, undefined);
    const sent = rounds[0]?.requestsSent ?? [];
    expect(sent.map((entry) => entry.requestId)).toEqual([request.requestId]);
    expect(sent[0]).toMatchObject({ issuedAfter: 1, answeredIn: 2, request, policyRequested: false });
    expect(sent[0]?.needs.map(({ need }) => need.needId)).toEqual([salesQuestion.needId]);
    expect(sent[0]?.dialogues).toEqual([submittedDialogue]);
    expect(rounds[1]?.requestsAnswered).toEqual(sent);
    expect(rounds[1]?.requestsSent).toEqual([]);
  });

  it("does not claim a request was sent after the submission that already contains it", () => {
    const questionOnAnswer = { ...salesQuestion, preparedInputId: secondInput };
    const { rounds } = buildCaseHistory({ ...twoSubmissionCase, informationNeeds: [questionOnAnswer] }, undefined);
    expect(rounds[1]?.requestsSent).toEqual([]);
    expect(rounds[1]?.requestsAnswered[0]).toMatchObject({ requestId: request.requestId, answeredIn: 2 });
    expect(rounds[1]?.requestsAnswered[0]?.issuedAfter).toBeUndefined();
  });

  it("keeps active conversations in progress and unbound requests unlinked", () => {
    const { inProgress, unlinked } = buildCaseHistory(twoSubmissionCase, undefined);
    expect(inProgress.dialogues).toEqual([activeDialogue]);
    // An active dialogue alone does not invent a request record.
    expect(unlinked.requests.map((entry) => entry.requestId)).toEqual([orphanDialogue.requestId]);
    expect(unlinked.requests[0]?.dialogues).toEqual([orphanDialogue]);
  });

  it("marks the policy actor only for the recorded automatic request", () => {
    const automatic = {
      preparedInputId: firstInput,
      request: { ...request, schemaVersion: "credit-clarification-request-v3" },
    } as unknown as NonNullable<Parameters<typeof buildCaseHistory>[0]>["automaticInformationRequest"];
    const { rounds } = buildCaseHistory({ ...twoSubmissionCase, automaticInformationRequest: automatic }, undefined);
    expect(rounds[0]?.requestsSent[0]?.policyRequested).toBe(true);
  });

  it("attaches a submitted initial dialogue only to a submission containing every exact message", () => {
    const covered = buildCaseHistory(twoSubmissionCase, initialApplication);
    expect(covered.rounds[0]?.initialDialogue).toBe(initialApplication);
    expect(covered.unlinked.initialDialogue).toBeUndefined();
    for (const message of initialApplication.messages) expect(covered.serverRecordedKeys.has(interviewMessageKey(message))).toBe(true);

    const different = { ...initialApplication, messages: [{ messageId: "x", role: "applicant" as const, text: "Different wording" }] };
    const uncovered = buildCaseHistory(twoSubmissionCase, different);
    expect(uncovered.rounds.some((round) => round.initialDialogue !== undefined)).toBe(false);
    expect(uncovered.unlinked.initialDialogue).toBe(different);

    const active = buildCaseHistory(undefined, { ...initialApplication, status: "interviewing" });
    expect(active.rounds).toEqual([]);
    expect(active.inProgress.initialDialogue?.status).toBe("interviewing");
  });
});
