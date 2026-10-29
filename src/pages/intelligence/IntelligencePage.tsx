import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import type { MintIntelligenceNote, MintIntelligenceResponse, MintIntelligenceScope } from "@bitcredit/ai-credit-shared";
import { AskTheMint } from "./AskTheMint";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { useState } from "react";
import { Plus } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { useMintIntelligence } from "@/pages/mint-checks/api";
import { intelligenceScopeMessages } from "@/pages/mint-checks/mint-checks-copy";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";
import { intelligenceMessages, intelligenceReviewOverdue, supersededChain, todayIsoDate } from "./intelligence-copy";
import { IntelligenceNoteCard } from "./IntelligenceNote";
import { IntelligenceNoteForm } from "./IntelligenceNoteForm";

const plain = defineMessages({
  title: { id: "agentic.intel.title", defaultMessage: "Ask the Mint", description: "Page title" },
  notes: { id: "agentic.intel.notes", defaultMessage: "Team notes", description: "Notes panel title" },
  notesWhy: {
    id: "agentic.intel.notesWhy",
    defaultMessage:
      "What your team knows about regions, crops and the economy. Shown on matching cases and used by Ask the Mint. Never changes prices or rules.",
    description: "What team notes do",
  },
  edit: { id: "agentic.intel.edit", defaultMessage: "Edit", description: "Writes a newer version of a note" },
});

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
    <div className="space-y-4">
      {scopes.map((scope) => {
        const notes = response.notes
          .filter((note) => note.scope === scope && current.has(note.id))
          .sort((a, b) => a.subject.localeCompare(b.subject, intl.locale) || b.authoredAt.localeCompare(a.authoredAt));
        const label = intl.formatMessage(intelligenceScopeMessages[scope]);
        return (
          <section key={scope} aria-label={label}>
            <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
            {notes.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {intl.formatMessage(messages.empty, { scope: label.toLocaleLowerCase(intl.locale) })}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notes.map((note) => {
                  const history = supersededChain(note, response.notes);
                  return (
                    <li id={`note-${note.id}`} key={note.id} className="scroll-mt-5 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-sm font-medium">
                          {note.title}
                          <span className="ml-2 text-[11px] font-normal text-muted-foreground">{note.subject}</span>
                          {intelligenceReviewOverdue(note, today) && (
                            <span className="ml-2 text-[11px] font-normal text-amber-600 dark:text-amber-300">
                              {intl.formatMessage(intelligenceMessages.overdue)}
                            </span>
                          )}
                        </h4>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                          onClick={() => onUpdate(note)}
                        >
                          {intl.formatMessage(plain.edit)}
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground" title={note.body}>
                        {note.body}
                      </p>
                      {note.sources.length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {note.sources.map((source, index) => (
                            <span key={`${index}-${source.label}`}>
                              {index > 0 && " · "}
                              {source.url ? (
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {source.label}
                                </a>
                              ) : (
                                source.label
                              )}
                            </span>
                          ))}
                        </p>
                      )}
                      {history.length > 0 && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            {intl.formatMessage(messages.history, { count: history.length })}
                          </summary>
                          <ol className="mt-2 space-y-2">
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
    <div className="ask-page">
      {/* The conversation names itself; the page title stays for assistive technology. */}
      <h1 className="sr-only">{intl.formatMessage(plain.title)}</h1>
      <AskTheMint variant="page" />
      <aside className="ask-page-notes home-panel" aria-label={intl.formatMessage(plain.notes)}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{intl.formatMessage(plain.notes)}</h2>
          {form === null && query.data && (
            <button type="button" className="chat-control" onClick={() => setForm({})}>
              <Plus aria-hidden="true" />
              {intl.formatMessage(messages.add)}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(plain.notesWhy)}</p>
        {form !== null && (
          <div className="mt-3">
            <IntelligenceNoteForm key={form.supersedes?.id ?? "new"} supersedes={form.supersedes} onDone={() => setForm(null)} />
          </div>
        )}
        <div className="mt-2">
          {query.error ? (
            <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
          ) : query.data ? (
            <IntelligenceGroups response={query.data} onUpdate={(note) => setForm({ supersedes: note })} />
          ) : (
            <CheckLoading />
          )}
        </div>
        <div className="mt-3">
          <BoundaryNotice summary={intl.formatMessage(intelligenceMessages.boundary)}>
            {intl.formatMessage({
              id: "intelligence.readOnlyPrompt",
              defaultMessage:
                "Notes may reach only Ask the Mint’s operator-only, read-only explanation prompt. They never enter applicant, assessment, pricing, gate or authorization prompts. Notes and explanations cannot change the reviewed policy.",
              description: "Operator dashboard intelligence: readOnlyPrompt",
            })}
          </BoundaryNotice>
        </div>
      </aside>
    </div>
  );
}
