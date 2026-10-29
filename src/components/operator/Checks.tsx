import { CircleCheck, CircleDashed, CircleX, Info } from "lucide-react";
import { Link } from "react-router";
import { useIntl } from "react-intl";
import type { DecisionCase } from "@/pages/credit/decision-types";
import { recordedGateStatus } from "@/pages/quotes/decision-brief-data";
import { policyLocation } from "@/pages/policy/policy-links";
import { checkMessages as m, gateMessages } from "./checks-copy";

type Status = "pass" | "fail" | "unknown";

/** The recorded result of each policy gate, named in plain words. Display only: code owns every gate. */
function useChecks(decisionCase: DecisionCase | undefined, gates: readonly string[] | undefined) {
  const intl = useIntl();
  const items = (gates ?? []).map((gate) => {
    const status: Status = decisionCase ? recordedGateStatus(decisionCase, gate) : "unknown";
    const copy = gateMessages[gate];
    const label = copy ? intl.formatMessage(status === "fail" ? copy.fail : copy.pass) : gate.replace(/_/g, " ");
    return { gate, status, label };
  });
  const passed = items.filter((i) => i.status === "pass").length;
  const failed = items.filter((i) => i.status === "fail");
  const pending = items.length - passed - failed.length;
  const summary = failed.length
    ? intl.formatMessage(m.failed, { count: failed.length })
    : passed === items.length && items.length > 0
      ? intl.formatMessage(m.allPassed, { count: passed })
      : passed === 0
        ? intl.formatMessage(m.notRun)
        : intl.formatMessage(m.partial, { passed, pending });
  const tone: Status = failed.length ? "fail" : passed === items.length && items.length > 0 ? "pass" : "unknown";
  return { items, failed, summary, tone };
}

const icons = { pass: CircleCheck, fail: CircleX, unknown: CircleDashed };

/** One line for a queue card: the overall result and, when something failed, what. */
export function ChecksLine({ decisionCase, gates }: { decisionCase?: DecisionCase; gates?: readonly string[] }) {
  const intl = useIntl();
  const { failed, summary, tone } = useChecks(decisionCase, gates);
  const Icon = icons[tone];
  return (
    <p className={`checks-line check-${tone}`} title={intl.formatMessage(m.why)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {intl.formatMessage(m.title)}: {summary}
        {failed.length > 0 && <span className="text-muted-foreground"> — {failed.map((f) => f.label).join(", ")}</span>}
      </span>
    </p>
  );
}

export function Checks({ decisionCase, gates, version }: { decisionCase?: DecisionCase; gates?: readonly string[]; version?: string }) {
  const intl = useIntl();
  const { items, summary, tone } = useChecks(decisionCase, gates);
  return (
    <section className="checks" aria-label={intl.formatMessage(m.title)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          {intl.formatMessage(m.title)}
          <Info className="size-3.5 text-muted-foreground" aria-label={intl.formatMessage(m.why)}>
            <title>{intl.formatMessage(m.why)}</title>
          </Info>
        </h3>
        <span className={`text-xs font-medium check-${tone}`}>{summary}</span>
      </div>
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {items.map(({ gate, status, label }) => {
          const Icon = icons[status];
          return (
            <li key={gate} className={`check-row check-${status}`}>
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <Link
                to={policyLocation(version ?? "", gate)}
                className="min-w-0 truncate hover:underline"
                title={`${label} · ${intl.formatMessage(m.rule)}`}
              >
                {label}
              </Link>
              {status === "unknown" && (
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{intl.formatMessage(m.pending)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
