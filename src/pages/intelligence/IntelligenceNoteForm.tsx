import { mintIntelligenceCommandSchema, type MintIntelligenceNote, type MintIntelligenceScope } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { useId, useRef, useState, type FormEvent } from "react";
import { useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { MintCheckError, useAddMintIntelligenceNote } from "@/pages/mint-checks/api";
import { intelligenceScopeMessages } from "@/pages/mint-checks/mint-checks-copy";

const MAX_SOURCES = 10;
const fieldClass = "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const messages = defineMessages({
  addTitle: { id: "intelligence.form.addTitle", defaultMessage: "Add a note", description: "Heading of the new note form" },
  updateTitle: {
    id: "intelligence.form.updateTitle",
    defaultMessage: "Update “{title}”",
    description: "Heading of the form that writes a newer version of a note; the old one stays as history",
  },
  updateHint: {
    id: "intelligence.form.updateHint",
    defaultMessage: "Saving writes a new version. The current note stays readable as history; nothing is overwritten.",
    description: "Superseding keeps the earlier note",
  },
  scope: { id: "intelligence.form.scope", defaultMessage: "Scope", description: "Region, industry or macro" },
  subject: {
    id: "intelligence.form.subject",
    defaultMessage: "Subject",
    description: "Country or region, industry, or macro topic the note is about",
  },
  subjectHint: {
    id: "intelligence.form.subjectHint",
    defaultMessage: "A country or region, an industry, or a macro topic, e.g. “Guatemala”, “Coffee”, “Interest rates”.",
    description: "Examples for the note subject; cases match it by country and industry",
  },
  title: { id: "intelligence.form.title", defaultMessage: "Title", description: "Note title" },
  body: { id: "intelligence.form.body", defaultMessage: "Note", description: "Note text" },
  reviewBy: {
    id: "intelligence.form.reviewBy",
    defaultMessage: "Review by (optional)",
    description: "When the author expects the note to need refreshing",
  },
  sources: { id: "intelligence.form.sources", defaultMessage: "Sources", description: "Cited sources of the note" },
  sourceLabel: { id: "intelligence.form.sourceLabel", defaultMessage: "Source {n}", description: "Label of the nth cited source" },
  sourceUrl: {
    id: "intelligence.form.sourceUrl",
    defaultMessage: "Link {n} (optional)",
    description: "Optional http(s) link of the nth source",
  },
  addSource: { id: "intelligence.form.addSource", defaultMessage: "Add source", description: "Adds a source row" },
  removeSource: { id: "intelligence.form.removeSource", defaultMessage: "Remove source {n}", description: "Removes a source row" },
  save: { id: "intelligence.form.save", defaultMessage: "Save note", description: "Stores the note" },
  cancel: { id: "intelligence.form.cancel", defaultMessage: "Cancel", description: "Closes the note form without saving" },
  invalid: {
    id: "intelligence.form.invalid",
    defaultMessage:
      "Some fields are not valid: subject needs 2–100 characters, title 3–160, note 10–4000, and links must start with http:// or https://.",
    description: "Client-side validation failure of a note",
  },
  notConfigured: {
    id: "intelligence.form.notConfigured",
    defaultMessage: "Mint Intelligence storage is not configured on this Mint. The note was not saved.",
    description: "503 when storing a note",
  },
  failed: {
    id: "intelligence.form.failed",
    defaultMessage: "The note could not be saved. Try again; a retry does not store it twice.",
    description: "Uncertain write of a note; the retry reuses the same command id",
  },
});

interface SourceDraft {
  label: string;
  url: string;
}

export function IntelligenceNoteForm({ supersedes, onDone }: { supersedes?: MintIntelligenceNote; onDone: () => void }) {
  const intl = useIntl();
  const mutation = useAddMintIntelligenceNote();
  const subjectHintId = useId();
  const [scope, setScope] = useState<MintIntelligenceScope>(supersedes?.scope ?? "region");
  const [subject, setSubject] = useState(supersedes?.subject ?? "");
  const [title, setTitle] = useState(supersedes?.title ?? "");
  const [body, setBody] = useState(supersedes?.body ?? "");
  const [reviewBy, setReviewBy] = useState(supersedes?.reviewBy ?? "");
  const [sources, setSources] = useState<SourceDraft[]>(
    supersedes?.sources.map((source) => ({ label: source.label, url: source.url ?? "" })) ?? []
  );
  const [invalid, setInvalid] = useState(false);
  // An unchanged retry reuses its command id, so an uncertain first write is never stored twice.
  const attempt = useRef<{ fingerprint: string; commandId: string } | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const fields = {
      action: "add_note" as const,
      scope,
      subject,
      title,
      body,
      sources: sources
        .filter((source) => source.label.trim() !== "" || source.url.trim() !== "")
        .map((source) => ({ label: source.label, url: source.url.trim() === "" ? null : source.url.trim() })),
      reviewBy: reviewBy === "" ? null : reviewBy,
      supersedes: supersedes?.id ?? null,
    };
    const fingerprint = JSON.stringify(fields);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, commandId: crypto.randomUUID() };
    const command = mintIntelligenceCommandSchema.safeParse({ ...fields, commandId: attempt.current.commandId });
    setInvalid(!command.success);
    if (!command.success) return;
    mutation.mutate(command.data, { onSuccess: onDone });
  };
  const updateSource = (index: number, change: Partial<SourceDraft>) =>
    setSources((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...change } : item)));

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-5" noValidate>
      <div>
        <h2 className="font-medium">
          {supersedes ? intl.formatMessage(messages.updateTitle, { title: supersedes.title }) : intl.formatMessage(messages.addTitle)}
        </h2>
        {supersedes && <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.updateHint)}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="block text-sm">
          {intl.formatMessage(messages.scope)}
          <select
            value={scope}
            disabled={supersedes !== undefined}
            onChange={(event) => setScope(event.target.value as MintIntelligenceScope)}
            className={fieldClass}
          >
            {(["region", "industry", "macro"] as const).map((value) => (
              <option key={value} value={value}>
                {intl.formatMessage(intelligenceScopeMessages[value])}
              </option>
            ))}
          </select>
        </label>
        <div>
          <label className="block text-sm">
            {intl.formatMessage(messages.subject)}
            <input
              value={subject}
              readOnly={supersedes !== undefined}
              required
              minLength={2}
              maxLength={100}
              aria-describedby={subjectHintId}
              onChange={(event) => setSubject(event.target.value)}
              className={fieldClass}
            />
          </label>
          <p id={subjectHintId} className="mt-1 text-xs text-muted-foreground">
            {intl.formatMessage(messages.subjectHint)}
          </p>
        </div>
      </div>
      <label className="block text-sm">
        {intl.formatMessage(messages.title)}
        {/* The form opens on an explicit click, often far down the page: focus brings it into view. */}
        <input
          value={title}
          autoFocus
          required
          minLength={3}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        {intl.formatMessage(messages.body)}
        <textarea
          value={body}
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          onChange={(event) => setBody(event.target.value)}
          className={fieldClass}
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm">{intl.formatMessage(messages.sources)}</legend>
        {sources.map((source, index) => (
          <div key={index} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block text-xs">
              {intl.formatMessage(messages.sourceLabel, { n: index + 1 })}
              <input
                value={source.label}
                maxLength={200}
                onChange={(event) => updateSource(index, { label: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block text-xs">
              {intl.formatMessage(messages.sourceUrl, { n: index + 1 })}
              <input
                type="url"
                value={source.url}
                maxLength={500}
                onChange={(event) => updateSource(index, { url: event.target.value })}
                className={fieldClass}
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSources((items) => items.filter((_, itemIndex) => itemIndex !== index))}
            >
              {intl.formatMessage(messages.removeSource, { n: index + 1 })}
            </Button>
          </div>
        ))}
        {sources.length < MAX_SOURCES && (
          <Button type="button" variant="outline" size="sm" onClick={() => setSources((items) => [...items, { label: "", url: "" }])}>
            {intl.formatMessage(messages.addSource)}
          </Button>
        )}
      </fieldset>
      <label className="block max-w-xs text-sm">
        {intl.formatMessage(messages.reviewBy)}
        <input type="date" value={reviewBy} onChange={(event) => setReviewBy(event.target.value)} className={fieldClass} />
      </label>
      {invalid && (
        <p role="alert" className="text-sm text-signal-alert">
          {intl.formatMessage(messages.invalid)}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm">
          {intl.formatMessage(
            mutation.error instanceof MintCheckError && mutation.error.status === 503 ? messages.notConfigured : messages.failed
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {intl.formatMessage(messages.save)}
        </Button>
        <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onDone}>
          {intl.formatMessage(messages.cancel)}
        </Button>
      </div>
    </form>
  );
}
