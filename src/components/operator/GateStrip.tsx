import { CircleCheck, CircleHelp, OctagonAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import type { DecisionCase } from "@/pages/credit/decision-types";
import { recordedGateStatus } from "@/pages/quotes/decision-brief-data";
import { briefMessages } from "@/pages/quotes/decision-brief-copy";
import { policyLocation } from "@/pages/policy/policy-links";
import { cockpit as m } from "./cockpit-messages";
export function GateStrip({
  decisionCase,
  gates,
  version,
  compact = false,
}: {
  decisionCase?: DecisionCase;
  gates?: readonly string[];
  version?: string;
  compact?: boolean;
}) {
  const intl = useIntl();
  const items = (gates ?? []).map((gate) => ({
    gate,
    status: decisionCase ? recordedGateStatus(decisionCase, gate) : ("unknown" as const),
  }));
  const counts = {
    pass: items.filter((i) => i.status === "pass").length,
    fail: items.filter((i) => i.status === "fail").length,
    unknown: items.filter((i) => i.status === "unknown").length,
  };
  return (
    <section className="gate-strip" aria-label={intl.formatMessage(m.gates)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="size-3.5" />
          {intl.formatMessage(m.gates)}
        </span>
        {items.length > 0 && <span>{intl.formatMessage(m.gateCounts, counts)}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? (
          items.map(({ gate, status }, i) => {
            const Icon = status === "pass" ? CircleCheck : status === "fail" ? OctagonAlert : CircleHelp;
            const label = gate in briefMessages ? intl.formatMessage(briefMessages[gate as keyof typeof briefMessages]) : gate;
            const title = `${label} · ${intl.formatMessage(briefMessages[status])}`;
            return (
              <Link
                key={gate}
                to={policyLocation(version ?? "", gate)}
                aria-label={title}
                title={title}
                className={`gate-glyph gate-${status} ${compact ? "gate-compact" : ""}`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {!compact && <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>}
              </Link>
            );
          })
        ) : (
          <span className="text-xs text-muted-foreground">{intl.formatMessage(briefMessages.unknown)}</span>
        )}
      </div>
    </section>
  );
}
