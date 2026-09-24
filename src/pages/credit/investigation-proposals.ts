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
      admittedNeeds.some(
        (recorded) =>
          recorded.caseId === run.caseId &&
          ((recorded.preparedInputId === run.preparedInputId && sameObjective(recorded.objective, need)) ||
            // A later assessment may cite different words for the same still-open
            // repayment/sales/cost question. Do not advertise it as a new request.
            (need.kind !== "answer_difference" &&
              recorded.objective.kind === need.kind &&
              (recorded.status !== "resolved" || recorded.reviewIsStale)))
      )
        ? []
        : [{ runId: run.runId, needIndex, need }]
    );
  });
}

/**
 * The proposals an approver may select for an applicant request: the unadmitted set above,
 * minus any proposal whose exact run/need origin is already recorded as a current or
 * historical need. This is the intersection of the host rule and the operator-ui package
 * rule, so the Review tab never offers more than either one did. Display preparation only;
 * the server resolves and validates every selection.
 */
export function selectableInvestigationProposals(
  decisionCase: Pick<
    OperatorWorkbenchDecisionCase,
    "caseInvestigation" | "informationNeeds" | "historicalInformationNeeds" | "resultDigest" | "submissionDigest"
  >
): CurrentInvestigationProposal[] {
  const recorded = [...(decisionCase.informationNeeds ?? []), ...(decisionCase.historicalInformationNeeds ?? [])];
  return currentUnadmittedInvestigationProposals(decisionCase).filter(
    (proposal) => !recorded.some((need) => need.origin?.runId === proposal.runId && need.origin.needIndex === proposal.needIndex)
  );
}
