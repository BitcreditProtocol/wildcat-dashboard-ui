import { capacityLabels } from "./capacity-copy";
import { Sparkles, ShieldCheck, UserRound, Activity } from "lucide-react";
import { useIntl } from "react-intl";
import { useCreditAssessments } from "@/pages/credit/use-credit-assessment";
import { useFederationDisplay } from "@/pages/network/use-federation-display";
import { cockpit as m } from "@/components/operator/cockpit-messages";
import { Link } from "react-router";
export function AgentStrip({ helpCount, capacity }: { helpCount?: number; capacity?: import("./operator-api").OperatorCapacity | null }) {
  const intl = useIntl();
  const cases = useCreditAssessments();
  const federation = useFederationDisplay();
  const data = cases.error ? undefined : cases.data;
  const cabinet = capacity?.items.find((i) => i.id === "case-cabinet-revisions");
  const tiles = [
    ...(data
      ? [
          { label: m.assessed, value: data.cases.length, icon: Sparkles, href: "/quotes" },
          {
            label: m.interviews,
            value: (data.applications ?? []).filter((a) => a.status === "interviewing" || a.status === "processing").length,
            icon: Sparkles,
            href: "/quotes",
          },
          {
            label: m.register,
            value: data.cases.filter((c) => c.snapshot.fraudControls?.taxAuthority?.status === "valid").length,
            icon: ShieldCheck,
            href: "/quotes",
          },
        ]
      : []),
    ...(helpCount === undefined ? [] : [{ label: m.help, value: helpCount, icon: UserRound, href: "/help-requests" }]),
  ];
  return (
    <section aria-label={intl.formatMessage(m.agents)} className="agent-strip">
      <h2 className="eyebrow flex items-center gap-2">
        <Sparkles className="size-3.5" />
        {intl.formatMessage(m.agents)}
      </h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label.id} to={t.href} className="agent-tile">
            <t.icon className="size-4 text-muted-foreground" />
            <strong className="text-xl font-semibold tabular-nums">{intl.formatNumber(t.value)}</strong>
            <span className="text-[11px] text-muted-foreground">{intl.formatMessage(t.label)}</span>
            <span className="status-dot ml-auto" />
          </Link>
        ))}
        {cabinet && (
          <Link to="/#capacity" className="agent-tile" title={intl.formatMessage(capacityLabels["case-cabinet-revisions"])}>
            <ShieldCheck className="size-4 text-muted-foreground" />
            <strong className="text-sm tabular-nums">
              {cabinet.used}/{cabinet.limit}
            </strong>
            <span className="text-[11px] text-muted-foreground">{intl.formatMessage(capacityLabels["case-cabinet-revisions"])}</span>
            <span className={`status-dot ml-auto ${cabinet.status === "ok" ? "" : "status-warning"}`} />
          </Link>
        )}
        <Link to="/network" className="agent-tile">
          <Activity className="size-4 text-muted-foreground" />
          <span className={`status-dot ${federation.phase === "healthy" ? "" : "status-warning"}`} />
          {federation.observation && (
            <strong className="text-sm tabular-nums">
              {federation.observation.relays.relays.filter((r) => r.coverage.reachable).length}/
              {federation.observation.relays.relays.length}
            </strong>
          )}
          <span className="text-[11px] text-muted-foreground">{intl.formatMessage(m.watch)}</span>
        </Link>
      </div>
    </section>
  );
}
