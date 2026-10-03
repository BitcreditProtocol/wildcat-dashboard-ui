import { CircleAlert } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { preparationReason } from "./case-preparation-copy";
import type { DecisionCase } from "./decision-types";
import { investigationNeedKindMessages } from "./information-need-status";

const messages = defineMessages({
  title: {
    id: "credit.openPoints.title",
    defaultMessage: "Open points for your judgment",
    description: "Agent-identified gaps on the current case that were not asked; not blockers or findings",
  },
  intro: {
    id: "credit.openPoints.intro",
    defaultMessage:
      "Case preparation raised these from the applicant's own answers. They are unverified, and missing information is not grounds for denial.",
    description: "Provenance and limits of the open points",
  },
  notAsked: {
    id: "credit.openPoints.notAsked",
    defaultMessage: "Agent · not asked yet",
    description: "An eligible agent objective that has not been put to the applicant",
  },
  agentAsking: {
    id: "credit.openPoints.agentAsking",
    defaultMessage: "Agent · preparing a question",
    description: "The agent is preparing an applicant request covering this objective",
  },
  source: {
    id: "credit.openPoints.source",
    defaultMessage: "Applicant, answer {index}",
    description: "Which applicant answer the quoted source text comes from",
  },
  askHint: {
    id: "credit.openPoints.askHint",
    defaultMessage: "To raise a point with the applicant, use Ask the applicant.",
    description: "Where the optional operator question lives; the operator is not required to ask",
  },
});

/** Reasons that explain why an eligible objective was not asked automatically. */
const NOT_ASKED_REASONS = new Set([
  "automatic_requests_disabled",
  "automatic_requests_not_consented",
  "automatic_request_budget_exhausted",
  "legacy_consent_one_question",
]);

/**
 * What case preparation left open on the current assessment: eligible agent objectives that were not
 * asked, with the applicant's own words as their source. Display only; it neither blocks nor enables a
 * decision. Snapshot contradictions are hard gates and stay with the brief's blockers, not here.
 */
export function CaseOpenPoints({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  if (decisionCase.assessmentCurrency !== "current") return null;
  const preparation = decisionCase.casePreparation;
  const objectives = preparation?.openObjectives ?? [];
  if (objectives.length === 0) return null;
  // The agent is about to ask: inviting the operator to ask as well would duplicate the question.
  const agentAsking = preparation?.reasons.includes("agent_request_pending") === true || preparation?.status === "preparing";
  const notAskedReasons = (preparation?.reasons ?? []).filter((reason) => NOT_ASKED_REASONS.has(reason));

  return (
    <section
      id="case-open-points"
      aria-labelledby="case-open-points-title"
      className="scroll-mt-4 rounded-lg border border-signal-alert/30 bg-card print:hidden"
    >
      <header className="border-b border-border px-6 py-4">
        <h2 id="case-open-points-title" className="flex items-center gap-2 text-sm font-semibold">
          <CircleAlert className="size-4 text-signal-alert" aria-hidden="true" />
          {intl.formatMessage(messages.title)}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.intro)}</p>
      </header>
      <ul className="divide-y divide-border">
        {objectives.map((objective, index) => (
          <li key={`${objective.kind}:${String(index)}`} className="px-6 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium">{intl.formatMessage(investigationNeedKindMessages[objective.kind])}</p>
              <p className="text-xs text-muted-foreground">{intl.formatMessage(agentAsking ? messages.agentAsking : messages.notAsked)}</p>
            </div>
            {objective.sources.map((source) => (
              <blockquote key={`${String(source.answerIndex)}:${source.quote}`} className="mt-2 border-l-2 border-divider-200 pl-3">
                <p className="text-sm break-words">“{source.quote}”</p>
                <footer className="mt-0.5 text-xs text-muted-foreground">
                  {intl.formatMessage(messages.source, { index: source.answerIndex + 1 })}
                </footer>
              </blockquote>
            ))}
          </li>
        ))}
      </ul>
      <footer className="space-y-1 border-t border-border bg-elevation-50 px-6 py-3 text-xs text-muted-foreground">
        {notAskedReasons.map((reason) => (
          <p key={reason}>{preparationReason(intl, reason)}</p>
        ))}
        {!agentAsking && <p>{intl.formatMessage(messages.askHint)}</p>}
      </footer>
    </section>
  );
}
