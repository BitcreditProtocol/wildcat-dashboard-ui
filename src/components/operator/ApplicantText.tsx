import { createContext, useContext, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import type { OperatorTextMap } from "./operator-text";
import { cockpit as m } from "./cockpit-messages";
const OperatorTextContext = createContext<OperatorTextMap>(new Map());
export function ApplicantTextProvider({ records, children }: { records?: OperatorTextMap; children: ReactNode }) {
  return <OperatorTextContext.Provider value={records ?? new Map()}>{children}</OperatorTextContext.Provider>;
}
export function ApplicantText({ children }: { children: string }) {
  const intl = useIntl();
  const records = useContext(OperatorTextContext);
  const [original, setOriginal] = useState(false);
  const rendering = records.get(children)?.[intl.locale.split("-")[0]];
  if (rendering?.status !== "translated" || !rendering.text)
    return (
      <>
        {children}
        {rendering?.status === "pending" && <small className="ml-1 text-muted-foreground">{intl.formatMessage(m.pending)}</small>}
      </>
    );
  let language = rendering.sourceLanguage ?? "—";
  try {
    language = new Intl.DisplayNames([intl.locale], { type: "language" }).of(language) ?? language;
  } catch {
    /* Unverified model language tags may be invalid. */
  }
  return (
    <span>
      <span>{original ? children : rendering.text}</span>
      <span className="ml-1 inline-flex flex-wrap items-center gap-1 align-baseline text-[10px] text-muted-foreground">
        <span title={intl.formatMessage(m.translationSource, { language })}>{intl.formatMessage(m.translated)}</span>
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          aria-pressed={original}
          onClick={() => setOriginal(!original)}
        >
          {intl.formatMessage(original ? m.rendering : m.original)}
        </button>
      </span>
    </span>
  );
}
