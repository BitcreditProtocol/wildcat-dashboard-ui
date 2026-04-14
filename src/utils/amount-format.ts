import {
  type DecimalFormat,
  usePreferences,
} from "@/context/preferences/PreferencesContext";

function getSeparators(decimalFormat: DecimalFormat) {
  switch (decimalFormat) {
    case "point":
      return { group: ".", decimal: "," };
    case "space":
      return { group: " ", decimal: "," };
    case "comma":
    default:
      return { group: ",", decimal: "." };
  }
}

export function formatAmountString(
  value: string | number,
  decimalFormat: DecimalFormat,
): string {
  const raw = String(value).trim();
  if (!raw) {
    return raw;
  }

  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return raw;
  }

  const [, sign, integerPart, fractionPart] = match;
  const { group, decimal } = getSeparators(decimalFormat);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, group);

  if (fractionPart === undefined) {
    return `${sign}${groupedInteger}`;
  }

  return `${sign}${groupedInteger}${decimal}${fractionPart}`;
}

export function useAmountFormatter() {
  const { decimalFormat } = usePreferences();

  return {
    formatAmount: (value: string | number) =>
      formatAmountString(value, decimalFormat),
  };
}
