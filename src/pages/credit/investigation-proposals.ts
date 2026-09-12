import type { InterviewInformationNeed, OperatorWorkbenchDecisionCase } from "@bitcredit/ai-credit-shared";

export interface CurrentInvestigationProposal {
  runId: string;
  needIndex: number;
  need: InterviewInformationNeed;
}

function sameObjective(left: InterviewInformationNeed, right: InterviewInformationNeed): boolean {
  return (
    left.kind === right.kind &&
    left.sources.length === right.sources.length &&
    left.sources.every(
      (source, index) => source.answerIndex === right.sources[index]?.answerIndex && source.quote === right.sources[index]?.quote
    )
  );
}

/**
 * Current, completed answer-review proposals that have not already entered the
 * governed information-need record. This is display preparation only.
 */
export function currentUnadmittedInvestigationProposals(
  decisionCase: Pick<OperatorWorkbenchDecisionCase, "caseInvestigation" | "informationNeeds" | "resultDigest" | "submissionDigest">
): CurrentInvestigationProposal[] {
  if (decisionCase.submissionDigest === undefined) return [];
  const admittedNeeds = decisionCase.informationNeeds ?? [];

  return (decisionCase.caseInvestigation?.runs ?? []).flatMap((run) => {
    if (
      run.status !== "completed" ||
      run.resultDigest !== decisionCase.resultDigest ||
      run.submissionDigest !== decisionCase.submissionDigest
    )
      return [];

    return run.needs.flatMap((need, needIndex) =>
      admittedNeeds.some((recorded) => recorded.preparedInputId === run.preparedInputId && sameObjective(recorded.objective, need))
        ? []
        : [{ runId: run.runId, needIndex, need }]
    );
  });
}
