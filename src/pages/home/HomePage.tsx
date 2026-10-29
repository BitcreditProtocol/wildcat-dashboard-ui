import { AgentStrip } from "./AgentStrip";
import { NeedsCard } from "./NeedsCard";
import { Concentration } from "./Concentration";
import { cockpit } from "@/components/operator/cockpit-messages";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@bitcredit/ui-library";
import { ArrowUpRight, Inbox, MessageCircle, Building2, UserCheck, RefreshCw } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useApplicantHelp } from "@/pages/mint-checks/api";
import { facilityQueryKey, readFacilityApplications, facilityRefetchInterval } from "@/pages/facilities/facility-api";
import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { MaturityChart, CapacityMeter } from "@/components/operator/Charts";
import { FederationHealth } from "@/pages/network/FederationHealth";
import { useMintSummary, useOperatorCapacity, type MintSummary } from "./operator-api";
import { capacityLabels, capacityDetails } from "./capacity-copy";
import { CounterpartyExposure } from "./CounterpartyExposure";
import { maturityBuckets } from "./portfolio-maturity";
import { cockpitMessages as m } from "./cockpit-copy";

interface QueueAction {
  kind: "quote" | "buyer" | "help" | "facility";
  id: string;
  href: string;
  since: string | null;
  name: string;
  quote?: MintSummary["portfolio"]["quotes"][number];
}
export function PortfolioSnapshot({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const sat = (v: string) => intl.formatNumber(BigInt(v));
  const [horizon, setHorizon] = useState<90 | 365>(365);
  const buckets = maturityBuckets(summary, Date.now(), horizon);
  const maturityRanges =
    horizon === 90
      ? [
          [0, 30],
          [31, 60],
          [61, 90],
        ]
      : [
          [0, 90],
          [91, 180],
          [181, 365],
        ];
  const paymentComplete = summary.coverage.complete && !summary.portfolio.quotes.some((q) => q.financed && q.paid === null);
  return (
    <section className="portfolio-snapshot space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{intl.formatMessage(m.portfolio)}</h2>
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(m.coverage, {
            scanned: summary.coverage.scanned,
            listed: summary.coverage.listed,
            time: intl.formatTime(summary.observedAt),
          })}
        </p>
      </div>
      {!summary.coverage.complete && (
        <p role="status" className="text-xs text-amber-800 dark:text-amber-300">
          {intl.formatMessage(m.incomplete)}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: m.financed, value: summary.portfolio.financedSat },
          { label: m.outstanding, value: summary.portfolio.outstandingSat },
          { label: m.committed, value: summary.portfolio.committedSat },
        ].map((item) => (
          <Card key={item.label.id}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{intl.formatMessage(item.label)}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value === null ? "—" : sat(item.value)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {item.value === null ? intl.formatMessage(m.unknown) : "sat"}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="portfolio-grid grid gap-3 xl:grid-cols-[1.3fr_1fr_0.8fr]">
        <Card>
          <CardContent className="p-5">
            <CounterpartyExposure summary={summary} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            {paymentComplete ? (
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 text-sm">
                  {intl.formatMessage(m.maturityHorizon)}
                  <select
                    className="rounded-lg border border-divider-75 bg-background px-3 py-2"
                    value={horizon}
                    onChange={(event) => setHorizon(event.target.value === "90" ? 90 : 365)}
                  >
                    {[90, 365].map((days) => (
                      <option key={days} value={days}>
                        {intl.formatMessage(m.maturityRange, { days })}
                      </option>
                    ))}
                  </select>
                </label>
                <MaturityChart
                  title={intl.formatMessage(m.maturities, { days: horizon })}
                  values={buckets.map(Number)}
                  displays={buckets.map((v) => intl.formatNumber(v, { notation: "compact" }))}
                  labels={maturityRanges.map(([from, to]) => intl.formatMessage(m.days, { from, to }))}
                  axisLabel={intl.formatMessage(m.maturityAxis)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(m.maturityUnknown)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Concentration summary={summary} />
          </CardContent>
        </Card>
      </div>
    </section>
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
  const legacy = useQuery({
    ...listQuotesOptions({ query: { limit: 128 } }),
    enabled: summary.data === null,
    refetchInterval: 30_000,
    retry: false,
  });
  const book = summary.error ? undefined : summary.data;
  useRevealAnchor(book ?? capacity.data ?? legacy.data ?? help.data ?? facilities.data);
  const actions: QueueAction[] = [
    ...(book?.queue ?? []).map(
      (q): QueueAction => ({
        kind: q.kind === "quote" ? "quote" : "buyer",
        id: `${q.kind}:${q.quoteId}`,
        href: `/quotes/${encodeURIComponent(q.quoteId)}${q.kind === "buyer-confirmation" ? "#fraud-controls" : ""}`,
        since: q.since,
        name: book?.portfolio.quotes.find((p) => p.quoteId === q.quoteId)?.drawer.name ?? q.quoteId,
        quote: book?.portfolio.quotes.find((p) => p.quoteId === q.quoteId),
      })
    ),
    ...(summary.data === null && !legacy.error
      ? (legacy.data?.data ?? [])
          .filter((q) => q.status === "Pending")
          .map((q): QueueAction => ({ kind: "quote", id: q.id, href: `/quotes/${encodeURIComponent(q.id)}`, since: null, name: q.id }))
      : []),
    ...(!help.error
      ? (help.data?.requests ?? [])
          .filter((r) => r.reply === null)
          .map(
            (r): QueueAction => ({
              kind: "help",
              id: r.requestId,
              href: `/help-requests#help-${r.requestId}`,
              since: r.requestedAt,
              name: book?.portfolio.quotes.find((p) => p.quoteId === r.mintQuoteId || p.billId === r.billId)?.drawer.name ?? r.holderRef,
              quote: book?.portfolio.quotes.find((p) => p.quoteId === r.mintQuoteId || p.billId === r.billId),
            })
          )
      : []),
    ...(!facilities.error
      ? (facilities.data ?? [])
          .filter((r) => r.status === "operator_review" || r.status === "submitted")
          .map(
            (r): QueueAction => ({
              kind: "facility",
              id: r.id,
              href: `/facilities?application=${encodeURIComponent(r.id)}`,
              since: r.updatedAt,
              name: r.applicantName,
            })
          )
      : []),
  ];
  actions.sort((a, b) => (a.since ?? "9999").localeCompare(b.since ?? "9999"));
  const groups = [
    {
      kind: "quote",
      icon: Inbox,
      href: "/quotes/pending",
      error: summary.error ?? legacy.error,
      loading: summary.isPending || (summary.data === null && legacy.isPending),
    },
    {
      kind: "buyer",
      icon: UserCheck,
      href: "/quotes/pending",
      error: summary.error !== null || summary.data === null,
      loading: summary.isPending,
    },
    { kind: "help", icon: MessageCircle, href: "/help-requests", error: help.error, loading: help.isPending },
    {
      kind: "facility",
      icon: Building2,
      href: "/facilities?status=operator_review",
      error: facilities.error,
      loading: facilities.isPending,
    },
  ] as const;
  const age = (since: string) => {
    const hours = Math.max(0, (Date.now() - Date.parse(since)) / 3600000);
    return intl.formatNumber(hours < 24 ? hours : hours / 24, {
      style: "unit",
      unit: hours < 24 ? "hour" : "day",
      unitDisplay: "short",
      maximumFractionDigits: 0,
    });
  };
  const refresh = () => {
    void summary.refetch();
    void capacity.refetch();
    void help.refetch();
    void facilities.refetch();
    if (summary.data === null) void legacy.refetch();
  };
  const capacityItems = (capacity.data?.items ?? []).map((item) => {
    const label = Object.entries(capacityLabels).find(([id]) => id === item.id)?.[1];
    const detail = Object.values(capacityDetails).find((message) => message.defaultMessage === item.detail);
    return { ...item, label: label ? intl.formatMessage(label) : item.label, detail: detail ? intl.formatMessage(detail) : item.detail };
  });
  return (
    <div className="today-cockpit space-y-4">
      <header className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {intl.formatDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{intl.formatMessage(m.today)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intl.formatMessage(cockpit.doctrine)}</p>
        </div>
        <div className="flex items-center gap-2">
          <FederationHealth />
          <Button size="sm" variant="outline" onClick={refresh} aria-label={intl.formatMessage(m.refresh)}>
            <RefreshCw className={`size-4 ${summary.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>
      <AgentStrip
        capacity={capacity.error ? undefined : capacity.data}
        helpCount={help.error || help.isPending ? undefined : actions.filter((a) => a.kind === "help").length}
      />
      <section id="action-queue" aria-label={intl.formatMessage(m.queue)}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {intl.formatMessage(cockpit.needs)}{" "}
            <span className="ml-2 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              {groups.some((g) => g.loading || g.error) ? "—" : new Set(actions.map((a) => a.quote?.quoteId ?? a.id)).size}
            </span>
          </h2>
          <Link to="/quotes/pending" className="text-xs text-muted-foreground hover:underline">
            {intl.formatMessage(cockpit.review)} ↗
          </Link>
        </div>
        <div className="needs-grid grid gap-3 lg:grid-cols-3">
          {actions
            .filter((a) => a.kind === "quote" || a.kind === "buyer")
            .filter((a, index, list) => list.findIndex((b) => (b.quote?.quoteId ?? b.id) === (a.quote?.quoteId ?? a.id)) === index)
            .map((a) => (
              <NeedsCard key={a.id} quote={a.quote} href={a.href} name={a.name} summary={book ?? undefined} />
            ))}
        </div>
        <div className="attention-strip mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {groups.map((g) => {
            const items = actions.filter((a) => a.kind === g.kind);
            const oldest = items.find((a) => a.since)?.since;
            return (
              <Link
                key={g.kind}
                to={items[0]?.href ?? g.href}
                className="attention-row flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
              >
                <g.icon className="size-4 text-muted-foreground" />
                <span className="text-xs">
                  {intl.formatMessage(m[g.kind])}
                  <small className="mt-1 block text-[11px] text-muted-foreground">
                    {g.loading
                      ? intl.formatMessage(m.loading)
                      : g.error
                        ? intl.formatMessage(m.unavailable)
                        : oldest
                          ? intl.formatMessage(m.oldest, { age: age(oldest) })
                          : items.length
                            ? intl.formatMessage(m.ageUnknown)
                            : intl.formatMessage(m.empty)}
                  </small>
                </span>
                <strong className="ml-auto text-xl tabular-nums">{g.error || g.loading ? "—" : items.length}</strong>
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </section>
      {(book?.coverage.complete === false || (legacy.data !== undefined && legacy.data.total > legacy.data.data.length)) && (
        <p role="status" className="text-xs text-amber-800 dark:text-amber-300">
          {intl.formatMessage(m.incomplete)}
        </p>
      )}
      {book ? (
        <PortfolioSnapshot summary={book} />
      ) : summary.data === null ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{intl.formatMessage(m.legacy)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: m.financed, states: ["Accepted", "MintingEnabled"] },
              { label: m.committed, states: ["Offered", "Accepted", "MintingEnabled"] },
            ].map((g) => (
              <Card key={g.label.id}>
                <CardContent className="p-4">
                  <h2 className="text-xs text-muted-foreground">{intl.formatMessage(g.label)}</h2>
                  <p className="mt-2 text-2xl font-semibold">
                    {legacy.error || !legacy.data
                      ? "—"
                      : intl.formatNumber(
                          (legacy.data?.data ?? []).filter((q) => g.states.includes(q.status)).reduce((n, q) => n + BigInt(q.sum), 0n)
                        )}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">sat</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {intl.formatMessage(m.unavailable)}
        </p>
      )}
      {capacity.data && !capacity.error && (
        <section id="capacity" className="capacity-section rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{intl.formatMessage(m.capacity)}</h2>
          {capacity.data.items.some((i) => i.status !== "ok") && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{intl.formatMessage(m.capacityFull)}</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {capacityItems.map((i) => (
              <div key={i.id}>
                <CapacityMeter
                  label={i.label}
                  used={i.used}
                  limit={i.limit}
                  status={i.status}
                  value={intl.formatMessage(i.unit === "bytes" ? m.capacityBytes : m.capacityValue, {
                    used: intl.formatNumber(i.used, { notation: i.unit === "bytes" ? "compact" : "standard" }),
                    limit: intl.formatNumber(i.limit, { notation: i.unit === "bytes" ? "compact" : "standard" }),
                    status: intl.formatMessage(m[i.status]),
                  })}
                />
                {i.detail && (
                  <details className="mt-1 text-[11px] text-muted-foreground">
                    <summary>{intl.formatMessage(m.capacity)}</summary>
                    <p>{i.detail}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {capacity.error && (
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {intl.formatMessage(m.capacity)} · {intl.formatMessage(m.unavailable)}
        </p>
      )}
      <BoundaryNotice summary={intl.formatMessage(m.boundary)}>{intl.formatMessage(m.boundaryFull)}</BoundaryNotice>
    </div>
  );
}
