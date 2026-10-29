import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import { useCreditPolicy } from "@/pages/mint-checks/api";
import { GateStrip } from "@/components/operator/GateStrip";
import { cockpit as m } from "@/components/operator/cockpit-messages";
import type { PortfolioQuote } from "./operator-api";
import { cockpitMessages } from "./cockpit-copy";
import { partyNameSignal } from "./counterparty-exposure";
import type { MintSummary } from "./operator-api";
export function NeedsCard({ quote, href, name, summary }: { quote?: PortfolioQuote; href: string; name: string; summary?: MintSummary }) {
  const intl = useIntl();
  const credit = useCreditAssessmentForBill(quote?.billId, quote?.quoteId, "book");
  const policy = useCreditPolicy();
  const one = credit.isUnavailable ? undefined : credit.decisionCase;
  const pack = policy.error ? undefined : policy.data?.policyPacks.find((p) => p.policyPackDigest === one?.policyPack.policyPackDigest);
  const terms = one?.assessmentCurrency === "current" ? one.result.terms : undefined;
  const lookalike = summary && quote ? partyNameSignal(summary, quote.drawee) : undefined;
  return (
    <article className="needs-card">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow text-amber-700 dark:text-amber-300">{intl.formatMessage(cockpitMessages.decisionNeeded)}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{quote?.quoteId.slice(0, 8)}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{name}</h3>
      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowRight className="size-3.5 shrink-0" />
        {quote?.drawee.name ?? intl.formatMessage(cockpitMessages.contextUnknown)}
      </p>
      {(lookalike?.sameName === true || lookalike?.similarName === true) && (
        <Link
          className="mt-2 block text-[11px] text-amber-700 underline dark:text-amber-300"
          to={`/directory?q=${encodeURIComponent(quote?.drawee.name ?? "")}`}
        >
          {intl.formatMessage(lookalike.sameName ? cockpitMessages.sameName : cockpitMessages.similarName)}
        </Link>
      )}
      <div className="my-4 flex items-end justify-between gap-3">
        <strong className="text-2xl tracking-tight tabular-nums">
          {quote ? intl.formatNumber(BigInt(quote.amountSat)) : "—"}
          <small className="ml-1 text-xs font-normal text-muted-foreground">sat</small>
        </strong>
        <span className="text-xs text-muted-foreground">
          {quote
            ? intl.formatDate(`${quote.maturity}T00:00:00Z`, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
            : "—"}
        </span>
      </div>
      <GateStrip decisionCase={one} gates={pack?.hardGatePrecedence} version={pack?.policyPackVersion} compact />
      <div className="mt-4 flex min-h-9 items-center gap-2 border-t border-border pt-3 text-xs">
        <Sparkles className="size-3.5 text-sky-600 dark:text-sky-400" />
        <span className="text-muted-foreground">{intl.formatMessage(m.proposed)}</span>
        <span className="ml-auto font-medium tabular-nums">
          {terms
            ? intl.formatMessage(m.proposalTerms, {
                fee: intl.formatNumber(BigInt(terms.effectiveFeeSat)),
                net: intl.formatNumber(BigInt(terms.discountedSat)),
              })
            : intl.formatMessage(cockpitMessages.unknown)}
        </span>
      </div>
      <Link
        className="mt-4 flex items-center justify-between rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-85"
        to={href}
      >
        {intl.formatMessage(m.review)}
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
