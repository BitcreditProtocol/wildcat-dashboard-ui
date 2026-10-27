import type { DirectoryParticipant, ParticipantDirectoryResponse } from "@bitcredit/ai-credit-shared";
import { Search } from "@bitcredit/ui-library";
import { Info } from "lucide-react";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { useLocation, useSearchParams } from "react-router";
import { DIRECTORY_QUERY_MAX_LENGTH, useParticipantDirectory } from "@/pages/mint-checks/api";
import { formatDirectoryAddress } from "@/pages/mint-checks/mint-check-format";
import { mintCheckMessages, participantKindMessages } from "@/pages/mint-checks/mint-checks-copy";
import {
  CheckLoading,
  CheckUnavailable,
  ParticipantMatchList,
  ParticipantSourceList,
  ReviewSignalLabel,
} from "@/pages/mint-checks/MintCheckParts";

const messages = defineMessages({
  title: { id: "directory.title", defaultMessage: "Directory", description: "Mint-local participant directory page title" },
  description: {
    id: "directory.description",
    defaultMessage:
      "Every party this Mint has seen on a quoted eBill or in an onboarding application, searchable by similar names, addresses, emails and registration numbers.",
    description: "What the participant directory holds",
  },
  local: {
    id: "directory.local",
    defaultMessage: "Mint-local: built from this Mint’s own records, never shared with or read from other Mints.",
    description: "The directory is not a central registry",
  },
  search: {
    id: "directory.search",
    defaultMessage: "Search names, addresses, emails or registration numbers…",
    description: "Directory search placeholder",
  },
  size: {
    id: "directory.size",
    defaultMessage: "{count, plural, one {# participant} other {# participants}} · built {date}",
    description: "Directory size and build time",
  },
  results: { id: "directory.results", defaultMessage: "Results for “{query}”", description: "Heading of search results" },
  participants: { id: "directory.participants", defaultMessage: "Participants", description: "Heading when no search is entered" },
  noResults: {
    id: "directory.noResults",
    defaultMessage: "No participant resembles “{query}”.",
    description: "Empty search result; absence may be due to an incomplete directory",
  },
  empty: { id: "directory.empty", defaultMessage: "The directory is empty.", description: "No participants at all" },
  alsoNamed: { id: "directory.alsoNamed", defaultMessage: "Also named: {names}", description: "Other spellings recorded for one party" },
  registration: {
    id: "directory.registration",
    defaultMessage: "Registration: {numbers}",
    description: "Registration numbers of a company participant",
  },
  match: {
    id: "directory.match",
    defaultMessage: "{score, number, percent} match",
    description: "Deterministic proximity score of a search hit; a ranking aid, not a probability",
  },
  duplicates: {
    id: "directory.duplicates",
    defaultMessage: "Possible duplicates",
    description: "Participants that look like another participant in the directory",
  },
  duplicatesIntro: {
    id: "directory.duplicatesIntro",
    defaultMessage:
      "Distinct eBill identities that share an email, a registration number, a similar name or an address. One business may hold several identities — or two businesses share an office. Look closer before concluding anything.",
    description: "Possible duplicates are reasons to look closer, not findings",
  },
  noDuplicates: {
    id: "directory.noDuplicates",
    defaultMessage: "No possible duplicates in the directory.",
    description: "No participant pair looks alike",
  },
});

function ParticipantCard({ participant, score }: { participant: DirectoryParticipant; score: number | null }) {
  const intl = useIntl();
  const [name, ...otherNames] = participant.names;
  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-medium">{name ?? participant.ref}</p>
        <span className="text-xs text-muted-foreground">
          {intl.formatMessage(participantKindMessages[participant.kind])}
          {score !== null && <> · {intl.formatMessage(messages.match, { score })}</>}
        </span>
      </div>
      {otherNames.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(messages.alsoNamed, { names: intl.formatList(otherNames, { type: "conjunction" }) })}
        </p>
      )}
      <div className="space-y-0.5 text-xs text-muted-foreground">
        {participant.postalAddresses.map((address) => {
          const text = formatDirectoryAddress(address, intl.locale);
          return (
            <p key={text} className="break-words">
              {text}
            </p>
          );
        })}
        {participant.emails.map((email) => (
          <p key={email} className="break-all">
            {email}
          </p>
        ))}
        {participant.registrationNumbers.length > 0 && (
          <p>{intl.formatMessage(messages.registration, { numbers: participant.registrationNumbers.join(", ") })}</p>
        )}
      </div>
      <ParticipantSourceList sources={participant.sources} />
      <p className="break-all font-mono text-[11px] text-muted-foreground">{participant.ref}</p>
    </li>
  );
}

function DirectoryResults({ directory }: { directory: ParticipantDirectoryResponse }) {
  const intl = useIntl();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground" role="status">
        {intl.formatMessage(messages.size, {
          count: directory.size,
          date: intl.formatDate(directory.builtAt, { dateStyle: "medium", timeStyle: "short" }),
        })}
      </p>
      {!directory.complete && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {intl.formatMessage(mintCheckMessages.directoryIncomplete)}
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {directory.query ? intl.formatMessage(messages.results, { query: directory.query }) : intl.formatMessage(messages.participants)}
        </h2>
        {directory.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {directory.query ? intl.formatMessage(messages.noResults, { query: directory.query }) : intl.formatMessage(messages.empty)}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {directory.results.map((result) => (
              <ParticipantCard
                key={result.participant.ref}
                participant={result.participant}
                score={directory.query ? result.score : null}
              />
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          {intl.formatMessage(messages.duplicates)}
          <ReviewSignalLabel />
        </h2>
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.duplicatesIntro)}</p>
        {directory.possibleDuplicates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noDuplicates)}</p>
        ) : (
          <ul className="space-y-4">
            {directory.possibleDuplicates.map((entry) => (
              <li key={entry.ref} className="space-y-2 rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium">{entry.name}</p>
                <ParticipantMatchList matches={entry.matches} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DirectoryPage() {
  const intl = useIntl();
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").slice(0, DIRECTORY_QUERY_MAX_LENGTH);
  const location = useLocation();
  const [input, setInput] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  // A link to another `?q=` (e.g. a duplicate's name) replaces the box; the box's own debounced
  // search must not, or a slow keystroke would be overwritten by the previous one.
  if (query !== shownQuery) {
    setShownQuery(query);
    if ((location.state as { directorySearch?: boolean } | null)?.directorySearch !== true) setInput(query);
  }
  const directory = useParticipantDirectory(query);
  const search = (value: string) => {
    if (value.trim() === query.trim()) return;
    const next = new URLSearchParams(params);
    if (value.trim()) next.set("q", value.slice(0, DIRECTORY_QUERY_MAX_LENGTH));
    else next.delete("q");
    setParams(next, { replace: true, state: { directorySearch: true } });
  };
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{intl.formatMessage(messages.title)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.description)}</p>
      </header>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {intl.formatMessage(messages.local)}
      </p>
      <Search
        value={input}
        size="sm"
        placeholder={intl.formatMessage(messages.search)}
        onChange={(value) => setInput(value.slice(0, DIRECTORY_QUERY_MAX_LENGTH))}
        onSearch={search}
      />
      {directory.error ? (
        <CheckUnavailable error={directory.error} retrying={directory.isFetching} onRetry={() => void directory.refetch()} />
      ) : directory.data ? (
        <DirectoryResults directory={directory.data} />
      ) : (
        <CheckLoading />
      )}
    </div>
  );
}
