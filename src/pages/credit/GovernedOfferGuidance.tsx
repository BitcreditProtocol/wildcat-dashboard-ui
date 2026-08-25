import { defineMessages, useIntl } from "react-intl";
import { percentFromBps, type DecisionCase, type DecisionTerms } from "./decision-types";

const messages = defineMessages({
  governed: {
    id: "credit.guidance.governed",
    defaultMessage: "Suggested amount: {discounted}",
    description: "States the amount the form is prefilled with",
  },
  measured: {
    id: "credit.guidance.measured",
    defaultMessage:
      "Minting fee {fee} over {tenor} days: {feeRatio} of the bill amount (ceiling {feeCeiling}), {effective} annualized fee rate (ceiling {annualCeiling}).",
    description: "The measured price against the two holder guardrails",
  },
});

export function GovernedOfferGuidance({ policyPack, terms }: { policyPack: DecisionCase["policyPack"]; terms: DecisionTerms }) {
  const intl = useIntl();
  const formatSat = (value: string) => `${intl.formatNumber(Number(value))} sat`;

  // No surface of its own: the drawer already is one, and a card inside a card reads as a panel
  // bolted on from another product. Same px-4 as the form immediately below it.
  return (
    <div className="flex flex-col gap-1 px-4 pb-4 text-xs">
      <span className="font-medium">{intl.formatMessage(messages.governed, { discounted: formatSat(terms.discountedSat) })}</span>
      <span className="text-muted-foreground">
        {intl.formatMessage(messages.measured, {
          fee: formatSat(terms.effectiveFeeSat),
          tenor: terms.tenorDays,
          feeRatio: percentFromBps(terms.feeRatioBps),
          feeCeiling: percentFromBps(policyPack.maximumFeeRatioBps),
          effective: percentFromBps(terms.effectiveAnnualBps),
          annualCeiling: percentFromBps(policyPack.maximumEffectiveAnnualBps),
        })}
      </span>
    </div>
  );
}
