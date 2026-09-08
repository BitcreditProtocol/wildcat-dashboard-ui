import {
  SATS_PER_BTC,
  btcToSat,
  convert as uiConvert,
  convertFromSat as uiConvertFromSat,
  convertToSat as uiConvertToSat,
  formatAmountNumber as uiFormatAmountNumber,
  getEurPerBtc,
  getLocaleForFormat,
  isCurrencyCode,
  satToBtc,
  type CryptoCurrencyCode,
  type CurrencyCode,
  type FiatCurrencyCode,
  type Rates,
} from "@bitcredit/ui-library";

export { SATS_PER_BTC, btcToSat, getEurPerBtc, getLocaleForFormat, satToBtc };
export type { CryptoCurrencyCode, CurrencyCode, FiatCurrencyCode, Rates };

/**
 * Token units the mint denominates balances in. They are not currencies of their own —
 * each one is pegged to a currency the rate table already knows about.
 */
export type TokenCurrencyCode = "crsat" | "eiou";

/** Anything an amount can be denominated in. Display preferences stay a plain CurrencyCode. */
export type SourceCurrencyCode = CurrencyCode | TokenCurrencyCode;

/** A credit sat is a unit alias for a sat: 1 crsat is always worth exactly 1 sat. */
const CRSAT_PER_SAT = 1;

/** An e-IOU is pegged at a fixed 0.067 euro cent, independent of any exchange rate. */
export const EUR_PER_EIOU = 0.00067;

const TOKEN_CURRENCY_CODES = new Set<string>(["crsat", "eiou"]);

const TOKEN_LABELS: Record<TokenCurrencyCode, string> = {
  crsat: "crsat",
  eiou: "e-IOU",
};

export function isTokenCurrency(currency: SourceCurrencyCode): currency is TokenCurrencyCode {
  return TOKEN_CURRENCY_CODES.has(currency);
}

export function isSourceCurrencyCode(code: string): code is SourceCurrencyCode {
  return TOKEN_CURRENCY_CODES.has(code) || isCurrencyCode(code);
}

/** How a token amount is expressed in the currency it is pegged to. */
function toPeggedCurrency(amount: number, currency: TokenCurrencyCode): { amount: number; currency: CurrencyCode } {
  return currency === "crsat" ? { amount: amount / CRSAT_PER_SAT, currency: "sat" } : { amount: amount * EUR_PER_EIOU, currency: "eur" };
}

/**
 * The currency a unit is merely another name for, or null when the peg changes the number.
 * Used to suppress a secondary amount that would just repeat the primary one.
 */
export function getAliasedCurrency(currency: SourceCurrencyCode): CurrencyCode | null {
  return currency === "crsat" ? "sat" : null;
}

export function getCurrencyLabel(currency: SourceCurrencyCode): string {
  return isTokenCurrency(currency) ? TOKEN_LABELS[currency] : currency;
}

/** Token units are counted in whole units, like sats. */
export function formatAmountNumber(abs: number, currency: SourceCurrencyCode, locale: string): string {
  return uiFormatAmountNumber(abs, isTokenCurrency(currency) ? "sat" : currency, locale);
}

function isFiat(currency: CurrencyCode): currency is FiatCurrencyCode {
  return currency === "usd" || currency === "eur";
}

export function convertFromSat(sat: number, target: CurrencyCode, rates?: Rates): number {
  if (target === "sat") {
    return Math.round(sat);
  }

  if (target === "btc") {
    return satToBtc(sat);
  }

  if (!rates) {
    throw new Error(target === "usd" ? "Rates required for USD conversion" : "Rates required for EUR conversion");
  }

  return uiConvertFromSat(sat, target, rates);
}

export function convertToSat(amount: number, source: SourceCurrencyCode, rates?: Rates): number {
  if (isTokenCurrency(source)) {
    const pegged = toPeggedCurrency(amount, source);
    return convertToSat(pegged.amount, pegged.currency, rates);
  }

  if (source === "sat") {
    return Math.round(amount);
  }

  if (source === "btc") {
    return btcToSat(amount);
  }

  if (!rates) {
    throw new Error("Rates required for fiat conversion");
  }

  return uiConvertToSat(amount, source, rates);
}

export function convertAmount(amount: number, source: SourceCurrencyCode, target: CurrencyCode, rates?: Rates): number {
  if (source === target) {
    return amount;
  }

  // A token's peg is fixed, but reaching a non-pegged target still needs live rates.
  if (isTokenCurrency(source)) {
    const pegged = toPeggedCurrency(amount, source);
    return convertAmount(pegged.amount, pegged.currency, target, rates);
  }

  if ((isFiat(source) || isFiat(target)) && !rates) {
    if (source === "usd" || target === "usd") {
      throw new Error("Rates required for USD conversion");
    }
    throw new Error("Rates required for EUR conversion");
  }

  return uiConvert(amount, source, target, rates!);
}
