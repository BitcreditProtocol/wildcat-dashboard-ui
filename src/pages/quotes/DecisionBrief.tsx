import { GateStrip } from "@/components/operator/GateStrip";
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
import { directoryLink } from "@/pages/mint-checks/mint-check-format";
import { policyLocation } from "@/pages/policy/policy-links";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { briefMessages as m } from "./decision-brief-copy";

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
  return (
    <Card className="verdict-block border-sky-700/25 dark:border-sky-400/25">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{intl.formatMessage(m.title)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {snapshot
                ? intl.formatMessage(m.recorded, { date: intl.formatDate(snapshot.asOfDate, { dateStyle: "medium", timeZone: "UTC" }) })
                : intl.formatMessage(m.noAssessment)}
            </p>
            {decisionCase?.assessmentCurrency === "historical" && (
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{intl.formatMessage(m.historical)}</p>
            )}
          </div>
          {decisionCase && (
            <a href="#ask-about-case" className="text-xs text-primary underline underline-offset-4">
              {intl.formatMessage(m.openCaseChat)}
            </a>
          )}
        </div>
        {decisionCase?.result.assessmentTrace
          .filter((t) => t.outcome === "fail")
          .map((t) => (
            <Link
              key={t.ruleId}
              to={policyLocation(decisionCase.policyPack.policyPackVersion, t.ruleId)}
              className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-300"
            >
              {t.ruleId in m ? intl.formatMessage(m[t.ruleId as keyof typeof m]) : t.ruleId.replace(/_/g, " ")} ↗
            </Link>
          ))}
        {lookalikes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lookalikes.map((p) => (
              <Link
                key={p.ref}
                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
                to={directoryLink(p.name ?? p.ref)}
              >
                {p.name ?? p.ref} · {p.directoryMatches.length} ↗
              </Link>
            ))}
          </div>
        )}
        <dl className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
          {[
            { label: m.amount, value: sat(bill.sum) },
            { label: m.tenor, value: Number.isFinite(tenor) ? intl.formatMessage(m.days, { count: tenor }) : "—" },
            { label: m.fee, value: terms ? sat(terms.effectiveFeeSat) : intl.formatMessage(m.notPriced) },
            { label: m.net, value: terms ? sat(terms.discountedSat) : "—" },
          ].map((f) => (
            <div key={f.label.id}>
              <dt className="text-[11px] text-muted-foreground">{intl.formatMessage(f.label)}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <GateStrip decisionCase={decisionCase} gates={policy?.hardGatePrecedence} version={policy?.policyPackVersion} />
            {breakdown && policy && (
              <div className="mt-3 border-t border-border pt-3">
                <h3 className="mb-2 text-xs font-medium">{intl.formatMessage(m.components)}</h3>
                <div
                  className="mb-2 flex h-3 overflow-hidden rounded-full bg-muted"
                  aria-label={intl.formatMessage(m.components)}
                  role="img"
                >
                  {[...breakdown.parts, { key: "operating" as const, sat: breakdown.operatingCostSat }]
                    .filter((p) => p.sat > 0)
                    .map((part) => (
                      <div
                        key={part.key}
                        className={`portfolio-segment price-${part.key}`}
                        title={`${intl.formatMessage(m[part.key])} · ${sat(part.sat)}`}
                        style={{
                          width: `${(part.sat / ([...breakdown.parts].reduce((n, p) => n + Math.max(0, p.sat), 0) + breakdown.operatingCostSat)) * 100}%`,
                        }}
                      />
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {breakdown.parts.map((part) => (
                    <Link
                      key={part.key}
                      to={policyLocation(policy.policyPackVersion, components[part.key])}
                      className="rounded-full border border-border px-2 py-1 text-[11px] hover:underline"
                    >
                      {intl.formatMessage(m[part.key])} · {sat(part.sat)}
                    </Link>
                  ))}
                  <Link
                    className="rounded-full border border-border px-2 py-1 text-[11px] hover:underline"
                    to={policyLocation(policy.policyPackVersion, "operatingCostSat")}
                  >
                    {intl.formatMessage(m.operating)} · {sat(breakdown.operatingCostSat)}
                  </Link>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-border pt-3 text-xs">
              <h3 className="font-medium">{intl.formatMessage(m.buyer)}</h3>
              <a href="#fraud-controls" className="text-primary hover:underline">
                {intl.formatMessage(buyerLabel)} ↗
              </a>
            </div>
          </section>
          <div className="space-y-3">
            <BuyerExposure buyerRef={bill.drawee.node_id} quoteId={quoteId} amount={bill.sum} />
            <details className="rounded-lg border border-border px-3 py-2">
              <summary className="disclosure-row text-xs font-medium">{intl.formatMessage(cockpit.context)}</summary>
              <div className="mt-3 space-y-3">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {intl.formatMessage(m.intelligence)}
                  </h3>
                  {notes.length ? (
                    <ul className="mt-2 space-y-2">
                      {notes.slice(0, 3).map((note) => (
                        <li key={note.id}>
                          <Link
                            to={`/intelligence#note-${note.id}`}
                            className="flex items-center gap-1 text-xs font-medium hover:underline"
                          >
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
                <section className="border-t border-border pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{intl.formatMessage(m.directory)}</h3>
                  {lookalikes.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(m.context)}</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {intl.formatMessage(signers.error || !signers.data?.directoryComplete ? m.directoryUnknown : m.noMatches)}
                    </p>
                  )}
                </section>
              </div>
            </details>
          </div>
        </div>
        <BoundaryNotice summary={intl.formatMessage(m.context)}>{intl.formatMessage(m.contextFull)}</BoundaryNotice>
      </CardContent>
    </Card>
  );
}
