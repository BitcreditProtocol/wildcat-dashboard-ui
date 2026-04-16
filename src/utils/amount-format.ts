import { useCallback } from "react";
import { type DecimalFormat, usePreferences } from "@/context/preferences/PreferencesContext";

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatAmountString(value: string | number, decimalFormat: DecimalFormat): string {
  const raw = String(value).trim();
  if (!raw) {
    return raw;
  }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw);
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

export function parseAmountString(value: string | undefined, decimalFormat: DecimalFormat): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = value.trim();
  if (!raw) {
    return undefined;
  }

  const { group, decimal } = getSeparators(decimalFormat);
  const groupPattern = escapeRegExp(group);
  const decimalPattern = escapeRegExp(decimal);
  const localizedPattern = new RegExp(`^-?(?:\\d{1,3}(?:${groupPattern}\\d{3})*|\\d+)(?:${decimalPattern}\\d+)?$`);

  if (!localizedPattern.test(raw)) {
    return undefined;
  }

  const normalized = raw.split(group).join("").replace(decimal, ".");

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useAmountFormatter() {
  const { decimalFormat } = usePreferences();

  return {
    formatAmount: useCallback((value: string | number) => formatAmountString(value, decimalFormat), [decimalFormat]),
    parseAmount: useCallback((value: string | undefined) => parseAmountString(value, decimalFormat), [decimalFormat]),
  };
}
