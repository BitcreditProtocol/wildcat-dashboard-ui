import { defineMessages, useIntl } from "react-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type CurrencyCode, usePreferences } from "@/context/preferences/PreferencesContext";

const currencyMessages = defineMessages({
  sat: { id: "settings.currency.sat", defaultMessage: "Bitcoin (sat)" },
  btc: { id: "settings.currency.btc", defaultMessage: "Bitcoin (BTC)" },
  eur: { id: "settings.currency.eur", defaultMessage: "Euro (EUR)" },
  usd: { id: "settings.currency.usd", defaultMessage: "US Dollar (USD)" },
});

const CURRENCIES: {
  value: CurrencyCode;
  label: (typeof currencyMessages)[keyof typeof currencyMessages];
}[] = [
  {
    value: "sat",
    label: currencyMessages.sat,
  },
  {
    value: "btc",
    label: currencyMessages.btc,
  },
  {
    value: "eur",
    label: currencyMessages.eur,
  },
  {
    value: "usd",
    label: currencyMessages.usd,
  },
];

export function CurrencySelector({ className }: { className?: string }) {
  const intl = useIntl();
  const { currency, setCurrency } = usePreferences();

  return (
    <div className={className}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {intl.formatMessage({
          id: "settings.currency.title",
          defaultMessage: "Currency",
        })}
      </span>
      <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
        <SelectTrigger className="h-9">
          <SelectValue
            placeholder={intl.formatMessage({
              id: "settings.currency.select",
              defaultMessage: "Select currency",
            })}
          />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {intl.formatMessage(item.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
