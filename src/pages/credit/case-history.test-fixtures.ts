import { caseInvestigationRunSchema, type InformationNeed, type ServerInitialObservation } from "@bitcredit/ai-credit-shared";
import type { GovernedClarificationRequest } from "./case-rounds";
import type { DecisionCase, InterviewTranscript, ServerClarificationObservation } from "./decision-types";

/** Synthetic two-submission case: answer review on submission 1 raised a question that a Mint request carried to submission 2. */
export const firstInput = "11111111-1111-4111-8111-111111111111";
export const secondInput = "22222222-2222-4222-8222-222222222222";
export const unknownInput = "99999999-9999-4999-8999-999999999999";
export const submissionDigest = `sha256:${"a".repeat(64)}`;
export const resultDigest = `sha256:${"b".repeat(64)}`;

export const request: GovernedClarificationRequest = {
  schemaVersion: "credit-clarification-request-v1",
  requestId: "request-1",
  caseId: "case-1",
  snapshotDigest: "sha256:snapshot",
  resultDigest,
  reasonCode: "sales",
  requiredItems: ["Show the buyer's purchase order."],
  availableActions: ["correct_answer", "upload_supporting_document"],
  requestedAt: "2026-09-10T09:00:00.000Z",
  synthetic: true,
};

const opening = {
  messageId: "q1",
  role: "assistant",
  templateId: "aiCredit.interview.repayment",
  text: "When will your buyer pay?",
} as const;
const answer = { messageId: "a1", role: "applicant", text: "In December, after the harvest." } as const;

export const firstSubmission: InterviewTranscript = {
  schemaVersion: "interview-transcript-v1",
  caseId: "case-1",
  preparedInputId: firstInput,
  language: "en",
  questionGraphVersion: "coffee-v1",
  promptVersion: "v1",
  modelId: "live-interviewer",
  messages: [opening, answer],
};

export const secondSubmission: InterviewTranscript = {
  ...firstSubmission,
  preparedInputId: secondInput,
  messages: [
    opening,
    answer,
    {
      messageId: "q2",
      role: "assistant",
      templateId: "aiCredit.interview.governedClarification",
      text: "Please show the buyer's purchase order.",
      governedClarification: request,
    },
    { messageId: "a2", role: "applicant", text: "The purchase order is attached." },
  ],
};

const runBase = {
  schemaVersion: "case-investigation-run-v1",
  caseId: "case-1",
  submissionDigest,
  resultDigest,
  modelId: "bounded-answer-reviewer",
  promptVersion: "case-answer-review-v1",
  status: "completed",
  startedAt: "2026-09-10T08:00:00.000Z",
  finishedAt: "2026-09-10T08:00:20.000Z",
  stoppingReason: "review_completed",
} as const;

export const firstRun = caseInvestigationRunSchema.parse({
  ...runBase,
  runId: "33333333-3333-4333-8333-333333333333",
  preparedInputId: firstInput,
  needs: [{ kind: "sales_evidence", sources: [{ answerIndex: 1, quote: "In December, after the harvest." }] }],
});
export const secondRun = caseInvestigationRunSchema.parse({
  ...runBase,
  runId: "44444444-4444-4444-8444-444444444444",
  preparedInputId: secondInput,
  needs: [],
});
/** Started between the two submissions, but bound to no retained submission. */
export const orphanRun = caseInvestigationRunSchema.parse({
  ...runBase,
  runId: "55555555-5555-4555-8555-555555555555",
  preparedInputId: unknownInput,
  startedAt: "2026-09-10T08:30:00.000Z",
  finishedAt: "2026-09-10T08:30:20.000Z",
  needs: [],
});

export const salesQuestion: InformationNeed = {
  schemaVersion: "information-need-v1",
  needId: `sha256:${"1".repeat(64)}`,
  caseId: "case-1",
  preparedInputId: firstInput,
  origin: { runId: firstRun.runId, needIndex: 0, requestId: request.requestId },
  question: "What supports the expected sales?",
  objective: { kind: "sales_evidence", sources: [{ answerIndex: 1, quote: "In December, after the harvest." }] },
  response: "The purchase order is attached.",
  status: "resolved",
  review: {
    schemaVersion: "information-need-review-v2",
    needId: `sha256:${"1".repeat(64)}`,
    caseId: "case-1",
    resultDigest,
    submissionDigest,
    outcome: "resolved",
    basis: "The purchase order names the buyer and the December delivery.",
    evidenceDigests: [`sha256:${"4".repeat(64)}`],
    reviewedBy: "reviewer-7",
    reviewerRole: "reviewer",
    reviewedAt: "2026-09-11T10:00:00.000Z",
  },
  reviewIsStale: false,
};
export const orphanQuestion: InformationNeed = {
  schemaVersion: "information-need-v1",
  needId: `sha256:${"2".repeat(64)}`,
  caseId: "case-1",
  preparedInputId: unknownInput,
  question: "Which costs does the loan cover?",
  objective: { kind: "cost_breakdown", sources: [{ answerIndex: 0, quote: "Harvest costs" }] },
  status: "open",
  reviewIsStale: false,
};

const dialogueBase = {
  source: "server_interview",
  billId: "bill-1",
  caseId: "case-1",
  snapshotDigest: "sha256:snapshot",
  resultDigest,
  revision: 3,
  updatedAt: "2026-09-10T09:30:00.000Z",
  language: "en",
  questionGraphVersion: "server-clarification-v1",
  promptVersion: "server-clarification-v1",
  modelId: "live-interviewer",
} as const;
export const submittedDialogue: ServerClarificationObservation = {
  ...dialogueBase,
  requestId: request.requestId,
  dialogueId: "66666666-6666-4666-8666-666666666666",
  status: "submitted",
  messages: secondSubmission.messages.slice(2),
};
export const activeDialogue: ServerClarificationObservation = {
  ...dialogueBase,
  requestId: "request-2",
  dialogueId: "77777777-7777-4777-8777-777777777777",
  status: "interviewing",
  messages: [{ messageId: "live-a3", role: "applicant", text: "Uploading the invoice now." }],
};
export const orphanDialogue: ServerClarificationObservation = {
  ...dialogueBase,
  requestId: "request-3",
  dialogueId: "88888888-8888-4888-8888-888888888888",
  status: "superseded",
  messages: [],
};

export const initialApplication: ServerInitialObservation = {
  source: "server_interview",
  billId: "bill-1",
  caseId: "case-1",
  mintQuoteId: "quote-1",
  dialogueId: "initial-1",
  revision: 2,
  updatedAt: "2026-09-10T07:00:00.000Z",
  language: "en",
  modelId: "live-interviewer",
  promptVersion: "initial-v1",
  questionGraphVersion: "initial-v1",
  status: "submitted",
  messages: firstSubmission.messages,
};

export const twoSubmissionCase = {
  submissionDigest,
  resultDigest,
  interviewHistory: [firstSubmission],
  interviewTranscript: secondSubmission,
  caseInvestigation: { status: "completed", runs: [firstRun, secondRun, orphanRun] },
  informationNeeds: [salesQuestion, orphanQuestion],
  serverClarificationDialogues: [submittedDialogue, activeDialogue, orphanDialogue],
  claimInvestigation: {
    status: "available",
    proposal: {
      schemaVersion: "claim-investigation-proposal-v1",
      caseId: "case-1",
      snapshotDigest: "sha256:snapshot",
      resultDigest,
      inputDigest: submissionDigest,
      promptVersion: "claim-investigation-v1",
      modelId: "public-researcher",
      assessedAt: "2026-09-10T08:10:00.000Z",
      authority: "display_only_model_proposal",
      evidenceAnchors: [],
      searchQueries: ["coffee export prices 2026"],
      toolReceipts: [{ sequence: 1, observedAt: "2026-09-10T08:05:00.000Z", kind: "search", query: "coffee export prices 2026" }],
      findings: [
        {
          track: "market_context",
          status: "public_context",
          claim: { source: "applicant_confirmed", preparedInputId: firstInput, field: "repayment_source", value: "Coffee sales" },
          summary: "Public price series for green coffee exports.",
          sources: [{ title: "Export price index", url: "https://example.org/coffee", excerpt: "Monthly export prices." }],
        },
      ],
    },
  },
} satisfies Partial<DecisionCase> as Pick<
  DecisionCase,
  | "submissionDigest"
  | "resultDigest"
  | "interviewHistory"
  | "interviewTranscript"
  | "caseInvestigation"
  | "informationNeeds"
  | "serverClarificationDialogues"
  | "claimInvestigation"
>;
