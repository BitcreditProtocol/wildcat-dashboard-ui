import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { FormattedMessage } from "react-intl";

/** Keep the required full boundary beside the decision without repeating a wall of copy. */
export function BoundaryNotice({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <span>{summary}</span>
        <details className="inline [&[open]]:block">
          <summary className="ml-2 inline cursor-pointer font-medium text-foreground underline decoration-dotted underline-offset-4">
            <FormattedMessage id="operator.boundary.why" defaultMessage="Why?" />
          </summary>
          <div className="mt-2 max-w-4xl whitespace-pre-wrap leading-relaxed">{children}</div>
        </details>
      </div>
    </div>
  );
}
