import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import type { MintIntelligenceNote, MintIntelligenceResponse, MintIntelligenceScope } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { AskTheMint } from "./AskTheMint";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import { useMintIntelligence } from "@/pages/mint-checks/api";
import { intelligenceScopeMessages } from "@/pages/mint-checks/mint-checks-copy";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";
import { intelligenceMessages, supersededChain, todayIsoDate } from "./intelligence-copy";
import { IntelligenceNoteCard } from "./IntelligenceNote";
import { IntelligenceNoteForm } from "./IntelligenceNoteForm";

const messages = defineMessages({
  title: { id: "intelligence.title", defaultMessage: "Mint Intelligence", description: "Page title" },
  description: {
    id: "intelligence.description",
    defaultMessage:
      "This Mint’s own, dated knowledge of its regions, industries and the macro economy, kept once and reused across cases. A newer note supersedes an older one; nothing is overwritten.",
    description: "What Mint Intelligence is",
  },
  add: { id: "intelligence.add", defaultMessage: "Add note", description: "Opens the new note form" },
  update: { id: "intelligence.update", defaultMessage: "Update", description: "Writes a newer version of a note" },
  empty: {
    id: "intelligence.empty",
    defaultMessage: "No {scope} notes yet.",
    description: "A scope group has no current notes; scope is already lower-cased",
  },
  history: {
    id: "intelligence.history",
    defaultMessage: "{count, plural, one {# earlier version} other {# earlier versions}}",
    description: "Collapsible list of superseded versions of a note",
  },
});

const scopes: readonly MintIntelligenceScope[] = ["region", "industry", "macro"];

function IntelligenceGroups({
  response,
  onUpdate,
}: {
  response: MintIntelligenceResponse;
  onUpdate: (note: MintIntelligenceNote) => void;
}) {
  const intl = useIntl();
  const today = todayIsoDate();
  const current = new Set(response.current);
  return (
    <div className="space-y-6">
      {scopes.map((scope) => {
        const notes = response.notes
          .filter((note) => note.scope === scope && current.has(note.id))
          .sort((a, b) => a.subject.localeCompare(b.subject, intl.locale) || b.authoredAt.localeCompare(a.authoredAt));
        const label = intl.formatMessage(intelligenceScopeMessages[scope]);
        return (
          <section key={scope} aria-label={label} className="space-y-3">
            <h2 className="text-lg font-semibold">{label}</h2>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage(messages.empty, { scope: label.toLocaleLowerCase(intl.locale) })}
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note) => {
                  const history = supersededChain(note, response.notes);
                  return (
                    <li id={`note-${note.id}`} key={note.id} className="scroll-mt-5 rounded-lg border border-border bg-card p-4">
                      <IntelligenceNoteCard
                        note={note}
                        today={today}
                        actions={
                          <Button variant="outline" size="sm" onClick={() => onUpdate(note)}>
                            {intl.formatMessage(messages.update)}
                          </Button>
                        }
                      />
                      {history.length > 0 && (
                        <details className="mt-3 border-t border-border pt-3 text-sm">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            {intl.formatMessage(messages.history, { count: history.length })}
                          </summary>
                          <ol className="mt-3 space-y-3">
                            {history.map((older) => (
                              <li key={older.id} className="rounded-md bg-muted p-3">
                                <IntelligenceNoteCard note={older} today={today} />
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function IntelligencePage() {
  const intl = useIntl();
  const query = useMintIntelligence();
  useRevealAnchor(query.data);
  const [form, setForm] = useState<{ supersedes?: MintIntelligenceNote } | null>(null);
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold">{intl.formatMessage(messages.title)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.description)}</p>
        </div>
        {form === null && query.data && <Button onClick={() => setForm({})}>{intl.formatMessage(messages.add)}</Button>}
      </header>
      <BoundaryNotice summary={intl.formatMessage(intelligenceMessages.boundary)}>
        {intl.formatMessage({
          id: "intelligence.readOnlyPrompt",
          defaultMessage:
            "Notes may reach only Ask the Mint’s operator-only, read-only explanation prompt. They never enter applicant, assessment, pricing, gate or authorization prompts. Notes and explanations cannot change the reviewed policy.",
          description: "Operator dashboard intelligence: readOnlyPrompt",
        })}
      </BoundaryNotice>
      <AskTheMint />
      {form !== null && (
        <IntelligenceNoteForm key={form.supersedes?.id ?? "new"} supersedes={form.supersedes} onDone={() => setForm(null)} />
      )}
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <IntelligenceGroups response={query.data} onUpdate={(note) => setForm({ supersedes: note })} />
      ) : (
        <CheckLoading />
      )}
    </div>
  );
}
