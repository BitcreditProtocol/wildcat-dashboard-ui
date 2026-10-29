import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import { useCreditAssessmentForBill } from "@/pages/credit/use-credit-assessment";
import { useCreditPolicy } from "@/pages/mint-checks/api";
import { ChecksLine } from "@/components/operator/Checks";
import type { MintSummary, PortfolioQuote } from "./operator-api";
import { cockpitMessages } from "./cockpit-copy";
import { homeMessages as m } from "./home-copy";
import { partyNameSignal } from "./counterparty-exposure";

/** A case that waits for a person: who, what, how the checks went, and the one next step. */
export function NeedsCard({
  quote,
  href,
  name,
  summary,
  kind,
}: {
  quote?: PortfolioQuote;
  href: string;
  name: string;
  summary?: MintSummary;
  kind: "quote" | "buyer";
}) {
  const intl = useIntl();
  const credit = useCreditAssessmentForBill(quote?.billId, quote?.quoteId, "book");
  const policy = useCreditPolicy();
  const one = credit.isUnavailable ? undefined : credit.decisionCase;
  const pack = policy.error ? undefined : policy.data?.policyPacks.find((p) => p.policyPackDigest === one?.policyPack.policyPackDigest);
  const terms = one?.assessmentCurrency === "current" ? one.result.terms : undefined;
  const lookalike = summary && quote ? partyNameSignal(summary, quote.drawee) : undefined;
  return (
    <article className="needs-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight" title={name}>
            {name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <ArrowRight className="size-3 shrink-0" />
            {quote?.drawee.name ?? intl.formatMessage(cockpitMessages.contextUnknown)}
            {(lookalike?.sameName === true || lookalike?.similarName === true) && (
              <Link
                className="lookalike-tag"
                title={intl.formatMessage(lookalike.sameName ? cockpitMessages.sameName : cockpitMessages.similarName)}
                to={`/directory?q=${encodeURIComponent(quote?.drawee.name ?? "")}`}
              >
                {intl.formatMessage(m.lookalike)}
              </Link>
            )}
          </p>
        </div>
        <span className={`needs-tag needs-${kind}`}>{intl.formatMessage(kind === "buyer" ? m.confirmBuyer : m.decide)}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <strong className="text-xl font-semibold tracking-tight tabular-nums">
          {quote ? intl.formatNumber(BigInt(quote.amountSat)) : "—"}
          <small className="ml-1 text-xs font-normal text-muted-foreground">sat</small>
        </strong>
        <span className="text-xs text-muted-foreground">
          {quote
            ? intl.formatDate(`${quote.maturity}T00:00:00Z`, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
            : "—"}
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs">
        <ChecksLine decisionCase={one} gates={pack?.hardGatePrecedence} />
        <p className="text-muted-foreground tabular-nums">
          {terms
            ? intl.formatMessage(m.offerReady, {
                net: intl.formatNumber(BigInt(terms.discountedSat)),
                fee: intl.formatNumber(BigInt(terms.effectiveFeeSat)),
              })
            : intl.formatMessage(m.noTerms)}
        </p>
      </div>
      <Link className="needs-action" to={href}>
        {intl.formatMessage(m.open)}
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
