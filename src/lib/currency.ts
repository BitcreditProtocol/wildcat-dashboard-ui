import type { CurrencyCode, DecimalFormat } from "@/context/preferences/PreferencesContext";

export type FiatCurrencyCode = "usd" | "eur";
export type CryptoCurrencyCode = "btc" | "sat";
export type Rates = {
  usdPerBtc: number;
  eurPerUsd: number;
};

export const SATS_PER_BTC = 100_000_000 as const;

export function getLocaleForFormat(baseLocale: string, format: DecimalFormat): string {
  switch (format) {
    case "point":
      return "de-DE";
    case "comma":
      return "en-US";
    case "space":
      return "fr-FR";
    default:
      return baseLocale;
  }
}

export function satToBtc(sat: number): number {
  return sat / SATS_PER_BTC;
}

export function btcToSat(btc: number): number {
  return Math.round(btc * SATS_PER_BTC);
}

export function getEurPerBtc(rates: Rates): number {
  return rates.usdPerBtc * rates.eurPerUsd;
}

function btcToFiat(btc: number, currency: FiatCurrencyCode, rates: Rates): number {
  switch (currency) {
    case "usd":
      return btc * rates.usdPerBtc;
    case "eur":
      return btc * getEurPerBtc(rates);
  }
}

function fiatToBtc(amount: number, currency: FiatCurrencyCode, rates: Rates): number {
  switch (currency) {
    case "usd":
      return amount / rates.usdPerBtc;
    case "eur":
      return amount / getEurPerBtc(rates);
  }
}

export function convertFromSat(sat: number, target: CurrencyCode, rates?: Rates): number {
  const btc = satToBtc(sat);

  switch (target) {
    case "sat":
      return Math.round(sat);
    case "btc":
      return btc;
    case "usd":
      if (!rates) {
        throw new Error("Rates required for USD conversion");
      }
      return btc * rates.usdPerBtc;
    case "eur":
      if (!rates) {
        throw new Error("Rates required for EUR conversion");
      }
      return btcToFiat(btc, target, rates);
  }
}

export function convertToSat(amount: number, source: CurrencyCode, rates?: Rates): number {
  switch (source) {
    case "sat":
      return Math.round(amount);
    case "btc":
      return btcToSat(amount);
    case "usd":
    case "eur":
      if (!rates) {
        throw new Error("Rates required for fiat conversion");
      }
      return btcToSat(fiatToBtc(amount, source, rates));
  }
}

export function convertAmount(amount: number, source: CurrencyCode, target: CurrencyCode, rates?: Rates): number {
  if (source === target) {
    return amount;
  }

  const sat = convertToSat(amount, source, rates);
  return convertFromSat(sat, target, rates);
}

export function formatAmountNumber(value: number, currency: CurrencyCode, locale: string): string {
  if (currency === "usd" || currency === "eur") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (currency === "btc") {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
