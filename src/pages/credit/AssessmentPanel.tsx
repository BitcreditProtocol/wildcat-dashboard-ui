import { defineMessages, useIntl } from "react-intl";
import { axisLabels, operatorVisibleAxes, percentFromBps, traceLine, words, type DecisionCase } from "./decision-types";

const messages = defineMessages({
  heading: { id: "credit.assessment.heading", defaultMessage: "Policy checks", description: "Deterministic assessment axes" },
  passed: { id: "credit.assessment.passed", defaultMessage: "{passed}/{total} passed", description: "Policy-axis pass count" },
  noReasons: { id: "credit.assessment.noReasons", defaultMessage: "Not assessed", description: "Empty axis" },
  ruleTrace: { id: "credit.assessment.ruleTrace", defaultMessage: "Rule trace", description: "Per-rule trace disclosure" },
  pricing: { id: "credit.assessment.pricing", defaultMessage: "Pricing trace", description: "Pricing trace disclosure" },
  observed: { id: "credit.assessment.observed", defaultMessage: "observed", description: "Observed trace prefix" },
  policy: { id: "credit.assessment.policy", defaultMessage: "policy", description: "Policy trace prefix" },
  inputs: { id: "credit.assessment.inputs", defaultMessage: "inputs", description: "Calculation inputs prefix" },
  acceptorRisk: { id: "credit.assessment.acceptorRisk", defaultMessage: "Acceptor risk", description: "Acceptor risk label" },
  riskValues: {
    id: "credit.assessment.riskValues",
    defaultMessage: "PD {pd} · LGD {lgd}",
    description: "Governed acceptor loss parameters",
  },
  duplicate: {
    id: "credit.assessment.duplicate",
    defaultMessage: "Duplicate financing",
    description: "Duplicate-financing check label",
  },
  contradictions: {
    id: "credit.assessment.contradictions",
    defaultMessage: "Contradictions",
    description: "Contradiction count label",
  },
  none: { id: "credit.assessment.none", defaultMessage: "None", description: "No contradictions value" },
  validThrough: {
    id: "credit.assessment.validThrough",
    defaultMessage: "Valid through {date}",
    description: "Evidence validity date",
  },
  unavailable: { id: "credit.assessment.unavailable", defaultMessage: "Not verified", description: "Missing governed value" },
});

export interface AssessmentPanelProps {
  decisionCase: DecisionCase;
}

export function PricingTrace({ steps }: { steps: DecisionCase["result"]["calculationTrace"] }) {
  const intl = useIntl();
  if (steps.length === 0) return null;
  return (
    <details>
      <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
        {intl.formatMessage(messages.pricing)}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {steps.map((step) => (
          <div key={step.step} className="border-l-2 border-divider-100 pl-3 text-xs">
            <span className="font-medium">{words(step.step)}</span>
            <span className="font-mono text-muted-foreground"> = {step.result}</span>
            <div className="break-words font-mono text-[11px] text-muted-foreground">{step.formula}</div>
            <div className="break-words font-mono text-[11px] text-muted-foreground">
              {intl.formatMessage(messages.inputs)} {traceLine(step.inputs)}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

const statusClass = (status: DecisionCase["result"]["axes"][number]["status"]): string => {
  if (status === "pass") return "text-signal-success";
  if (status === "fail") return "text-destructive";
  if (status === "caution" || status === "blocked") return "text-signal-alert";
  return "text-muted-foreground";
};

/** Decision-relevant risk facts first; raw deterministic traces remain one disclosure deeper. */
export function AssessmentPanel({ decisionCase }: AssessmentPanelProps) {
  const intl = useIntl();
  const { snapshot, result } = decisionCase;
  const visibleAxes = operatorVisibleAxes(result.axes);
  const passed = visibleAxes.filter((axis) => axis.status === "pass").length;
  const contradictionCodes = snapshot.contradictions.map((contradiction) => contradiction.code).join(" · ");

  return (
    <section>
      <dl className="grid overflow-hidden rounded-md border border-border sm:grid-cols-3">
        <div className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.acceptorRisk)}</dt>
          <dd className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums">
            {intl.formatMessage(messages.riskValues, {
              pd:
                snapshot.acceptor.probabilityOfDefaultBps === null
                  ? intl.formatMessage(messages.unavailable)
                  : percentFromBps(snapshot.acceptor.probabilityOfDefaultBps),
              lgd:
                snapshot.acceptor.lossGivenDefaultBps === null
                  ? intl.formatMessage(messages.unavailable)
                  : percentFromBps(snapshot.acceptor.lossGivenDefaultBps),
            })}
          </dd>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {intl.formatMessage(messages.validThrough, { date: snapshot.acceptor.validThrough })}
          </div>
        </div>
        <div className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.duplicate)}</dt>
          <dd className="mt-1 text-sm font-semibold">{words(snapshot.duplicateCheck.result)}</dd>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {intl.formatMessage(messages.validThrough, { date: snapshot.duplicateCheck.validThrough })}
          </div>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.contradictions)}</dt>
          <dd className={`mt-1 text-sm font-semibold ${snapshot.contradictions.length > 0 ? "text-signal-alert" : ""}`}>
            {snapshot.contradictions.length === 0 ? intl.formatMessage(messages.none) : snapshot.contradictions.length}
          </dd>
          {contradictionCodes && <div className="mt-0.5 truncate text-xs text-muted-foreground">{contradictionCodes}</div>}
        </div>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h4 className="text-sm font-semibold">{intl.formatMessage(messages.heading)}</h4>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {intl.formatMessage(messages.passed, { passed, total: visibleAxes.length })}
        </span>
      </div>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {visibleAxes.map((finding) => (
          <li
            key={finding.axis}
            className="grid gap-x-4 gap-y-1 py-2.5 text-xs sm:grid-cols-[minmax(10rem,1fr)_minmax(0,2fr)_auto] sm:items-baseline"
          >
            <span className="font-medium">{axisLabels[finding.axis] ?? words(finding.axis)}</span>
            <span className="min-w-0 text-muted-foreground">
              {finding.reasonCodes.length === 0 ? intl.formatMessage(messages.noReasons) : finding.reasonCodes.map(words).join("; ")}
            </span>
            <span className={`whitespace-nowrap font-medium ${statusClass(finding.status)}`}>{words(finding.status)}</span>
          </li>
        ))}
      </ul>

      <details className="mt-4">
        <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          {intl.formatMessage(messages.ruleTrace)}
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {result.assessmentTrace.map((step) => (
            <div key={step.ruleId + step.reasonCode} className="border-l-2 border-divider-100 pl-3 text-xs">
              <span className="font-medium">{words(step.ruleId)}</span>
              <span className="text-muted-foreground"> — {words(step.outcome)}</span>
              <div className="break-words font-mono text-[11px] text-muted-foreground">
                {intl.formatMessage(messages.observed)} {traceLine(step.observed)}
              </div>
              <div className="break-words font-mono text-[11px] text-muted-foreground">
                {intl.formatMessage(messages.policy)} {traceLine(step.policy)}
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
