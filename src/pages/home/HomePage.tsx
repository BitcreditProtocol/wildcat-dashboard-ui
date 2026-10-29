import { NeedsCard } from "./NeedsCard";
import { ActivityFeed } from "./ActivityFeed";
import { useAge } from "./use-age";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@bitcredit/ui-library";
import { ArrowRight, Building2, Info, MessageCircle, RefreshCw, Sprout, TriangleAlert } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { useApplicantHelp, useCreditPolicy } from "@/pages/mint-checks/api";
import { policyAnchor } from "@/pages/policy/policy-links";
import { facilityQueryKey, readFacilityApplications, facilityRefetchInterval } from "@/pages/facilities/facility-api";
import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import { ApplicantText, ApplicantTextProvider } from "@/components/operator/ApplicantText";
import { FederationHealth } from "@/pages/network/FederationHealth";
import { useMintSummary, useOperatorCapacity, type MintSummary } from "./operator-api";
import { exposureIdentities } from "./counterparty-exposure";
import { monthlyMaturities } from "./portfolio-maturity";
import { cockpitMessages } from "./cockpit-copy";
import { cockpit } from "@/components/operator/cockpit-messages";
import { homeMessages as m } from "./home-copy";

const compact = (intl: ReturnType<typeof useIntl>, sat: bigint | string) =>
  intl.formatNumber(BigInt(sat), { notation: "compact", maximumFractionDigits: 1 });

/** Exposure per identity and role against its published limit, fullest first. Identities never merge by name. */
function ExposureList({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const policy = useCreditPolicy();
  const rows = exposureIdentities(summary)
    .flatMap((identity) =>
      identity.roles.map((party) => ({ ...party, sameName: identity.sameName, flagged: identity.sameName || identity.similarName }))
    )
    .map((party) => ({
      ...party,
      share: party.capSat === null ? 0 : Number((BigInt(party.usedSat) * 1000n) / (BigInt(party.capSat) || 1n)) / 10,
    }))
    .sort((a, b) => b.share - a.share);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{intl.formatMessage(cockpitMessages.noExposure)}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((party) => {
        const RoleIcon = party.role === "drawee" ? Building2 : Sprout;
        return (
          <li key={`${party.ref}-${party.role}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <RoleIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label={intl.formatMessage(party.role === "drawee" ? m.buyer : m.farm)}
                />
                <Link className="truncate hover:underline" title={party.ref} to={`/directory?q=${encodeURIComponent(party.ref)}`}>
                  {party.name}
                </Link>
                {party.flagged && (
                  <Link
                    className="lookalike-tag"
                    title={intl.formatMessage(party.sameName ? cockpitMessages.sameName : cockpitMessages.similarName)}
                    to={`/directory?q=${encodeURIComponent(party.name)}`}
                  >
                    {intl.formatMessage(m.lookalike)}
                  </Link>
                )}
              </span>
              {(() => {
                const text =
                  party.capSat === null
                    ? intl.formatMessage(m.noLimit, { used: compact(intl, party.usedSat) })
                    : intl.formatMessage(m.ofLimit, { used: compact(intl, party.usedSat), cap: compact(intl, party.capSat) });
                // Where the limit comes from stays one hover away: the published policy whose cap matches.
                const pack = policy.error
                  ? undefined
                  : policy.data?.policyPacks.find(
                      (p) =>
                        "maximumDraweeExposureSat" in p &&
                        (party.role === "drawee" ? p.maximumDraweeExposureSat : p.maximumDrawerExposureSat) === party.capSat
                    );
                return pack ? (
                  <Link
                    className="shrink-0 text-xs text-muted-foreground tabular-nums hover:underline"
                    title={`${intl.formatMessage(cockpitMessages.capSource)} ${pack.policyPackVersion}`}
                    to={`/policy#${policyAnchor(pack.policyPackVersion)}`}
                  >
                    {text}
                  </Link>
                ) : (
                  <span
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                    title={
                      party.capSat === null
                        ? undefined
                        : `${intl.formatMessage(cockpitMessages.capSource)} ${intl.formatMessage(cockpitMessages.capSourceUnknown)}`
                    }
                  >
                    {text}
                  </span>
                );
              })()}
            </div>
            <div className="exposure-track mt-1.5" role="img" aria-label={`${party.name}: ${party.share}%`}>
              <div className={`exposure-fill ${party.share >= 75 ? "is-high" : ""}`} style={{ width: `${Math.min(100, party.share)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DueDates({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  // Unknown payment state would understate what is still due; say so instead of drawing a short ladder.
  if (!summary.coverage.complete || summary.portfolio.quotes.some((q) => q.financed && q.paid === null))
    return (
      <figure>
        <figcaption className="mb-3 text-sm font-medium">{intl.formatMessage(m.maturities)}</figcaption>
        <p className="text-xs text-muted-foreground">{intl.formatMessage(cockpitMessages.maturityUnknown)}</p>
      </figure>
    );
  const months = monthlyMaturities(summary);
  const max = months.reduce((n, r) => (r.sat > n ? r.sat : n), 1n);
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-medium">{intl.formatMessage(m.maturities)}</figcaption>
      <div className="due-chart" role="img" aria-label={months.map((r) => `${r.month}: ${r.sat} sat`).join("; ")}>
        {months.map((r) => (
          <div key={r.month} className="due-column">
            <span className="due-value tabular-nums">{r.sat > 0n ? compact(intl, r.sat) : ""}</span>
            <div className="due-bar" style={{ height: `${r.sat > 0n ? Math.max(4, Number((r.sat * 100n) / max)) : 0}%` }} />
            <span className="due-label">{intl.formatDate(`${r.month}-01T00:00:00Z`, { month: "short", timeZone: "UTC" })}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function PortfolioSnapshot({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const accepted = BigInt(summary.portfolio.financedSat);
  const offered = BigInt(summary.portfolio.committedSat) - accepted;
  return (
    <section className="home-panel" data-testid="home-portfolio" aria-label={intl.formatMessage(m.portfolio)}>
      <h2 className="home-panel-title">{intl.formatMessage(m.portfolio)}</h2>
      {!summary.coverage.complete && (
        <p role="status" className="mb-3 text-xs text-amber-700 dark:text-amber-300">
          {intl.formatMessage(m.partial)}
        </p>
      )}
      <dl className="kpis">
        <div title={intl.formatMessage(m.acceptedWhy)}>
          <dt>
            {intl.formatMessage(m.accepted)}
            <Info className="ml-1 inline size-3 text-muted-foreground" aria-label={intl.formatMessage(m.acceptedWhy)} />
          </dt>
          <dd>
            {intl.formatNumber(accepted)} <small>sat</small>
          </dd>
        </div>
        <div>
          <dt>{intl.formatMessage(m.offered)}</dt>
          <dd>
            {intl.formatNumber(offered > 0n ? offered : 0n)} <small>sat</small>
          </dd>
        </div>
        <div>
          <dt>{intl.formatMessage(m.bills)}</dt>
          <dd>{summary.portfolio.quotes.length}</dd>
        </div>
      </dl>
      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-medium">{intl.formatMessage(m.exposure)}</h3>
          <ExposureList summary={summary} />
        </section>
        <DueDates summary={summary} />
      </div>
    </section>
  );
}

function HelpCard({ name, message, href, since }: { name: string; message: string; href: string; since: string }) {
  const intl = useIntl();
  const age = useAge();
  return (
    <article className="needs-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold tracking-tight">{name}</h3>
        <span className="needs-tag needs-help">{intl.formatMessage(m.reply)}</span>
      </div>
      <p className="mt-3 line-clamp-3 flex gap-2 text-sm">
        <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span>
          <ApplicantText>{message}</ApplicantText>
        </span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(m.asked, { age: age(since) })}</p>
      <Link className="needs-action" to={href}>
        {intl.formatMessage(m.answer)}
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}

export default function HomePage() {
  const intl = useIntl();
  const summary = useMintSummary();
  const capacity = useOperatorCapacity();
  const help = useApplicantHelp();
  const facilities = useQuery({
    queryKey: facilityQueryKey,
    queryFn: readFacilityApplications,
    refetchInterval: (q) => facilityRefetchInterval(q.state.data),
    retry: false,
  });
  // A failed background refresh keeps the last complete records on screen, marked with their time;
  // only a source that has never been read counts as a gap.
  const book = summary.data ?? undefined;
  const sources = [summary, help, facilities];
  const queueGaps = sources.some((q) => q.isError && q.data === undefined);
  const staleSince = sources.some((q) => q.isError && q.data !== undefined)
    ? Math.min(...sources.filter((q) => q.data !== undefined).map((q) => q.dataUpdatedAt))
    : null;
  useRevealAnchor(book ?? help.data ?? facilities.data);
  const quoteOf = (quoteId: string) => book?.portfolio.quotes.find((p) => p.quoteId === quoteId);
  // One card per quote: a buyer confirmation and an offer decision on the same case are one piece of work.
  const caseCards = (book?.queue ?? [])
    .filter((q, i, all) => all.findIndex((o) => o.quoteId === q.quoteId) === i)
    .map((q): { quoteId: string; kind: "buyer" | "quote"; quote: ReturnType<typeof quoteOf>; since: string | null } => ({
      quoteId: q.quoteId,
      kind: book?.queue.some((o) => o.quoteId === q.quoteId && o.kind === "buyer-confirmation") ? "buyer" : "quote",
      quote: quoteOf(q.quoteId),
      since: q.since,
    }));
  const helpCards = (help.data?.requests ?? [])
    .filter((r) => r.reply === null)
    .map((r) => ({
      request: r,
      name:
        book?.portfolio.quotes.find((p) => p.quoteId === r.mintQuoteId || p.billId === r.billId)?.drawer.name ??
        intl.formatMessage(m.reply),
    }));
  const facilityCards = (facilities.data ?? []).filter((r) => r.status === "operator_review" || r.status === "submitted");
  const needs = caseCards.length + helpCards.length + facilityCards.length;
  // Only limits that would stop new applications reach Home; the rest live on the Info page.
  const storageAlert =
    !capacity.error &&
    capacity.data?.items.some(
      (i) => ["initial-interviews", "case-cabinet-revisions", "case-cabinet-history-bytes"].includes(i.id) && i.status !== "ok"
    );
  const refresh = () => {
    void summary.refetch();
    void capacity.refetch();
    void help.refetch();
    void facilities.refetch();
  };
  return (
    <div className="today-cockpit">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{intl.formatMessage(cockpitMessages.today)}</h1>
          {book && (
            <p className="mt-1 text-sm text-muted-foreground">
              {intl.formatMessage(m.summary, {
                needs,
                accepted: intl.formatNumber(BigInt(book.portfolio.financedSat)),
                bills: book.portfolio.quotes.filter((q) => q.financed).length,
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {staleSince !== null && (
            <span className="text-xs text-muted-foreground" title={intl.formatMessage(m.staleWhy)}>
              {intl.formatMessage(m.stale, { time: intl.formatTime(staleSince) })}
            </span>
          )}
          <FederationHealth />
          <Button size="sm" variant="outline" onClick={refresh} aria-label={intl.formatMessage(cockpitMessages.refresh)}>
            <RefreshCw className={`size-4 ${summary.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>
      {storageAlert && (
        <Link to="/info#capacity" role="status" className="storage-alert">
          <TriangleAlert className="size-4 shrink-0" />
          {intl.formatMessage(m.storage)}
        </Link>
      )}
      <section id="action-queue" aria-label={intl.formatMessage(cockpitMessages.queue)}>
        <h2 className="home-section-title">
          {intl.formatMessage(cockpit.needs)}
          {needs > 0 && <span className="needs-count">{needs}</span>}
        </h2>
        {summary.isPending ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(cockpitMessages.loading)}</p>
        ) : needs === 0 && !queueGaps ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(m.allClear)}</p>
        ) : (
          <ApplicantTextProvider records={help.data?.operatorText}>
            {queueGaps && (
              <p role="status" className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                {intl.formatMessage(m.queueGaps)} · {intl.formatMessage(cockpitMessages.unavailable)}
              </p>
            )}
            <div className="needs-grid">
              {caseCards.map((c) => (
                <NeedsCard
                  key={c.quoteId}
                  kind={c.kind}
                  quote={c.quote}
                  name={c.quote?.drawer.name ?? c.quoteId}
                  href={`/quotes/${encodeURIComponent(c.quoteId)}${c.kind === "buyer" ? "#fraud-controls" : ""}`}
                  summary={book}
                />
              ))}
              {helpCards.map(({ request, name }) => (
                <HelpCard
                  key={request.requestId}
                  name={name}
                  message={request.message}
                  since={request.requestedAt}
                  href={`/help-requests#help-${request.requestId}`}
                />
              ))}
              {facilityCards.map((r) => (
                <article key={r.id} className="needs-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="truncate text-base font-semibold tracking-tight">{r.applicantName}</h3>
                    <span className="needs-tag needs-facility">{intl.formatMessage(m.facility)}</span>
                  </div>
                  <Link className="needs-action" to={`/facilities?application=${encodeURIComponent(r.id)}`}>
                    {intl.formatMessage(m.open)}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          </ApplicantTextProvider>
        )}
      </section>
      <div className="home-columns">
        {book ? (
          <PortfolioSnapshot summary={book} />
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            {intl.formatMessage(summary.isPending ? cockpitMessages.loading : cockpitMessages.unavailable)}
          </p>
        )}
        {book?.activity !== undefined && (
          <section className="home-panel" aria-label={intl.formatMessage(m.activity)}>
            <h2 className="home-panel-title">{intl.formatMessage(m.activity)}</h2>
            <ActivityFeed activity={book.activity} />
          </section>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{intl.formatMessage(m.footnote)}</p>
    </div>
  );
}
