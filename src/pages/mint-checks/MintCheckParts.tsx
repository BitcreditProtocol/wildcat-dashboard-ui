import {
  facilityApplicationReference,
  type ParticipantMatch,
  type ParticipantMatchSignal,
  type ParticipantSource,
} from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { CircleAlert } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { MintCheckError } from "./api";
import { directoryLink, sourceKey } from "./mint-check-format";
import {
  applicantIdentityMessages,
  billRoleMessages,
  facilityStatusLabel,
  matchSignalMessages,
  mintCheckMessages,
  participantKindMessages,
  quoteStatusLabel,
} from "./mint-checks-copy";

/** Marks a deterministic check result as a reason to look closer, never a fraud finding or a gate. */
export function ReviewSignalLabel() {
  const intl = useIntl();
  return (
    <span className="inline-flex shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {intl.formatMessage(mintCheckMessages.reviewSignal)}
    </span>
  );
}

export function MatchSignalChips({ signals }: { signals: readonly ParticipantMatchSignal[] }) {
  const intl = useIntl();
  return (
    <ul className="flex flex-wrap gap-1">
      {signals.map((signal) => (
        <li key={signal} className="rounded-full bg-signal-alert/10 px-2 py-0.5 text-xs text-signal-alert">
          {intl.formatMessage(matchSignalMessages[signal])}
        </li>
      ))}
    </ul>
  );
}

export function ParticipantSourceItem({ source }: { source: ParticipantSource }) {
  const intl = useIntl();
  if (source.type === "bill_party") {
    const status = quoteStatusLabel(source.quoteStatus);
    return (
      <Link to={`/quotes/${source.quoteId}`} className="text-primary underline-offset-2 hover:underline">
        {intl.formatMessage(mintCheckMessages.quoteSource, {
          status: status ? intl.formatMessage(status) : source.quoteStatus,
          roles: source.roles.map((role) => intl.formatMessage(billRoleMessages[role])).join(", "),
        })}
      </Link>
    );
  }
  const status = facilityStatusLabel(source.status);
  return (
    <Link
      to={`/facilities?${new URLSearchParams({ application: source.applicationId }).toString()}`}
      className="text-primary underline-offset-2 hover:underline"
    >
      {intl.formatMessage(mintCheckMessages.applicationSource, {
        reference: facilityApplicationReference(source.applicationId),
        status: status ? intl.formatMessage(status) : source.status,
        role: intl.formatMessage(applicantIdentityMessages[source.role]),
      })}
    </Link>
  );
}

export function ParticipantSourceList({ sources }: { sources: readonly ParticipantSource[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs">
      {sources.map((source) => (
        <li key={sourceKey(source)}>
          <ParticipantSourceItem source={source} />
        </li>
      ))}
    </ul>
  );
}

/** Possible duplicates of one identity, each a link to the directory: reasons to look closer, not findings. */
export function ParticipantMatchList({ matches }: { matches: readonly ParticipantMatch[] }) {
  const intl = useIntl();
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {matches.map((match) => (
        <li key={match.ref} className="space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              to={directoryLink(match.name)}
              className="text-sm font-medium underline-offset-2 hover:underline"
              aria-label={intl.formatMessage(mintCheckMessages.openInDirectory, { name: match.name })}
            >
              {match.name}
            </Link>
            <span className="text-xs text-muted-foreground">{intl.formatMessage(participantKindMessages[match.kind])}</span>
          </div>
          <MatchSignalChips signals={match.signals} />
          <p className="text-xs text-muted-foreground">
            {intl.formatMessage(mintCheckMessages.similarity, { name: match.nameSimilarity, address: match.addressSimilarity })}
          </p>
          <ParticipantSourceList sources={match.sources} />
        </li>
      ))}
    </ul>
  );
}

export function CheckLoading() {
  const intl = useIntl();
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {intl.formatMessage(mintCheckMessages.loading)}
    </p>
  );
}

/** A calm, retryable error: a failed read-only check changes nothing about the case. */
export function CheckUnavailable({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  const intl = useIntl();
  const message =
    error instanceof MintCheckError && error.status === 503 ? mintCheckMessages.unavailableMint : mintCheckMessages.unavailable;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm">
      <p className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {intl.formatMessage(message)}
      </p>
      <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
        {intl.formatMessage(mintCheckMessages.retry)}
      </Button>
    </div>
  );
}
