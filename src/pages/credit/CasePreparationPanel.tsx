import { useIntl } from "react-intl";
import { clarificationItemText } from "./clarification-item-text";
import type { DecisionCase } from "./decision-types";
import { preparationReason } from "./case-preparation-copy";

/** Read-only workflow status. Agent requests are not a checklist for the operator. */
export function CasePreparationPanel({ decisionCase }: { decisionCase: Pick<DecisionCase, "casePreparation" | "informationRequests"> }) {
  const intl = useIntl();
  const preparation = decisionCase.casePreparation;
  if (preparation === undefined) return null;
  return (
    <section id="case-preparation" className="scroll-mt-4" aria-labelledby="case-preparation-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="case-preparation-title" className="text-sm font-semibold">
          {intl.formatMessage({ id: "credit.preparation.title", defaultMessage: "Case preparation" })}
        </h3>
        {preparation.automaticRequests.consent === "agent_follow_up_v2" && (
          <span className="text-xs text-muted-foreground">
            {intl.formatMessage(
              { id: "credit.preparation.roundBudget", defaultMessage: "{used} of {budget} automatic rounds used" },
              {
                used: preparation.automaticRequests.used,
                budget: preparation.automaticRequests.budget,
              }
            )}
          </span>
        )}
      </div>
      <div className="space-y-1 text-sm">
        {preparation.reasons.map((reason) => (
          <p key={reason}>{preparationReason(intl, reason)}</p>
        ))}
      </div>
      {preparation.rounds.length > 0 && (
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {preparation.rounds.map((round) => {
            const request = decisionCase.informationRequests?.find((record) => record.request.requestId === round.requestId);
            return (
              <li className="py-3" key={round.requestId}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {intl.formatMessage(
                      { id: "credit.preparation.round", defaultMessage: "Round {round} · {actor}" },
                      {
                        round: round.round,
                        actor:
                          round.actor === "operator"
                            ? intl.formatMessage({ id: "credit.preparation.actor.operator", defaultMessage: "Operator question" })
                            : intl.formatMessage({ id: "credit.preparation.actor.agent", defaultMessage: "Agent follow-up" }),
                      }
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {round.status === "answered"
                      ? intl.formatMessage({ id: "credit.preparation.answered", defaultMessage: "Reply received" })
                      : intl.formatMessage({ id: "credit.preparation.awaiting", defaultMessage: "Awaiting reply" })}
                  </span>
                </div>
                {request !== undefined && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {request.request.requiredItems.map((item, index) => (
                      <li key={index}>{clarificationItemText(item)}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {intl.formatDate(round.requestedAt, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      <a className="mt-3 inline-block text-sm text-primary hover:underline" href="#case-conversation">
        {intl.formatMessage({ id: "credit.preparation.conversation", defaultMessage: "Read the conversation" })}
      </a>
    </section>
  );
}
