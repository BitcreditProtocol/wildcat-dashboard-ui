import { CaseInvestigationPanel as Investigation } from "@bitcredit/ai-credit-operator-ui";
import type { DecisionCase } from "./decision-types";

/**
 * Read-only record of answer reviews, retained evidence follow-ups and public research.
 * No selection handler is passed, so the package renders no proposal checkboxes; the
 * Review tab's ProposedFollowUps is the only place an approver selects proposals.
 * Host owns fragment navigation; the investigation view lives in AI-Credit.
 */
export function CaseInvestigationPanel({
  decisionCase,
  updatesStatus,
}: {
  decisionCase:
    | Pick<
        DecisionCase,
        | "caseInvestigation"
        | "submissionDigest"
        | "resultDigest"
        | "informationNeeds"
        | "historicalInformationNeeds"
        | "claimInvestigation"
        | "applicantConfirmation"
        | "automaticInformationRequest"
      >
    | undefined;
  updatesStatus?: Parameters<typeof Investigation>[0]["updatesStatus"];
}) {
  return (
    <Investigation
      decisionCase={decisionCase}
      conversationHref="#case-conversation"
      questionsHref="#evidence-questions"
      updatesStatus={updatesStatus}
    />
  );
}
