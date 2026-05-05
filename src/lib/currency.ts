import {
  SATS_PER_BTC,
  btcToSat,
  convert as uiConvert,
  convertFromSat as uiConvertFromSat,
  convertToSat as uiConvertToSat,
  formatAmountNumber,
  getEurPerBtc,
  getLocaleForFormat,
  satToBtc,
  type CryptoCurrencyCode,
  type CurrencyCode,
  type FiatCurrencyCode,
  type Rates,
} from "@bitcredit/ui-library";

export { SATS_PER_BTC, btcToSat, formatAmountNumber, getEurPerBtc, getLocaleForFormat, satToBtc };
export type { CryptoCurrencyCode, CurrencyCode, FiatCurrencyCode, Rates };

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

export function convertToSat(amount: number, source: CurrencyCode, rates?: Rates): number {
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

export function convertAmount(amount: number, source: CurrencyCode, target: CurrencyCode, rates?: Rates): number {
  if (source === target) {
    return amount;
  }

  if ((isFiat(source) || isFiat(target)) && !rates) {
    if (source === "usd" || target === "usd") {
      throw new Error("Rates required for USD conversion");
    }
    throw new Error("Rates required for EUR conversion");
  }

  return uiConvert(amount, source, target, rates!);
}
