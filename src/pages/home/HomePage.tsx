import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@bitcredit/ui-library";
import { ArrowUpRight, Clock3, Inbox, MessageCircle, Building2, UserCheck, RefreshCw } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useApplicantHelp } from "@/pages/mint-checks/api";
import { facilityQueryKey, readFacilityApplications, facilityRefetchInterval } from "@/pages/facilities/facility-api";
import { useRevealAnchor } from "@/components/operator/use-reveal-anchor";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { HorizontalBars, MaturityChart, CapacityMeter } from "@/components/operator/Charts";
import { FederationHealth } from "@/pages/network/FederationHealth";
import { useMintSummary, useOperatorCapacity, type MintSummary } from "./operator-api";
import { maturityBuckets } from "./portfolio-maturity";
import { cockpitMessages as m } from "./cockpit-copy";

interface QueueAction {
  kind: "quote" | "buyer" | "help" | "facility";
  id: string;
  href: string;
  since: string | null;
  name: string;
}
export function PortfolioSnapshot({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const sat = (v: string) => intl.formatNumber(BigInt(v));
  const buckets = maturityBuckets(summary);
  const paymentComplete = summary.coverage.complete && !summary.portfolio.quotes.some((q) => q.financed && q.paid === null);
  return (
    <section className="space-y-4">
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
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            {summary.portfolio.counterparties.length ? (
              <HorizontalBars
                title={intl.formatMessage(m.exposure)}
                maximum={100}
                axisLabel={intl.formatMessage(m.capAxis)}
                data={summary.portfolio.counterparties.slice(0, 8).map((p) => ({
                  id: `${p.role}:${p.ref}`,
                  label: `${p.name} · ${intl.formatMessage(m[p.role])}`,
                  value: p.capSat === null ? 0 : Number((BigInt(p.usedSat) * 10000n) / (BigInt(p.capSat) || 1n)) / 100,
                  display: intl.formatMessage(p.capSat === null ? m.noCap : m.cap, {
                    used: sat(p.usedSat),
                    cap: p.capSat === null ? "" : sat(p.capSat),
                  }),
                  attention: p.capSat !== null && BigInt(p.usedSat) * 10n >= BigInt(p.capSat) * 8n,
                }))}
              />
            ) : (
              <div>
                <h3 className="text-sm font-medium">{intl.formatMessage(m.exposure)}</h3>
                <p className="mt-6 text-sm text-muted-foreground">{intl.formatMessage(m.noExposure)}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            {paymentComplete ? (
              <MaturityChart
                title={intl.formatMessage(m.maturities)}
                values={buckets.map(Number)}
                displays={buckets.map((v) => intl.formatNumber(v, { notation: "compact" }))}
                labels={[
                  [0, 30],
                  [31, 60],
                  [61, 90],
                ].map(([from, to]) => intl.formatMessage(m.days, { from, to }))}
                axisLabel={intl.formatMessage(m.maturityAxis)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(m.maturityUnknown)}</p>
            )}
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
              name: r.mintQuoteId ?? r.requestId,
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
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {intl.formatDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{intl.formatMessage(m.today)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intl.formatMessage(m.subtitle)}</p>
        </div>
        <div className="flex items-center gap-2">
          <FederationHealth />
          <Button size="sm" variant="outline" onClick={refresh} aria-label={intl.formatMessage(m.refresh)}>
            <RefreshCw className={`size-4 ${summary.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>
      <section id="action-queue" aria-label={intl.formatMessage(m.queue)} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const items = actions.filter((a) => a.kind === g.kind);
          const oldest = items.find((a) => a.since !== null)?.since;
          const urgent = oldest !== undefined && oldest !== null && Date.now() - Date.parse(oldest) > 86400000;
          return (
            <Link
              key={g.kind}
              to={items[0]?.href ?? g.href}
              className={`group rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${urgent ? "border-amber-500/60" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <g.icon className={`size-5 ${urgent ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-400"}`} />
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <p className="mt-4 text-3xl font-semibold tabular-nums">{g.error || g.loading ? "—" : intl.formatNumber(items.length)}</p>
              <h2 className="mt-1 text-sm font-medium">{intl.formatMessage(m[g.kind])}</h2>
              <p className={`mt-2 text-xs ${urgent ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"}`}>
                {g.loading
                  ? intl.formatMessage(m.loading)
                  : g.error
                    ? intl.formatMessage(m.unavailable)
                    : oldest
                      ? intl.formatMessage(m.oldest, { age: age(oldest) })
                      : items.length
                        ? intl.formatMessage(m.ageUnknown)
                        : intl.formatMessage(m.empty)}
              </p>
            </Link>
          );
        })}
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
      {actions.length > 0 && (
        <section className="rounded-xl border border-border bg-card">
          <h2 className="px-4 pt-4 text-sm font-semibold">{intl.formatMessage(m.actionList)}</h2>
          <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-border">
            {actions.map((a) => (
              <li key={a.id}>
                <Link to={a.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent">
                  <span className="min-w-0">
                    <span className="mr-2 text-xs text-muted-foreground">{intl.formatMessage(m[a.kind])}</span>
                    <span className="break-words font-medium">{a.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {a.since ? age(a.since) : "—"}
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {capacity.data && !capacity.error && (
        <section id="capacity" className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{intl.formatMessage(m.capacity)}</h2>
          {capacity.data.items.some((i) => i.status !== "ok") && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{intl.formatMessage(m.capacityFull)}</p>
          )}
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {capacity.data.items.map((i) => (
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
                {i.detail && <p className="mt-1.5 text-[11px] text-muted-foreground">{i.detail}</p>}
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
