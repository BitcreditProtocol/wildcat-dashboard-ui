import { Button } from "@bitcredit/ui-library";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { InformationNeed } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "./decision-types";
import { reviewInformationNeed, type InformationNeedReviewFailure, type OperatorCapability } from "./record-operator-decision";

const failureMessages = defineMessages({
  reviewer_required: {
    id: "credit.needs.error.reviewerRequired",
    defaultMessage: "An authenticated evidence reviewer is required.",
    description: "Evidence review requires the host's validated reviewer capability",
  },
  review_rejected: {
    id: "credit.needs.error.rejected",
    defaultMessage: "Review not accepted. Refresh the case and check the current evidence before retrying.",
    description: "Generic rejection without exposing raw upstream error text",
  },
  review_unconfirmed: {
    id: "credit.needs.error.unconfirmed",
    defaultMessage: "Could not confirm the review. Check the current case before retrying; your inputs were kept.",
    description: "Network or service failure does not prove that the review had no effect",
  },
} satisfies Record<InformationNeedReviewFailure, { id: string; defaultMessage: string; description: string }>);

const messages = defineMessages({
  title: { id: "credit.needs.title", defaultMessage: "Evidence questions", description: "Persistent evidence questions from interviews" },
  open: { id: "credit.needs.open", defaultMessage: "Open", description: "No current evidence review" },
  answered: {
    id: "credit.needs.answered",
    defaultMessage: "Answered · unverified",
    description: "Applicant reply does not prove the claim",
  },
  earlierSubmission: {
    id: "credit.needs.earlierSubmission",
    defaultMessage: "Earlier submission · unresolved",
    description: "An unresolved evidence concern retained from an earlier applicant submission",
  },
  resolved: {
    id: "credit.needs.resolved",
    defaultMessage: "Support reviewed",
    description: "Human-reviewed support, not independent truth",
  },
  exhausted: {
    id: "credit.needs.exhausted",
    defaultMessage: "Unresolved · evidence unavailable",
    description: "Review ended without resolving the evidence gap",
  },
  stale: {
    id: "credit.needs.stale",
    defaultMessage: "Reopened · assessment changed",
    description: "Previous evidence review is no longer current",
  },
  response: { id: "credit.needs.response", defaultMessage: "Applicant answer", description: "Untrusted reply to this question" },
  basis: {
    id: "credit.needs.basis",
    defaultMessage: "Review basis",
    description: "Specific evidence and conclusion recorded by the human reviewer",
  },
  outcome: {
    id: "credit.needs.outcome",
    defaultMessage: "Review outcome",
    description: "Choose a result of evidence review, not a credit decision",
  },
  choose: { id: "credit.needs.choose", defaultMessage: "Select outcome", description: "No review outcome is preselected" },
  evidence: {
    id: "credit.needs.evidence",
    defaultMessage: "Supporting documents",
    description: "Current evidence selected by the reviewer",
  },
  save: { id: "credit.needs.save", defaultMessage: "Save review", description: "Save the append-only evidence review" },
});

type NeedCase = Pick<
  DecisionCase,
  "resultDigest" | "submissionDigest" | "assessmentCurrency" | "submittedEvidence" | "informationNeeds" | "applicantConfirmation"
> & {
  snapshot: Pick<DecisionCase["snapshot"], "bill">;
};

function NeedRow({
  need,
  decisionCase,
  capability,
}: {
  need: InformationNeed;
  decisionCase: NeedCase;
  capability: OperatorCapability | undefined;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const outcomeId = useId();
  const basisId = useId();
  const [outcome, setOutcome] = useState<"resolved" | "exhausted" | "">("");
  const [basis, setBasis] = useState("");
  const [evidenceDigests, setEvidenceDigests] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<InformationNeedReviewFailure | null>(null);
  const isEarlierSubmission =
    decisionCase.applicantConfirmation !== undefined && need.preparedInputId !== decisionCase.applicantConfirmation.preparedInputId;
  const status = need.reviewIsStale
    ? messages.stale
    : need.status === "resolved"
      ? messages.resolved
      : need.status === "exhausted"
        ? messages.exhausted
        : need.response === undefined
          ? messages.open
          : messages.answered;
  const save = async () => {
    const billId = decisionCase.snapshot.bill?.billId;
    if (
      inFlight.current ||
      capability === undefined ||
      decisionCase.assessmentCurrency !== "current" ||
      need.status === "resolved" ||
      outcome === "" ||
      billId === undefined ||
      decisionCase.submissionDigest === undefined ||
      basis.trim().length < 20 ||
      basis.trim().length > 2000 ||
      (outcome === "resolved" && evidenceDigests.length === 0)
    )
      return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await reviewInformationNeed(
        {
          billId,
          caseId: need.caseId,
          decisionResultDigest: decisionCase.resultDigest,
          submissionDigest: decisionCase.submissionDigest,
          needId: need.needId,
          outcome,
          basis: basis.trim(),
          evidenceDigests,
          ...(need.review === undefined ? {} : { expectedReview: need.review }),
        },
        capability
      );
      if (!result.ok) {
        setError(result.errorCode);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <details className="border-t border-border py-3">
      <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-2 text-sm">
        <span className="min-w-0 flex-1 break-words">{need.question}</span>
        <span className="text-xs text-muted-foreground">
          {isEarlierSubmission && need.status !== "resolved" && (
            <span className="block">{intl.formatMessage(messages.earlierSubmission)}</span>
          )}
          <span className="block">{intl.formatMessage(status)}</span>
        </span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        {need.objective.sources.map((source) => (
          <blockquote key={`${source.answerIndex}:${source.quote}`} className="border-l-2 border-border pl-3 text-muted-foreground">
            {source.quote}
          </blockquote>
        ))}
        {need.response !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.response)}</p>
            <p className="mt-1 break-words">{need.response}</p>
          </div>
        )}
        {need.review !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage(messages.basis)} · {need.review.reviewedBy}
            </p>
            <p className="mt-1 break-words">{need.review.basis}</p>
          </div>
        )}
        {need.status !== "resolved" &&
          capability !== undefined &&
          decisionCase.submissionDigest !== undefined &&
          decisionCase.assessmentCurrency === "current" && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div>
                <label htmlFor={outcomeId} className="block text-xs">
                  {intl.formatMessage(messages.outcome)}
                </label>
                <select
                  id={outcomeId}
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm"
                  value={outcome}
                  disabled={pending}
                  onChange={(event) => {
                    if (event.target.value === "resolved" || event.target.value === "exhausted" || event.target.value === "")
                      setOutcome(event.target.value);
                  }}
                >
                  <option value="">{intl.formatMessage(messages.choose)}</option>
                  <option value="resolved">{intl.formatMessage(messages.resolved)}</option>
                  <option value="exhausted">{intl.formatMessage(messages.exhausted)}</option>
                </select>
              </div>
              <fieldset disabled={pending}>
                <legend className="text-xs">{intl.formatMessage(messages.evidence)}</legend>
                {(decisionCase.submittedEvidence ?? [])
                  .filter((evidence) => evidence.contentDigest.startsWith("sha256:"))
                  .map((evidence) => (
                    <label key={evidence.contentDigest} className="mt-2 flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={evidenceDigests.includes(evidence.contentDigest)}
                        onChange={(event) =>
                          setEvidenceDigests(
                            event.target.checked
                              ? [...evidenceDigests, evidence.contentDigest]
                              : evidenceDigests.filter((digest) => digest !== evidence.contentDigest)
                          )
                        }
                      />
                      <span className="break-words">{evidence.label}</span>
                    </label>
                  ))}
              </fieldset>
              <div>
                <label htmlFor={basisId} className="block text-xs">
                  {intl.formatMessage(messages.basis)}
                </label>
                <textarea
                  id={basisId}
                  className="mt-1 block min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm"
                  value={basis}
                  minLength={20}
                  maxLength={2000}
                  required
                  disabled={pending}
                  onChange={(event) => setBasis(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={pending || outcome === "" || basis.trim().length < 20 || (outcome === "resolved" && evidenceDigests.length === 0)}
              >
                {intl.formatMessage(messages.save)}
              </Button>
              {error !== null && (
                <p role="alert" className="text-sm text-destructive">
                  {intl.formatMessage(failureMessages[error])}
                </p>
              )}
            </form>
          )}
      </div>
    </details>
  );
}

export function InformationNeedsPanel({
  decisionCase,
  capability,
}: {
  decisionCase: NeedCase;
  capability: OperatorCapability | undefined;
}) {
  const intl = useIntl();
  const needs = decisionCase.informationNeeds ?? [];
  if (needs.length === 0) return null;
  return (
    <section id="evidence-questions" className="mt-4 scroll-mt-4 border-t border-border pt-4">
      <h5 className="mb-3 text-sm font-semibold">{intl.formatMessage(messages.title)}</h5>
      {needs.map((need) => (
        <NeedRow
          key={`${need.needId}:${decisionCase.resultDigest}:${decisionCase.submissionDigest ?? "legacy"}:${JSON.stringify(need.review)}`}
          need={need}
          decisionCase={decisionCase}
          capability={capability}
        />
      ))}
    </section>
  );
}
