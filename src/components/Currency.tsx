import { useMemo } from "react";
import { useIntl } from "react-intl";
import { HighlightText } from "@/components/ui/search";
import { cn } from "@/lib/utils";
import { usePreferences, type CurrencyCode } from "@/context/preferences/PreferencesContext";
import { convertAmount, formatAmountNumber, getLocaleForFormat } from "@/lib/currency";
import { useRates } from "@/hooks/useRates";

export interface CurrencyProps {
  value: number;
  sourceCurrency?: CurrencyCode;
  currency?: CurrencyCode;
  highlightQuery?: string;
  className?: string;
  amountClassName?: string;
  currencyClassName?: string;
  secondaryClassName?: string;
}

export function Currency({
  value,
  sourceCurrency = "sat",
  currency,
  highlightQuery,
  className,
  amountClassName,
  currencyClassName,
  secondaryClassName,
}: CurrencyProps) {
  const intl = useIntl();
  const { currency: preferredCurrency, decimalFormat } = usePreferences();
  const { data: ratesData } = useRates();
  const rates = ratesData ?? undefined;
  const resolvedCurrency = currency ?? preferredCurrency;
  const locale = getLocaleForFormat(intl.locale, decimalFormat);

  const primaryFormatted = useMemo(() => formatAmountNumber(Math.abs(value), sourceCurrency, locale), [locale, sourceCurrency, value]);

  const resolvedValue = useMemo(() => {
    try {
      return convertAmount(value, sourceCurrency, resolvedCurrency, rates);
    } catch {
      return null;
    }
  }, [rates, resolvedCurrency, sourceCurrency, value]);

  const formatted = useMemo(
    () => (resolvedValue === null ? null : formatAmountNumber(Math.abs(resolvedValue), resolvedCurrency, locale)),
    [locale, resolvedCurrency, resolvedValue]
  );

  const primarySign = value < 0 ? "-" : "";
  const secondarySign = resolvedValue !== null && resolvedValue < 0 ? "-" : "";
  const showSecondary = resolvedValue !== null && resolvedCurrency !== sourceCurrency;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="inline-flex items-baseline gap-1">
        <span className={amountClassName}>
          {primarySign}
          <HighlightText text={primaryFormatted} highlight={highlightQuery ?? ""} />
        </span>
        <span className={cn("text-xs font-normal leading-normal text-muted-foreground", currencyClassName)}>{sourceCurrency}</span>
      </span>
      {showSecondary ? (
        <span className={cn("inline-flex items-baseline gap-1 text-sm text-muted-foreground", secondaryClassName)}>
          <span>
            {secondarySign}
            {formatted ? <HighlightText text={formatted} highlight={highlightQuery ?? ""} /> : null}
          </span>
          <span className={cn("text-xs font-normal leading-normal text-muted-foreground", currencyClassName)}>{resolvedCurrency}</span>
        </span>
      ) : null}
    </span>
  );
}
