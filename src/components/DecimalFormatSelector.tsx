import { useIntl } from "react-intl";
import { type DecimalFormat, usePreferences } from "@/context/preferences/PreferencesContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DECIMAL_FORMATS: {
  value: DecimalFormat;
  labelId: string;
  defaultLabel: string;
  example: string;
}[] = [
  {
    value: "point",
    labelId: "settings.decimalFormat.point",
    defaultLabel: "Point",
    example: "1.000,00",
  },
  {
    value: "comma",
    labelId: "settings.decimalFormat.comma",
    defaultLabel: "Comma",
    example: "1,000.00",
  },
  {
    value: "space",
    labelId: "settings.decimalFormat.space",
    defaultLabel: "Space",
    example: "1 000,00",
  },
];

export function DecimalFormatSelector({ className }: { className?: string }) {
  const intl = useIntl();
  const { decimalFormat, setDecimalFormat } = usePreferences();

  return (
    <div className={className}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {intl.formatMessage({
          id: "settings.decimalSeparator.title",
          defaultMessage: "Decimals",
        })}
      </span>
      <Select value={decimalFormat} onValueChange={(value) => setDecimalFormat(value as DecimalFormat)}>
        <SelectTrigger className="h-9">
          <SelectValue
            placeholder={intl.formatMessage({
              id: "settings.decimalSeparator.select",
              defaultMessage: "Select decimal format",
            })}
          />
        </SelectTrigger>
        <SelectContent>
          {DECIMAL_FORMATS.map((format) => (
            <SelectItem key={format.value} value={format.value}>
              {intl.formatMessage({
                id: format.labelId,
                defaultMessage: format.defaultLabel,
              })}{" "}
              ({format.example})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
