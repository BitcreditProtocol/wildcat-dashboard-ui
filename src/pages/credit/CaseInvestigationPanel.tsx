import { CaseInvestigationPanel as Investigation } from "@bitcredit/ai-credit-operator-ui";
import { informationNeedGuidance, type InvestigationNeedSelection, type InterviewInformationNeed } from "@bitcredit/ai-credit-shared";
import { defineMessages, useIntl } from "react-intl";
import type { DecisionCase } from "./decision-types";
import { informationNeedResponseLabel } from "./information-need-response-labels";

const messages = defineMessages({
  requestPreview: {
    id: "credit.investigation.requestPreview",
    defaultMessage: "Applicant request preview",
    description: "Preview of selected investigator proposals before an approver admits them",
  },
  purpose: {
    id: "credit.investigation.purpose",
    defaultMessage: "Purpose",
    description: "Purpose of a selected investigator follow-up",
  },
  acceptedResponses: {
    id: "credit.investigation.acceptedResponses",
    defaultMessage: "Accepted response paths",
    description: "Ways an applicant may respond to a selected investigator follow-up",
  },
  resolution: {
    id: "credit.investigation.resolution",
    defaultMessage: "Resolution requirement",
    description: "Evidence review requirement for resolving an admitted investigator follow-up",
  },
});

function selectedObjectives(
  decisionCase: Parameters<typeof CaseInvestigationPanel>[0]["decisionCase"],
  selectedNeeds: readonly InvestigationNeedSelection[]
): InterviewInformationNeed[] {
  return selectedNeeds.flatMap((selection) => {
    const run = decisionCase?.caseInvestigation?.runs.find((entry) => entry.runId === selection.runId);
    const need = run?.needs[selection.needIndex];
    return run?.status === "completed" &&
      run.resultDigest === decisionCase?.resultDigest &&
      run.submissionDigest === decisionCase.submissionDigest &&
      need !== undefined
      ? [need]
      : [];
  });
}

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
  const intl = useIntl();
  const objectives = selectedObjectives(decisionCase, selectedNeeds);
  return (
    <div className="space-y-4">
      <Investigation
        decisionCase={decisionCase}
        conversationHref="#case-conversation"
        questionsHref="#evidence-questions"
        selectedNeeds={selectedNeeds}
        onSelectedNeedsChange={onSelectedNeedsChange}
        selectionDisabled={selectionDisabled}
      />
      {objectives.length > 0 && (
        <section className="rounded-lg border border-border bg-elevation-100 p-4" aria-labelledby="investigation-request-preview">
          <h3 id="investigation-request-preview" className="text-sm font-semibold">
            {intl.formatMessage(messages.requestPreview)}
          </h3>
          <div className="mt-3 space-y-4">
            {objectives.map((objective, objectiveIndex) => {
              const guidance = informationNeedGuidance(objective.kind);
              return (
                <dl key={`${objective.kind}:${String(objectiveIndex)}`} className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.purpose)}</dt>
                    <dd className="mt-1">{guidance.purpose}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.acceptedResponses)}</dt>
                    <dd className="mt-1">
                      {intl.formatList(
                        guidance.acceptableResponses.map((response) => informationNeedResponseLabel(intl, response)),
                        {
                          type: "disjunction",
                        }
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.resolution)}</dt>
                    <dd className="mt-1">{guidance.resolutionCriterion}</dd>
                  </div>
                </dl>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
