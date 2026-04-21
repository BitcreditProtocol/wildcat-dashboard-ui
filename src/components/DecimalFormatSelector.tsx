import { defineMessages, useIntl } from "react-intl";
import { type DecimalFormat, usePreferences } from "@/context/preferences/PreferencesContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const decimalFormatMessages = defineMessages({
  point: { id: "settings.decimalFormat.point", defaultMessage: "Point" },
  comma: { id: "settings.decimalFormat.comma", defaultMessage: "Comma" },
  space: { id: "settings.decimalFormat.space", defaultMessage: "Space" },
});

const DECIMAL_FORMATS: {
  value: DecimalFormat;
  label: (typeof decimalFormatMessages)[keyof typeof decimalFormatMessages];
  example: string;
}[] = [
  {
    value: "point",
    label: decimalFormatMessages.point,
    example: "1.000,00",
  },
  {
    value: "comma",
    label: decimalFormatMessages.comma,
    example: "1,000.00",
  },
  {
    value: "space",
    label: decimalFormatMessages.space,
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
              {intl.formatMessage(format.label)} ({format.example})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
