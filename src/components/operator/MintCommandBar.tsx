import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Sparkles, ShieldCheck, UserRound, Command } from "lucide-react";
import { useIntl } from "react-intl";
import { AskTheMint } from "@/pages/intelligence/AskTheMint";
import { AskDrawer } from "./AskDrawer";
import { cockpit as m } from "./cockpit-messages";
function openCaseAsk() {
  return !window.dispatchEvent(new Event("mint-ask-case", { cancelable: true }));
}
export function MintCommandBar() {
  const intl = useIntl();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const caseScoped =
    /^\/quotes\/[^/]+$/.test(location.pathname) &&
    !["pending", "accepted", "offered", "denied"].includes(location.pathname.split("/").pop() ?? "");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      const typing = target instanceof HTMLElement && (target.matches("input,textarea,select") || target.isContentEditable);
      if (
        (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey)
      ) {
        e.preventDefault();
        if (!caseScoped || !openCaseAsk()) setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [caseScoped]);
  return (
    <>
      <header className="mint-command-bar">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="status-dot" />
          <span className="font-semibold tracking-widest">WILDCAT</span>
          <span className="hidden lg:inline">/</span>
          <span className="hidden lg:inline">{intl.formatMessage(m.actors)}</span>
        </div>
        <button
          type="button"
          className="mint-command"
          onClick={() => {
            if (!caseScoped || !openCaseAsk()) setOpen(true);
          }}
        >
          <Sparkles className="size-4 text-sky-500" />
          <span>{intl.formatMessage(m.command)}</span>
          <kbd className="ml-auto flex items-center gap-1">
            <Command className="size-3" />K
          </kbd>
        </button>
        <div className="hidden items-center gap-3 text-muted-foreground xl:flex" aria-label={intl.formatMessage(m.actors)}>
          <span title={intl.formatMessage(m.proposed)}>
            <Sparkles className="size-4" aria-label={intl.formatMessage(m.proposed)} />
          </span>
          <span title={intl.formatMessage(m.gates)}>
            <ShieldCheck className="size-4" aria-label={intl.formatMessage(m.gates)} />
          </span>
          <span title={intl.formatMessage(m.human)}>
            <UserRound className="size-4" aria-label={intl.formatMessage(m.human)} />
          </span>
        </div>
      </header>
      <AskDrawer open={open} onOpenChange={setOpen} caseScoped={caseScoped}>
        {open &&
          (caseScoped ? (
            <p role="status" className="p-5 text-sm">
              {intl.formatMessage(m.caseUnavailable)}
            </p>
          ) : (
            <AskTheMint />
          ))}
      </AskDrawer>
    </>
  );
}
