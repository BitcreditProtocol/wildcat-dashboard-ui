import type { DecisionCase } from "./decision-types";

/** Count used by the decision panel's pointer; mirrors what `CaseOpenPoints` renders. */
export function openPointCount(decisionCase: DecisionCase | undefined): number {
  if (decisionCase?.assessmentCurrency !== "current") return 0;
  return decisionCase.casePreparation?.openObjectives.length ?? 0;
}
