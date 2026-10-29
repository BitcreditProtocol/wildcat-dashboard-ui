import { Checks } from "@/components/operator/Checks";
import { BuyerExposure } from "./BuyerExposure";
import { cockpit } from "@/components/operator/cockpit-messages";
import { matchedBriefNotes } from "./decision-brief-data";
import { Card, CardContent } from "@bitcredit/ui-library";
import { ArrowUpRight } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import type { BillInfo } from "@/generated/client/types.gen";
import type { DecisionCase } from "@/pages/credit/decision-types";
import { feeBreakdown } from "@/pages/credit/fee-breakdown";
import { useBillSignerReview, useMintIntelligence, useCreditPolicy } from "@/pages/mint-checks/api";
import { countryName } from "@/utils/bill-participants";
import { policyLocation } from "@/pages/policy/policy-links";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { briefMessages as m } from "./decision-brief-copy";

/** The decision at a glance: the numbers, the checks, the price and the buyer's exposure. Detail stays one click away. */
export function DecisionBrief({ quoteId, bill, decisionCase }: { quoteId: string; bill: BillInfo; decisionCase?: DecisionCase }) {
  const intl = useIntl();
  const intelligence = useMintIntelligence();
  const catalogue = useCreditPolicy();
  const signers = useBillSignerReview(quoteId);
  const snapshot = decisionCase?.snapshot;
  const terms = decisionCase?.result.terms;
  const breakdown = decisionCase ? feeBreakdown(decisionCase) : undefined;
  const notes =
    intelligence.data && !intelligence.error
      ? matchedBriefNotes(intelligence.data, [
          snapshot?.country ?? bill.drawer.country,
          countryName(snapshot?.country ?? bill.drawer.country, "en"),
          countryName(snapshot?.country ?? bill.drawer.country, "es"),
          snapshot?.industry ?? "",
          snapshot?.confirmedClaims.repaymentSource ?? "",
        ])
      : [];
  const lookalikes = signers.error ? [] : (signers.data?.parties.filter((p) => p.directoryMatches.length > 0) ?? []);
  const policy = catalogue.error
    ? undefined
    : catalogue.data?.policyPacks.find((p) => p.policyPackDigest === decisionCase?.policyPack.policyPackDigest);
  const confirmations =
    snapshot?.fraudControls?.buyerConfirmations.filter((c) => c.billId === bill.id && c.draweeNodeId === bill.drawee.node_id) ?? [];
  const confirmation = confirmations[confirmations.length - 1];
  const confirmationRequired =
    policy && "buyerConfirmationRequiredAboveSat" in policy && BigInt(bill.sum) > BigInt(policy.buyerConfirmationRequiredAboveSat);
  const buyerLabel =
    confirmation?.outcome === "denied_obligation"
      ? m.denied
      : confirmation?.outcome === "confirmed_obligation"
        ? m.confirmed
        : confirmation?.outcome === "unreachable"
          ? m.unreachable
          : confirmationRequired
            ? m.required
            : policy && "buyerConfirmationRequiredAboveSat" in policy
              ? m.notRequired
              : m.unknown;
  const sat = (value: string | number) => `${intl.formatNumber(BigInt(value))} sat`;
  const tenor =
    terms?.tenorDays ?? Math.ceil((Date.parse(bill.maturity_date) - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000);
  const components = {
    funding: "costOfFundsBps",
    payerRisk: "expectedLossBps",
    uncertainty: "uncertaintyMarginBps",
    mintReturn: "returnObjectiveBps",
    subsidy: "subsidyBps",
  };
  const parts = breakdown
    ? [...breakdown.parts, { key: "operating" as const, sat: breakdown.operatingCostSat }].filter((p) => p.sat > 0)
    : [];
  const partsTotal = parts.reduce((n, p) => n + p.sat, 0);
  return (
    <Card className="verdict-block">
      <CardContent className="space-y-4 p-4">
        {decisionCase?.assessmentCurrency === "historical" && (
          <p className="text-xs text-amber-800 dark:text-amber-300">{intl.formatMessage(m.historical)}</p>
        )}
        {!snapshot && <p className="text-xs text-muted-foreground">{intl.formatMessage(m.noAssessment)}</p>}
        <dl className="brief-numbers">
          {[
            { label: m.amount, value: sat(bill.sum) },
            { label: m.tenor, value: Number.isFinite(tenor) ? intl.formatMessage(m.days, { count: tenor }) : "—" },
            { label: m.fee, value: terms ? sat(terms.effectiveFeeSat) : intl.formatMessage(m.notPriced) },
            { label: m.net, value: terms ? sat(terms.discountedSat) : "—" },
          ].map((f) => (
            <div key={f.label.id}>
              <dt>{intl.formatMessage(f.label)}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Checks decisionCase={decisionCase} gates={policy?.hardGatePrecedence} version={policy?.policyPackVersion} />
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3 text-xs">
              <h3 className="text-sm font-medium">{intl.formatMessage(m.buyer)}</h3>
              <a href="#fraud-controls" className="text-primary hover:underline">
                {intl.formatMessage(buyerLabel)}
              </a>
            </div>
          </div>
          <div className="space-y-4">
            {breakdown && policy && partsTotal > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-medium">{intl.formatMessage(m.components)}</h3>
                <div
                  className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-muted"
                  aria-label={intl.formatMessage(m.components)}
                  role="img"
                >
                  {parts.map((part) => (
                    <div
                      key={part.key}
                      className={`portfolio-segment price-${part.key}`}
                      title={`${intl.formatMessage(m[part.key])} · ${sat(part.sat)}`}
                      style={{ width: `${(part.sat / partsTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="price-legend">
                  {breakdown.parts.map((part) => (
                    <li key={part.key}>
                      <span className={`legend-dot price-${part.key}`} />
                      <Link to={policyLocation(policy.policyPackVersion, components[part.key])} className="hover:underline">
                        {intl.formatMessage(m[part.key])}
                      </Link>
                      <span className="ml-auto tabular-nums text-muted-foreground">{sat(part.sat)}</span>
                    </li>
                  ))}
                  <li>
                    <span className="legend-dot price-operating" />
                    <Link to={policyLocation(policy.policyPackVersion, "operatingCostSat")} className="hover:underline">
                      {intl.formatMessage(m.operating)}
                    </Link>
                    <span className="ml-auto tabular-nums text-muted-foreground">{sat(breakdown.operatingCostSat)}</span>
                  </li>
                </ul>
              </section>
            )}
            <BuyerExposure buyerRef={bill.drawee.node_id} quoteId={quoteId} amount={bill.sum} />
          </div>
        </div>
        <details className="brief-context">
          <summary className="disclosure-row text-xs font-medium">{intl.formatMessage(cockpit.context)}</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-medium">{intl.formatMessage(m.intelligence)}</h3>
              {notes.length ? (
                <ul className="mt-2 space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <li key={note.id}>
                      <Link to={`/intelligence#note-${note.id}`} className="flex items-center gap-1 text-xs font-medium hover:underline">
                        {note.title}
                        <ArrowUpRight className="size-3" />
                      </Link>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {note.body.length > 180 ? `${note.body.slice(0, 180)}…` : note.body}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {intl.formatMessage(m.dates, {
                          authored: intl.formatDate(note.authoredAt, { dateStyle: "medium" }),
                          review: note.reviewBy
                            ? intl.formatDate(note.reviewBy, { dateStyle: "medium", timeZone: "UTC" })
                            : intl.formatMessage(m.undated),
                        })}
                        {note.reviewBy && note.reviewBy < new Date().toISOString().slice(0, 10) && (
                          <strong className="ml-1 text-amber-800 dark:text-amber-300">· {intl.formatMessage(m.stale)}</strong>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {intl.formatMessage(intelligence.error || !intelligence.data ? m.notesUnknown : m.noNotes)}
                </p>
              )}
            </section>
            <section>
              <h3 className="text-xs font-medium">{intl.formatMessage(m.directory)}</h3>
              {lookalikes.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lookalikes.map((p) => (
                    <li key={p.ref}>
                      <Link className="lookalike-tag" to={`/directory?q=${encodeURIComponent(p.name ?? p.ref)}`}>
                        {p.name ?? p.ref} · {p.directoryMatches.length}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {intl.formatMessage(signers.error || !signers.data?.directoryComplete ? m.directoryUnknown : m.noMatches)}
                </p>
              )}
            </section>
          </div>
          <div className="mt-3">
            <BoundaryNotice summary={intl.formatMessage(m.context)}>{intl.formatMessage(m.contextFull)}</BoundaryNotice>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
