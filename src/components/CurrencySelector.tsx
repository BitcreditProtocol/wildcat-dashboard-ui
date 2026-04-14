import { useIntl } from "react-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CurrencyCode,
  usePreferences,
} from "@/context/preferences/PreferencesContext";

const CURRENCIES: Array<{
  value: CurrencyCode;
  labelId: string;
  defaultLabel: string;
}> = [
  {
    value: "sat",
    labelId: "settings.currency.sat",
    defaultLabel: "Bitcoin (sat)",
  },
  {
    value: "btc",
    labelId: "settings.currency.btc",
    defaultLabel: "Bitcoin (BTC)",
  },
  {
    value: "eur",
    labelId: "settings.currency.eur",
    defaultLabel: "Euro (EUR)",
  },
  {
    value: "usd",
    labelId: "settings.currency.usd",
    defaultLabel: "US Dollar (USD)",
  },
];

export function CurrencySelector({
  className,
}: {
  className?: string;
}) {
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
      <Select
        value={currency}
        onValueChange={(value) => setCurrency(value as CurrencyCode)}
      >
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
            <SelectItem
              key={item.value}
              value={item.value}
            >
              {intl.formatMessage({
                id: item.labelId,
                defaultMessage: item.defaultLabel,
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
