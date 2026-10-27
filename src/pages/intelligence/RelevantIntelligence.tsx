import { relevantIntelligence } from "@bitcredit/ai-credit-shared";
import { defineMessages, useIntl } from "react-intl";
import { Link } from "react-router";
import { MintCheckError, useMintIntelligence } from "@/pages/mint-checks/api";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";
import { intelligenceMessages, todayIsoDate } from "./intelligence-copy";
import { IntelligenceNoteCard } from "./IntelligenceNote";

const messages = defineMessages({
  title: {
    id: "intelligence.context.title",
    defaultMessage: "Mint Intelligence · context",
    description: "Heading of the Mint's own notes on this case's region, industry and the macro economy",
  },
  none: {
    id: "intelligence.context.none",
    defaultMessage: "No current notes for this case’s country, industry or the macro economy.",
    description: "No relevant Mint Intelligence notes",
  },
  notConfigured: {
    id: "intelligence.context.notConfigured",
    defaultMessage: "Mint Intelligence is not configured on this Mint.",
    description: "503: the intelligence store is not configured",
  },
  open: { id: "intelligence.context.open", defaultMessage: "Open Mint Intelligence", description: "Link to the Mint Intelligence page" },
});

/** The Mint's notes on a case's country and industry plus macro notes: context to read, never decision input. */
export function RelevantIntelligence({ country, industry }: { country?: string | null; industry?: string | null }) {
  const intl = useIntl();
  const query = useMintIntelligence();
  const notConfigured = query.error instanceof MintCheckError && query.error.status === 503;
  const notes = query.data ? relevantIntelligence(query.data, { country, industry }) : [];
  const today = todayIsoDate();
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{intl.formatMessage(messages.title)}</h3>
        <Link to="/intelligence" className="text-xs text-primary underline-offset-2 hover:underline">
          {intl.formatMessage(messages.open)}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(intelligenceMessages.boundary)}</p>
      {notConfigured ? (
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.notConfigured)}</p>
      ) : query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <CheckLoading />
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.none)}</p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="py-3 first:pt-0 last:pb-0">
              <IntelligenceNoteCard note={note} today={today} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
