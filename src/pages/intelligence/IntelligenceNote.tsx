import type { MintIntelligenceNote } from "@bitcredit/ai-credit-shared";
import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { intelligenceScopeMessages } from "@/pages/mint-checks/mint-checks-copy";
import { intelligenceMessages, intelligenceReviewOverdue } from "./intelligence-copy";

export function IntelligenceNoteCard({
  note,
  today,
  actions,
  compact,
}: {
  note: MintIntelligenceNote;
  today: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const intl = useIntl();
  const overdue = intelligenceReviewOverdue(note, today);
  return (
    <article className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(intelligenceScopeMessages[note.scope])} · {note.subject}
        </p>
        {note.reviewBy && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {intl.formatMessage(intelligenceMessages.reviewBy, {
              date: intl.formatDate(note.reviewBy, { dateStyle: "medium", timeZone: "UTC" }),
            })}
            {overdue && (
              <span className="rounded-md bg-signal-alert/10 px-1.5 py-0.5 font-medium text-signal-alert">
                {intl.formatMessage(intelligenceMessages.overdue)}
              </span>
            )}
          </p>
        )}
      </div>
      <h4 className="text-sm font-medium">{note.title}</h4>
      <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${compact ? "line-clamp-4" : ""}`}>{note.body}</p>
      {note.sources.length > 0 && (
        <div className="text-xs">
          <p className="text-muted-foreground">{intl.formatMessage(intelligenceMessages.sources)}</p>
          <ul className="mt-1 space-y-0.5">
            {note.sources.map((source, index) => (
              <li key={`${index}-${source.label}`} className="break-words">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(intelligenceMessages.authored, {
            author: note.authoredBy,
            date: intl.formatDate(note.authoredAt, { dateStyle: "medium" }),
          })}
        </p>
        {actions}
      </div>
    </article>
  );
}
