import type { OperatorRequotePreview } from "@bitcredit/ai-credit-shared";
import { defineMessages, useIntl } from "react-intl";

const messages = defineMessages({
  heading: {
    id: "credit.requote.heading",
    defaultMessage: "Recalculated by the policy for {amount} sat",
    description: "Heading of the governed recalculation of an operator's proposed amount",
  },
  within: {
    id: "credit.requote.within",
    defaultMessage:
      "Fee {fee} sat ({feeRatio} of the bill) · effective annual rate {annual} · within the ceilings ({maxAnnual} a year, {maxFee} of the bill).",
    description: "A proposed amount the policy accepts, with its recalculated fee and rates",
  },
  belowOperatingCost: {
    id: "credit.requote.belowOperatingCost",
    defaultMessage: "The fee would not cover the operating cost of {cost} sat. The most you can offer is {maximum} sat.",
    description: "A proposed amount above what covers the per-case operating cost",
  },
  belowMinimumUseful: {
    id: "credit.requote.belowMinimumUseful",
    defaultMessage: "Below the policy's minimum useful amount of {minimum} sat.",
    description: "A proposed amount below the minimum worth offering",
  },
  aboveAnnualCeiling: {
    id: "credit.requote.aboveAnnualCeiling",
    defaultMessage: "The effective annual rate would be {observed}, above the policy ceiling of {ceiling}.",
    description: "A proposed amount whose fee is above the annual-rate ceiling",
  },
  aboveFeeCeiling: {
    id: "credit.requote.aboveFeeCeiling",
    defaultMessage: "The fee would be {observed} of the bill, above the policy ceiling of {ceiling}.",
    description: "A proposed amount whose fee is above the fee-ratio ceiling",
  },
  pending: {
    id: "credit.requote.pending",
    defaultMessage: "Checking {amount} sat against the policy… Confirm waits for the result.",
    description: "The governed recalculation of a proposed amount is still loading",
  },
  unavailable: {
    id: "credit.requote.unavailable",
    defaultMessage: "The recalculation is unavailable, so this amount cannot be confirmed now. Retry, or offer the suggested amount.",
    description: "The governed recalculation could not be fetched",
  },
});

function percent(bps: number | string | undefined): string {
  const value = Number(bps);
  return Number.isFinite(value) ? `${(value / 100).toFixed(2).replace(/\.?0+$/u, "")}%` : "–";
}

/** Governed code's own recalculation of a proposed amount, before the operator records anything. */
export function RequotePreview({
  amount,
  maxAnnualBps,
  maxFeeRatioBps,
  preview,
  isError,
}: {
  amount: string;
  maxAnnualBps: number;
  maxFeeRatioBps: number;
  preview: OperatorRequotePreview | null | undefined;
  isError: boolean;
}) {
  const intl = useIntl();
  const sat = (value: string | number | undefined) => intl.formatNumber(Number(value ?? 0));
  if (isError) {
    return (
      <p className="px-4 pb-3 text-xs text-muted-foreground" role="status">
        {intl.formatMessage(messages.unavailable)}
      </p>
    );
  }
  if (preview === null || preview === undefined) {
    return (
      <p className="px-4 pb-3 text-xs text-muted-foreground" role="status">
        {intl.formatMessage(messages.pending, { amount: sat(amount) })}
      </p>
    );
  }
  const outcome = preview.outcome;
  const text = outcome.ok
    ? intl.formatMessage(messages.within, {
        fee: sat(outcome.terms.effectiveFeeSat),
        feeRatio: percent(outcome.terms.feeRatioBps),
        annual: percent(outcome.terms.effectiveAnnualBps),
        maxAnnual: percent(maxAnnualBps),
        maxFee: percent(maxFeeRatioBps),
      })
    : outcome.reasonCode === "adjustment_below_operating_cost"
      ? intl.formatMessage(messages.belowOperatingCost, {
          cost: sat(outcome.policy.operatingCostSat),
          maximum: sat(outcome.policy.maximumDiscountedSat),
        })
      : outcome.reasonCode === "adjustment_below_minimum_useful"
        ? intl.formatMessage(messages.belowMinimumUseful, { minimum: sat(outcome.policy.minimumUsefulDiscountedSat) })
        : outcome.reasonCode === "adjustment_above_effective_annual_ceiling"
          ? intl.formatMessage(messages.aboveAnnualCeiling, {
              observed: percent(outcome.observed.effectiveAnnualBps),
              ceiling: percent(outcome.policy.maximumEffectiveAnnualBps),
            })
          : intl.formatMessage(messages.aboveFeeCeiling, {
              observed: percent(outcome.observed.feeRatioBps),
              ceiling: percent(outcome.policy.maximumFeeRatioBps),
            });
  return (
    <div className="px-4 pb-3 text-sm" role={outcome.ok ? "status" : "alert"}>
      <p className="font-medium">{intl.formatMessage(messages.heading, { amount: sat(amount) })}</p>
      <p className={outcome.ok ? "text-muted-foreground" : "text-destructive"}>{text}</p>
    </div>
  );
}
