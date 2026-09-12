import { describe, expect, it } from "vitest";
import { caseInvestigationRunSchema, informationNeedSchema } from "@bitcredit/ai-credit-shared";
import { currentUnadmittedInvestigationProposals } from "./investigation-proposals";

const submissionDigest = `sha256:${"a".repeat(64)}`;
const resultDigest = `sha256:${"b".repeat(64)}`;
const objective = { kind: "cost_breakdown" as const, sources: [{ answerIndex: 0, quote: "I only have a total." }] };
const run = caseInvestigationRunSchema.parse({
  schemaVersion: "case-investigation-run-v1",
  runId: "22222222-2222-4222-8222-222222222222",
  caseId: "case-1",
  preparedInputId: "11111111-1111-4111-8111-111111111111",
  submissionDigest,
  resultDigest,
  modelId: "test-reviewer",
  promptVersion: "case-answer-review-v1",
  status: "completed",
  startedAt: "2026-09-05T12:00:00Z",
  finishedAt: "2026-09-05T12:00:20Z",
  stoppingReason: "review_completed",
  needs: [objective],
});

describe("currentUnadmittedInvestigationProposals", () => {
  it("returns only current completed proposals that are not already governed information needs", () => {
    const decisionCase = { submissionDigest, resultDigest, caseInvestigation: { status: "completed" as const, runs: [run] } };
    expect(currentUnadmittedInvestigationProposals(decisionCase)).toEqual([{ runId: run.runId, needIndex: 0, need: objective }]);

    const admitted = informationNeedSchema.parse({
      schemaVersion: "information-need-v1",
      needId: `sha256:${"c".repeat(64)}`,
      caseId: run.caseId,
      preparedInputId: run.preparedInputId,
      question: "Provide the cost breakdown.",
      objective,
      purpose: "Establish the composition of the applicant's stated costs.",
      acceptableResponses: ["correct_answer", "upload_supporting_document", "explain_evidence_unavailable"],
      resolutionCriterion: "A reviewer reconciles the cost breakdown to cited evidence, or records the need as exhausted.",
      status: "open",
      reviewIsStale: false,
    });
    expect(currentUnadmittedInvestigationProposals({ ...decisionCase, informationNeeds: [admitted] })).toEqual([]);
  });

  it("ignores stale and incomplete work", () => {
    expect(
      currentUnadmittedInvestigationProposals({
        submissionDigest,
        resultDigest,
        caseInvestigation: {
          status: "completed",
          runs: [
            { ...run, resultDigest: `sha256:${"d".repeat(64)}` },
            { ...run, runId: "33333333-3333-4333-8333-333333333333", status: "failed", needs: [] },
          ],
        },
      })
    ).toEqual([]);
  });
});
