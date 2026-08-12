import { defineMessages, useIntl } from "react-intl";
import { percentFromBps, type DecisionCase, type DecisionTerms } from "./decision-types";

/**
 * What governed code computed, shown where the operator actually enters an offer. The form opens on
 * these figures, so confirming is approving them and editing is customising them.
 *
 * It states the direction of travel rather than a hard floor: the minimum still inside both
 * guardrails is a governed calculation, and a limit invented in the UI that disagreed with the core
 * would be worse than none. Until the core exposes that bound, the operator gets the measured
 * figures, the ceilings they were measured against, and which way the numbers move.
 */

const messages = defineMessages({
  heading: {
    id: "credit.guidance.heading",
    defaultMessage: "AI Credit assessment",
    description: "Heading of the governed-offer guidance inside the offer drawer",
  },
  governed: {
    id: "credit.guidance.governed",
    defaultMessage: "Governed offer {discounted} — the form opens on this amount.",
    description: "States the amount the form is prefilled with",
  },
  measured: {
    id: "credit.guidance.measured",
    defaultMessage:
      "{discount} annual discount. Fee {fee} over {tenor} days: {feeRatio} of the bill sum (ceiling {feeCeiling}), {effective} annualized all-in cost (ceiling {annualCeiling}).",
    description: "The measured price against the two holder guardrails",
  },
  direction: {
    id: "credit.guidance.direction",
    defaultMessage: "Offering less than this raises both figures toward those ceilings; offering more lowers them.",
    description: "Which way the guardrails move when the operator edits the amount",
  },
});

export function GovernedOfferGuidance({ policyPack, terms }: { policyPack: DecisionCase["policyPack"]; terms: DecisionTerms }) {
  const intl = useIntl();
  const formatSat = (value: string) => `${intl.formatNumber(Number(value))} sat`;

  // No surface of its own: the drawer already is one, and a card inside a card reads as a panel
  // bolted on from another product. Same px-4 as the form immediately below it.
  return (
    <div className="flex flex-col gap-1 px-4 pb-4 text-xs">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{intl.formatMessage(messages.heading)}</span>
      <span className="font-medium">{intl.formatMessage(messages.governed, { discounted: formatSat(terms.discountedSat) })}</span>
      <span className="text-muted-foreground">
        {intl.formatMessage(messages.measured, {
          discount: percentFromBps(terms.annualDiscountBps),
          fee: formatSat(terms.effectiveFeeSat),
          tenor: terms.tenorDays,
          feeRatio: percentFromBps(terms.feeRatioBps),
          feeCeiling: percentFromBps(policyPack.maximumFeeRatioBps),
          effective: percentFromBps(terms.effectiveAnnualBps),
          annualCeiling: percentFromBps(policyPack.maximumEffectiveAnnualBps),
        })}
      </span>
      <span className="text-muted-foreground">{intl.formatMessage(messages.direction)}</span>
    </div>
  );
}
