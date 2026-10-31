import type { ApplicantCapacity } from "@bitcredit/ai-credit-shared";
import { useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { financialMoney } from "./financial-display";

const m = defineMessages({
  scope: {
    id: "credit.fx.scope",
    defaultMessage: "Synthetic · orientation-only. Quote, fee, authorization and settlement amounts remain in sat.",
    description: "FX display authority boundary",
  },
  amount: { id: "credit.fx.amount", defaultMessage: "Bill face orientation: {value}", description: "Synthetic converted bill face amount" },
  rate: { id: "credit.fx.rate", defaultMessage: "Rate: 1 BTC = {value}", description: "Versioned synthetic FX rate" },
  snapshot: {
    id: "credit.fx.snapshot",
    defaultMessage: "FX snapshot: {version} · {date} · {digest}",
    description: "FX snapshot version date and digest",
  },
  missing: {
    id: "credit.fx.missing",
    defaultMessage: "FX-converted orientation value unavailable for this snapshot.",
    description: "Absent conversion is never fabricated",
  },
  missingRate: { id: "credit.fx.missingRate", defaultMessage: "FX rate not recorded in this snapshot.", description: "Absent FX rate" },
});

export function FxOrientation({
  amount,
  rate,
  digest,
}: {
  amount?: ApplicantCapacity["billFaceOrientation"];
  rate?: ApplicantCapacity["fxRate"];
  digest?: string | null;
}) {
  const intl = useIntl();
  return (
    <div className="space-y-1 break-words text-xs text-muted-foreground">
      <p>{intl.formatMessage(m.scope)}</p>
      <p>
        {amount
          ? intl.formatMessage(m.amount, { value: financialMoney(amount.valueMinor, amount.currency, amount.minorUnitScale) })
          : intl.formatMessage(m.missing)}
      </p>
      <p>
        {rate
          ? intl.formatMessage(m.rate, { value: financialMoney(rate.minorUnitsPerBtc, rate.currency, rate.minorUnitScale) })
          : intl.formatMessage(m.missingRate)}
      </p>
      {rate ? (
        <p className="break-all">
          {intl.formatMessage(m.snapshot, { version: rate.snapshotVersion, date: rate.asOf, digest: rate.snapshotDigest })}
        </p>
      ) : (
        digest && <p className="break-all">{digest}</p>
      )}
    </div>
  );
}
