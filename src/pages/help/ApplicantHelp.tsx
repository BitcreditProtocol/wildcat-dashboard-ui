import { ApplicantText, ApplicantTextProvider } from "@/components/operator/ApplicantText";
import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import type { ApplicantHelpRequest, ApplicantHelpStep } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { Link } from "react-router";
import { useApplicantHelp, useReplyToApplicantHelp } from "@/pages/mint-checks/api";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";

const messages = defineMessages({
  title: { id: "help.title", defaultMessage: "Help requests", description: "Page title of applicants' questions to the Mint's people" },
  description: {
    id: "help.description",
    defaultMessage: "Applicants' questions to a person at the Mint. Your reply is shown to the applicant on the bill's Mint page.",
    description: "What the help requests page shows",
  },
  boundarySummary: {
    id: "help.boundarySummary",
    defaultMessage: "Human help only. Replies change no decision or terms.",
    description: "One-line help-request boundary; full required wording is disclosed",
  },
  boundary: {
    id: "help.boundary",
    defaultMessage:
      "A question is not evidence and not part of the case: it changes no state, is no adverse signal and never reaches a model, a price or a gate. Do not decide or promise terms in a reply.",
    description: "Boundary of applicant help requests",
  },
  open: { id: "help.open", defaultMessage: "Waiting for a reply ({count})", description: "Section of unanswered help requests" },
  answered: { id: "help.answered", defaultMessage: "Answered ({count})", description: "Section of answered help requests" },
  none: { id: "help.none", defaultMessage: "No help requests.", description: "Empty state of help requests" },
  quoteCardTitle: {
    id: "help.quoteCard.title",
    defaultMessage: "Applicant asked for help",
    description: "Heading of the help requests card on a quote",
  },
  quoteCardUnavailable: {
    id: "help.quoteCard.unavailable",
    defaultMessage: "Help requests",
    description: "Heading of the help card when the requests could not be read",
  },
  asked: { id: "help.asked", defaultMessage: "Asked {time} · {step}", description: "When and at which step a help request was made" },
  quote: { id: "help.quoteLink", defaultMessage: "Open quote", description: "Link from a help request to its quote" },
  reply: { id: "help.reply", defaultMessage: "Reply", description: "Opens the reply field for a help request" },
  replyLabel: { id: "help.replyLabel", defaultMessage: "Your reply to the applicant", description: "Label of the reply field" },
  send: { id: "help.send", defaultMessage: "Send reply", description: "Sends a reply to a help request" },
  replied: {
    id: "help.replied",
    defaultMessage: "Replied by operator {operator} · {time}",
    description: "Who replied to a help request and when",
  },
  replyFailed: {
    id: "help.replyFailed",
    defaultMessage: "The reply could not be saved. Refresh: someone may have answered already.",
    description: "A reply to a help request was not recorded",
  },
});

const stepMessages = defineMessages<ApplicantHelpStep>({
  interview: { id: "help.step.interview", defaultMessage: "during the interview", description: "Help step" },
  review: { id: "help.step.review", defaultMessage: "while checking answers", description: "Help step" },
  information_request: { id: "help.step.informationRequest", defaultMessage: "on an information request", description: "Help step" },
  quote: { id: "help.step.quote", defaultMessage: "on the quote", description: "Help step" },
  decision: { id: "help.step.decision", defaultMessage: "after a decision", description: "Help step" },
  other: { id: "help.step.other", defaultMessage: "on the Mint page", description: "Help step" },
});

function HelpRequestItem({ request, showQuoteLink }: { request: ApplicantHelpRequest; showQuoteLink: boolean }) {
  const intl = useIntl();
  const reply = useReplyToApplicantHelp();
  const renderings = useApplicantHelp();
  const [isReplying, setIsReplying] = useState(false);
  const [text, setText] = useState("");
  const [commandId] = useState(() => crypto.randomUUID());
  const fieldId = `help-reply-${request.requestId}`;
  return (
    <li id={`help-${request.requestId}`} className="scroll-mt-4 space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="whitespace-pre-wrap">
        <ApplicantTextProvider records={renderings.data?.operatorText}>
          <ApplicantText>{request.message}</ApplicantText>
        </ApplicantTextProvider>
      </p>
      <p className="text-xs text-muted-foreground">
        {intl.formatMessage(messages.asked, {
          time: intl.formatDate(request.requestedAt, { dateStyle: "medium", timeStyle: "short" }),
          step: intl.formatMessage(stepMessages[request.step]),
        })}
        {showQuoteLink && request.mintQuoteId !== null && (
          <>
            {" · "}
            <Link className="text-primary underline-offset-2 hover:underline" to={`/quotes/${request.mintQuoteId}`}>
              {intl.formatMessage(messages.quote)}
            </Link>
          </>
        )}
      </p>
      {request.reply !== null ? (
        <div className="rounded-md bg-muted p-2">
          <p className="whitespace-pre-wrap">{request.reply.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {intl.formatMessage(messages.replied, {
              // The operator id is the signed-in subject; its first block is enough to tell people apart.
              operator: request.reply.operatorId.split("-")[0] ?? request.reply.operatorId,
              time: intl.formatDate(request.reply.repliedAt, { dateStyle: "medium", timeStyle: "short" }),
            })}
          </p>
        </div>
      ) : isReplying ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            reply.mutate({ action: "reply", commandId, requestId: request.requestId, text: text.trim() });
          }}
        >
          <label className="block text-xs font-medium" htmlFor={fieldId}>
            {intl.formatMessage(messages.replyLabel)}
          </label>
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id={fieldId}
            maxLength={2_000}
            onChange={(event) => setText(event.target.value)}
            value={text}
          />
          {reply.isError && (
            <p className="text-xs text-destructive" role="alert">
              {intl.formatMessage(messages.replyFailed)}
            </p>
          )}
          <Button disabled={reply.isPending || text.trim().length === 0} size="sm" type="submit">
            {intl.formatMessage(messages.send)}
          </Button>
        </form>
      ) : (
        <Button onClick={() => setIsReplying(true)} size="sm" variant="outline">
          {intl.formatMessage(messages.reply)}
        </Button>
      )}
    </li>
  );
}

/** On a quote: this bill's help requests, open ones first. Hidden when there are none. */
export function ApplicantHelpCard({ billId }: { billId: string }) {
  const intl = useIntl();
  const query = useApplicantHelp();
  const requests = (query.data?.requests ?? []).filter((request) => request.billId === billId);
  // Unavailable is not the same as "no questions": a failed read or refresh is shown, with any
  // requests already loaded, so a waiting applicant is not missed.
  const unavailable =
    query.error === null ? null : <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />;
  if (requests.length === 0 && unavailable === null) return null;
  const ordered = [...requests.filter((one) => one.reply === null), ...requests.filter((one) => one.reply !== null)];
  return (
    <section className="space-y-3 rounded-lg border border-signal-alert/40 p-4">
      <h3 className="font-medium">{intl.formatMessage(requests.length === 0 ? messages.quoteCardUnavailable : messages.quoteCardTitle)}</h3>
      {unavailable}
      {ordered.length > 0 && (
        <ul className="space-y-3">
          {ordered.map((request) => (
            <HelpRequestItem key={request.requestId} request={request} showQuoteLink={false} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ApplicantHelpPage() {
  const intl = useIntl();
  const query = useApplicantHelp();
  useRevealAnchor(query.data);
  const requests = query.data?.requests ?? [];
  const open = requests.filter((request) => request.reply === null);
  const answered = requests.filter((request) => request.reply !== null);
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{intl.formatMessage(messages.title)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.description)}</p>
      </header>
      <BoundaryNotice summary={intl.formatMessage(messages.boundarySummary)}>{intl.formatMessage(messages.boundary)}</BoundaryNotice>
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data === undefined ? (
        <CheckLoading />
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.none)}</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="font-medium">{intl.formatMessage(messages.open, { count: open.length })}</h2>
            <ul className="space-y-3">
              {open.map((request) => (
                <HelpRequestItem key={request.requestId} request={request} showQuoteLink />
              ))}
            </ul>
          </section>
          {answered.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">{intl.formatMessage(messages.answered, { count: answered.length })}</h2>
              <ul className="space-y-3">
                {answered.map((request) => (
                  <HelpRequestItem key={request.requestId} request={request} showQuoteLink />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
