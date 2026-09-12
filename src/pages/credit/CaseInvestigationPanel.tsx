import { CaseInvestigationPanel as Investigation } from "@bitcredit/ai-credit-operator-ui";
import type { InvestigationNeedSelection } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "./decision-types";

/** Host owns fragment navigation; the read-only investigation view lives in AI-Credit. */
export function CaseInvestigationPanel({
  decisionCase,
  selectedNeeds,
  onSelectedNeedsChange,
  selectionDisabled,
}: {
  decisionCase: Pick<DecisionCase, "caseInvestigation" | "submissionDigest" | "resultDigest" | "informationNeeds"> | undefined;
  selectedNeeds: readonly InvestigationNeedSelection[];
  onSelectedNeedsChange: (needs: InvestigationNeedSelection[]) => void;
  selectionDisabled: boolean;
}) {
  return (
    <Investigation
      decisionCase={decisionCase}
      conversationHref="#case-conversation"
      questionsHref="#evidence-questions"
      selectedNeeds={selectedNeeds}
      onSelectedNeedsChange={onSelectedNeedsChange}
      selectionDisabled={selectionDisabled}
    />
  );
}
