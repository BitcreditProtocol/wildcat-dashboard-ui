import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bitcredit/ui-library";
import { useEffect, useState, type ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

const panels = ["review", "history", "calculation", "record"] as const;
type Panel = (typeof panels)[number];
const messages = defineMessages({
  workspace: { id: "quotes.workspace.label", defaultMessage: "Case details", description: "Accessible label for the case workspace tabs" },
  review: {
    id: "quotes.workspace.review",
    defaultMessage: "Review",
    description: "Tab holding evidence-review forms, proposed follow-up selection and submitted evidence",
  },
  reviewCount: {
    id: "quotes.workspace.reviewCount",
    defaultMessage: "{count, plural, one {# item to review} other {# items to review}}",
    description: "Accessible count of unresolved evidence questions and unsent proposed follow-ups on the Review tab",
  },
  history: {
    id: "quotes.workspace.history",
    defaultMessage: "Case history",
    description: "Read-only tab with recorded applicant conversations, answer reviews and public research",
  },
  calculation: {
    id: "quotes.workspace.calculation",
    defaultMessage: "Calculation",
    description: "Deterministic assessment and calculation tab",
  },
  record: { id: "quotes.workspace.record", defaultMessage: "Bill record", description: "Bill history and endorsees tab" },
});

function panelForHash(hash: string): Panel | undefined {
  if (
    hash === "#documents-and-evidence" ||
    hash === "#evidence-questions" ||
    hash === "#proposed-follow-ups" ||
    hash === "#case-preparation"
  )
    return "review";
  if (hash === "#case-conversation" || hash === "#case-investigation" || hash === "#case-history" || hash === "#public-research")
    return "history";
  if (hash === "#full-governed-assessment") return "calculation";
  if (hash === "#bill-record") return "record";
  return undefined;
}

/** One workspace; inactive panels stay mounted so review drafts survive navigation. */
export function CaseWorkspace(props: Record<Panel, ReactNode> & { reviewCount?: number }) {
  const intl = useIntl();
  const [active, setActive] = useState<Panel>(() => panelForHash(window.location.hash) ?? "review");
  const [pendingAnchor, setPendingAnchor] = useState<string>();
  useEffect(() => {
    const revealHash = (hash: string) => {
      const panel = panelForHash(hash);
      if (panel === undefined) return;
      setActive(panel);
      setPendingAnchor(hash.slice(1));
    };
    const reveal = () => revealHash(window.location.hash);
    const followAnchor = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) {
        revealHash(url.hash); // Clicking the same fragment does not emit hashchange.
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    document.addEventListener("click", followAnchor);
    return () => {
      window.removeEventListener("hashchange", reveal);
      document.removeEventListener("click", followAnchor);
    };
  }, []);
  useEffect(() => {
    if (pendingAnchor === undefined) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(pendingAnchor);
      if (target === null) return; // The case may still be loading.
      target.scrollIntoView?.({ block: "start" });
      setPendingAnchor(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingAnchor, props]);
  const reviewCount = props.reviewCount ?? 0;

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        const panel = panels.find((candidate) => candidate === value);
        if (panel !== undefined) {
          setActive(panel);
          setPendingAnchor(undefined);
        }
      }}
      className="min-w-0 rounded-lg border border-border bg-card text-card-foreground print:hidden"
    >
      <TabsList
        aria-label={intl.formatMessage(messages.workspace)}
        className="grid h-auto w-full grid-cols-2 gap-1 rounded-none border-b border-border bg-transparent p-2 sm:grid-cols-4"
      >
        {panels.map((panel) => (
          <TabsTrigger key={panel} value={panel} className="min-w-0 gap-2 px-2 py-2 text-sm">
            {intl.formatMessage(messages[panel])}
            {panel === "review" && reviewCount > 0 && (
              <span
                className="rounded-full bg-signal-alert/15 px-1.5 text-xs font-medium tabular-nums text-signal-alert"
                aria-label={intl.formatMessage(messages.reviewCount, { count: reviewCount })}
              >
                {intl.formatNumber(reviewCount)}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map((panel) => (
        <TabsContent
          key={panel}
          value={panel}
          forceMount
          hidden={active !== panel}
          className={`m-0 min-w-0 data-[state=inactive]:hidden ${panel === "calculation" ? "p-0" : "p-4 sm:p-6"}`}
        >
          {props[panel]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
