import { Badge } from "@/components/ui/badge";
import { defineMessages, useIntl } from "react-intl";
import { axisBadgeVariant, axisLabels, percentFromBps, traceLine, words, type DecisionCase } from "./decision-types";

const messages = defineMessages({
  heading: {
    id: "credit.assessment.heading",
    defaultMessage: "Six policy checks",
    description: "Heading above the deterministic assessment axes",
  },
  hint: {
    id: "credit.assessment.hint",
    defaultMessage: "The separate findings behind this decision",
    description: "Caption beside the deterministic assessment axes",
  },
  noReasons: { id: "credit.assessment.noReasons", defaultMessage: "Not assessed — earlier axes are blocked", description: "Empty axis" },
  ruleTrace: {
    id: "credit.assessment.ruleTrace",
    defaultMessage: "Technical rule trace — raw observed vs policy",
    description: "Summary label of the per-rule trace",
  },
  pricing: {
    id: "credit.assessment.pricing",
    defaultMessage: "Technical pricing trace — raw calculation inputs",
    description: "Summary label of the deterministic pricing trace",
  },
  observed: { id: "credit.assessment.observed", defaultMessage: "observed", description: "Prefix for observed trace values" },
  policy: { id: "credit.assessment.policy", defaultMessage: "policy", description: "Prefix for policy trace values" },
  inputs: { id: "credit.assessment.inputs", defaultMessage: "inputs", description: "Prefix for calculation inputs" },
  riskEvidence: {
    id: "credit.assessment.riskEvidence",
    defaultMessage: "Acceptor PD {pd} · LGD {lgd} · valid through {validThrough}",
    description: "Governed acceptor loss parameters",
  },
  capacity: {
    id: "credit.assessment.capacity",
    defaultMessage: "Resulting Mint exposure {resulting} of {limit}, including {proposed} proposed · duplicate check {duplicate}",
    description: "Mint capacity after including the proposed whole-bill exposure",
  },
  capacityUnavailable: {
    id: "credit.assessment.capacityUnavailable",
    defaultMessage: "Resulting Mint exposure not yet verified · duplicate check {duplicate}",
    description: "Fail-closed Mint capacity line when no governed capacity trace exists",
  },
  contradiction: {
    id: "credit.assessment.contradiction",
    defaultMessage: "Contradiction {code}: {state}",
    description: "Contradiction line",
  },
  unavailable: { id: "credit.assessment.unavailable", defaultMessage: "not available", description: "Value for a missing risk parameter" },
});

export interface AssessmentPanelProps {
  decisionCase: DecisionCase;
  formatSat: (value: string) => string;
}

export function PricingTrace({ steps }: { steps: DecisionCase["result"]["calculationTrace"] }) {
  const intl = useIntl();
  if (steps.length === 0) return null;

  return (
    <details>
      <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
        {intl.formatMessage(messages.pricing)}
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5">
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

/** The six axis findings, with the per-rule trace one level deeper. */
export function AssessmentPanel({ decisionCase, formatSat }: AssessmentPanelProps) {
  const intl = useIntl();
  const { snapshot, result } = decisionCase;
  const { acceptor } = snapshot;
  const capacityTrace = result.assessmentTrace.find(
    (step) => step.ruleId === "mint_capacity_available" || step.reasonCode === "no_mint_capacity"
  );
  const resultingExposure = capacityTrace?.observed.resultingExposureSat;
  const proposedExposure = capacityTrace?.observed.proposedExposureSat;
  const exposureLimit = capacityTrace?.policy.exposureLimitSat;
  const hasCapacityMath =
    typeof resultingExposure === "string" && typeof proposedExposure === "string" && typeof exposureLimit === "string";

  return (
    <section className="rounded-md border border-border px-3 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span>{intl.formatMessage(messages.heading)}</span>
        <span className="font-normal text-muted-foreground">{intl.formatMessage(messages.hint)}</span>
      </div>

      <ul className="mt-2 flex flex-col gap-1.5">
        {result.axes.map((finding) => (
          <li key={finding.axis} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <Badge variant={axisBadgeVariant(finding.status)}>{words(finding.status)}</Badge>
            <span className="font-medium">{axisLabels[finding.axis] ?? words(finding.axis)}</span>
            <span className="text-muted-foreground">
              {finding.reasonCodes.length === 0 ? intl.formatMessage(messages.noReasons) : finding.reasonCodes.map(words).join("; ")}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>
          {intl.formatMessage(messages.riskEvidence, {
            pd:
              acceptor.probabilityOfDefaultBps === null
                ? intl.formatMessage(messages.unavailable)
                : percentFromBps(acceptor.probabilityOfDefaultBps),
            lgd:
              acceptor.lossGivenDefaultBps === null
                ? intl.formatMessage(messages.unavailable)
                : percentFromBps(acceptor.lossGivenDefaultBps),
            validThrough: acceptor.validThrough,
          })}
        </span>
        <span>
          {hasCapacityMath
            ? intl.formatMessage(messages.capacity, {
                resulting: formatSat(resultingExposure),
                proposed: formatSat(proposedExposure),
                limit: formatSat(exposureLimit),
                duplicate: words(snapshot.duplicateCheck.result),
              })
            : intl.formatMessage(messages.capacityUnavailable, { duplicate: words(snapshot.duplicateCheck.result) })}
        </span>
        {snapshot.contradictions.map((contradiction) => (
          <span key={contradiction.code}>
            {intl.formatMessage(messages.contradiction, {
              code: contradiction.code,
              state: words(contradiction.state),
            })}
          </span>
        ))}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          {intl.formatMessage(messages.ruleTrace)}
        </summary>
        <div className="mt-1.5 flex flex-col gap-1.5">
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
