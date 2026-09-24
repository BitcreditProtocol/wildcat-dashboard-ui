import { informationNeedGuidance, type InvestigationNeedSelection } from "@bitcredit/ai-credit-shared";
import { defineMessages, useIntl } from "react-intl";
import { informationNeedResponseLabel } from "./information-need-response-labels";
import { investigationNeedKindMessages as kindMessages } from "./information-need-status";
import type { CurrentInvestigationProposal } from "./investigation-proposals";

const messages = defineMessages({
  title: {
    id: "credit.followUps.title",
    defaultMessage: "Proposed follow-ups",
    description: "Answer-review proposals an approver may add to the governed applicant request",
  },
  provenance: {
    id: "credit.followUps.provenance",
    defaultMessage: "Answer reviewer · model proposal · not sent to the applicant",
    description: "Authorship and delivery state of proposed follow-ups; a model proposal is not a request or a verified finding",
  },
  sources: {
    id: "credit.followUps.sources",
    defaultMessage: "Applicant statements reviewed",
    description: "Exact applicant quotes behind a proposed follow-up",
  },
  include: {
    id: "credit.followUps.include",
    defaultMessage: "Include in applicant request",
    description: "Select a proposed follow-up for the approver's governed information request",
  },
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

const sameSelection = (left: InvestigationNeedSelection, right: InvestigationNeedSelection) =>
  left.runId === right.runId && left.needIndex === right.needIndex;

/** The only place an approver selects model proposals; the host's QuoteActions still records the governed request. */
export function ProposedFollowUps({
  proposals,
  selectedNeeds,
  onSelectedNeedsChange,
  selectionDisabled,
}: {
  proposals: readonly CurrentInvestigationProposal[];
  selectedNeeds: readonly InvestigationNeedSelection[];
  onSelectedNeedsChange: (needs: InvestigationNeedSelection[]) => void;
  selectionDisabled: boolean;
}) {
  const intl = useIntl();
  if (proposals.length === 0) return null;
  const selectedProposals = proposals.filter((proposal) => selectedNeeds.some((selection) => sameSelection(selection, proposal)));
  return (
    <section id="proposed-follow-ups" className="scroll-mt-4" aria-labelledby="proposed-follow-ups-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="proposed-follow-ups-title" className="text-sm font-semibold">
          {intl.formatMessage(messages.title)}
        </h3>
        <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.provenance)}</span>
      </div>
      {proposals.map((proposal) => {
        const selected = selectedProposals.includes(proposal);
        return (
          <div key={`${proposal.runId}:${String(proposal.needIndex)}`} className="border-t border-border py-3">
            <p className="text-sm font-medium">{intl.formatMessage(kindMessages[proposal.need.kind])}</p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">{intl.formatMessage(messages.sources)}</summary>
              {proposal.need.sources.map((source) => (
                <blockquote
                  key={`${String(source.answerIndex)}:${source.quote}`}
                  className="mt-2 break-words border-l-2 border-border pl-3"
                >
                  {source.quote}
                </blockquote>
              ))}
            </details>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selected}
                disabled={selectionDisabled}
                onChange={(event) => {
                  const withoutSelection = selectedNeeds.filter((selection) => !sameSelection(selection, proposal));
                  onSelectedNeedsChange(
                    event.currentTarget.checked
                      ? [...withoutSelection, { runId: proposal.runId, needIndex: proposal.needIndex }]
                      : withoutSelection
                  );
                }}
              />
              {intl.formatMessage(messages.include)}
            </label>
          </div>
        );
      })}
      {selectedProposals.length > 0 && (
        <section className="mt-3 rounded-lg border border-border bg-elevation-100 p-4" aria-labelledby="investigation-request-preview">
          <h3 id="investigation-request-preview" className="text-sm font-semibold">
            {intl.formatMessage(messages.requestPreview)}
          </h3>
          <div className="mt-3 space-y-4">
            {selectedProposals.map((proposal) => {
              const guidance = informationNeedGuidance(proposal.need.kind);
              return (
                <dl key={`${proposal.runId}:${String(proposal.needIndex)}`} className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.purpose)}</dt>
                    <dd className="mt-1">{guidance.purpose}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.acceptedResponses)}</dt>
                    <dd className="mt-1">
                      {intl.formatList(
                        guidance.acceptableResponses.map((response) => informationNeedResponseLabel(intl, response)),
                        { type: "disjunction" }
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
    </section>
  );
}
