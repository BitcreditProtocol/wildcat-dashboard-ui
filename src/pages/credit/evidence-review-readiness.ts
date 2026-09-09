import { caseInvestigationPending, informationNeedRequiredItems, unresolvedInformationNeeds } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "./decision-types";

export function pendingCaseInvestigation(decisionCase: DecisionCase | undefined): boolean {
  return caseInvestigationPending(decisionCase?.caseInvestigation);
}

/** Shared preparation rule; neither a new risk score nor a browser authorization check. */
export function pendingEvidenceQuestionCount(decisionCase: DecisionCase | undefined): number {
  if (decisionCase === undefined) return 0;
  return unresolvedInformationNeeds(decisionCase.informationNeeds ?? [], {
    caseId: decisionCase.snapshot.caseId,
    resultDigest: decisionCase.resultDigest,
    submissionDigest: decisionCase.submissionDigest,
  }).length;
}

export function pendingEvidenceRequiredItems(decisionCase: DecisionCase | undefined): string[] {
  if (decisionCase === undefined) return [];
  return informationNeedRequiredItems(decisionCase.informationNeeds ?? [], {
    caseId: decisionCase.snapshot.caseId,
    resultDigest: decisionCase.resultDigest,
    submissionDigest: decisionCase.submissionDigest,
  });
}
