import { CaseInvestigationPanel as Investigation } from "@bitcredit/ai-credit-operator-ui";
import type { DecisionCase } from "./decision-types";

/** Host owns fragment navigation; the read-only investigation view lives in AI-Credit. */
export function CaseInvestigationPanel({
  decisionCase,
}: {
  decisionCase: Pick<DecisionCase, "caseInvestigation" | "submissionDigest" | "resultDigest" | "informationNeeds"> | undefined;
}) {
  return <Investigation decisionCase={decisionCase} conversationHref="#case-conversation" questionsHref="#evidence-questions" />;
}
