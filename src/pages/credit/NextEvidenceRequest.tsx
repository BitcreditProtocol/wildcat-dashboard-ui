import { ChevronRight } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import type { VerificationRequest } from "./decision-types";
import { requestReason } from "./verification-reasons";

/**
 * The next evidence request of a case and who it is for: the applicant (sent through eBill) or
 * the Mint itself. What the case already establishes is in the quote summary's "How sure we are".
 */

const messages = defineMessages({
  nextRequest: {
    id: "credit.evidenceBrief.nextRequest",
    defaultMessage: "Next evidence request",
    description: "Heading for the next unresolved evidence request",
  },
  mintWorkPending: {
    id: "credit.evidenceBrief.mintWorkPending",
    defaultMessage: "Mint-side check pending",
    description: "State when the open verification work belongs to the Mint rather than the applicant",
  },
  readyToRequest: {
    id: "credit.evidenceBrief.readyToRequest",
    defaultMessage: "Ready for operator",
    description: "State when an evidence request is ready for the operator to send",
  },
  historicalPolicy: {
    id: "credit.evidenceBrief.historicalPolicy",
    defaultMessage: "Historical assessment · read-only",
    description: "Retained evidence requests are read-only; no historical cause is inferred",
  },
  needed: {
    id: "credit.evidenceBrief.needed",
    defaultMessage: "Needed",
    description: "Label for the evidence or correction being requested",
  },
  why: {
    id: "credit.evidenceBrief.why",
    defaultMessage: "Why",
    description: "Label for the governed reason behind an evidence request",
  },
  response: {
    id: "credit.evidenceBrief.response",
    defaultMessage: "Accepted response",
    description: "Label for the response types supported by the current applicant loop",
  },
  applicantResponse: {
    id: "credit.evidenceBrief.applicantResponse",
    defaultMessage: "Correct answers · upload supporting document",
    description: "Available response types in the governed applicant clarification flow",
  },
  mintResponse: {
    id: "credit.evidenceBrief.mintResponse",
    defaultMessage: "No applicant action",
    description: "Response value when the open check belongs to the Mint",
  },
  channel: {
    id: "credit.evidenceBrief.channel",
    defaultMessage: "Channel",
    description: "Label for the product channel used by an evidence request",
  },
  ebillChannel: {
    id: "credit.evidenceBrief.ebillChannel",
    defaultMessage: "eBill notification and application",
    description: "Channel used for the governed applicant clarification loop",
  },
  internalChannel: {
    id: "credit.evidenceBrief.internalChannel",
    defaultMessage: "Mint operations",
    description: "Channel used for Mint-owned verification work",
  },
  moreRequests: {
    id: "credit.evidenceBrief.moreRequests",
    defaultMessage: "+{count} more",
    description: "Count of additional evidence requests after the next request",
  },
});

const isApplicantOwnedRequest = (request: VerificationRequest): boolean =>
  request.owner === "applicant" || request.resolutionAction === "request_applicant_information";

export function NextEvidenceRequest({
  verificationRequests,
  assessmentCurrency,
}: {
  verificationRequests: readonly VerificationRequest[];
  assessmentCurrency: "current" | "historical";
}) {
  const intl = useIntl();
  // The applicant's requests come first: they are the ones the operator can send.
  const nextRequest = verificationRequests.find(isApplicantOwnedRequest) ?? verificationRequests[0];
  if (nextRequest === undefined) return null;
  const isApplicantRequest = isApplicantOwnedRequest(nextRequest);
  const requestState =
    assessmentCurrency === "historical"
      ? intl.formatMessage(messages.historicalPolicy)
      : isApplicantRequest
        ? intl.formatMessage(messages.readyToRequest)
        : intl.formatMessage(messages.mintWorkPending);

  return (
    <section className="rounded-lg border border-signal-alert/50 p-4" data-testid="next-evidence-request">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{intl.formatMessage(messages.nextRequest)}</h3>
          <p className="mt-1 text-xs font-medium text-signal-alert">{requestState}</p>
        </div>
        {verificationRequests.length > 1 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {intl.formatMessage(messages.moreRequests, { count: verificationRequests.length - 1 })}
          </span>
        )}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.needed)}</dt>
          <dd className="mt-1 font-medium">{nextRequest.requiredItem}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.why)}</dt>
          <dd className="mt-1">{requestReason(nextRequest, intl)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.response)}</dt>
          <dd className="mt-1">{intl.formatMessage(isApplicantRequest ? messages.applicantResponse : messages.mintResponse)}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.channel)}</dt>
          <dd className="mt-1 flex items-center gap-1">
            {intl.formatMessage(isApplicantRequest ? messages.ebillChannel : messages.internalChannel)}
            <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </dd>
        </div>
      </dl>
    </section>
  );
}
