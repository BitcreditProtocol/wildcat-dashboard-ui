import { matchedBriefNotes, recordedGateStatus } from "./decision-brief-data";
import { Card, CardContent } from "@bitcredit/ui-library";
import { CircleCheck, CircleHelp, OctagonAlert, ArrowUpRight } from "lucide-react";
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
    <Card className="border-sky-700/25 dark:border-sky-400/25">
      <CardContent className="space-y-4 p-5">
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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{intl.formatMessage(m.checks)}</h3>
            {policy && decisionCase ? (
              <ul className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                {policy.hardGatePrecedence.map((gate) => {
                  const status = recordedGateStatus(decisionCase, gate);
                  return (
                    <li key={gate}>
                      <Link
                        to={policyLocation(policy.policyPackVersion, gate)}
                        className="flex items-center gap-1.5 rounded py-1 text-[11px] hover:underline"
                        title={gate}
                      >
                        {status === "pass" ? (
                          <CircleCheck className="size-3.5 shrink-0 text-sky-700 dark:text-sky-400" />
                        ) : status === "fail" ? (
                          <OctagonAlert className="size-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
                        ) : (
                          <CircleHelp className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span>{gate in m ? intl.formatMessage(m[gate as keyof typeof m]) : gate}</span>
                        <span className="ml-auto shrink-0 font-medium">{intl.formatMessage(m[status])}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(m.unknown)}</p>
            )}
            {breakdown && policy && (
              <div className="mt-3 border-t border-border pt-3">
                <h3 className="mb-2 text-xs font-medium">{intl.formatMessage(m.components)}</h3>
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
          <div className="space-y-4">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{intl.formatMessage(m.intelligence)}</h3>
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
            <section className="border-t border-border pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{intl.formatMessage(m.directory)}</h3>
              {lookalikes.length ? (
                <ul className="mt-2 space-y-1">
                  {lookalikes.slice(0, 3).map((p) => (
                    <li key={p.ref}>
                      <Link className="text-xs text-primary hover:underline" to={directoryLink(p.name ?? p.ref)}>
                        {p.name ?? p.ref} · {p.directoryMatches.length} ↗
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
        </div>
        <BoundaryNotice summary={intl.formatMessage(m.context)}>{intl.formatMessage(m.contextFull)}</BoundaryNotice>
      </CardContent>
    </Card>
  );
}
