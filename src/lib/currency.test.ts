import { describe, expect, it } from "vitest";
import {
  EUR_PER_EIOU,
  SATS_PER_BTC,
  convertAmount,
  convertFromSat,
  convertToSat,
  formatAmountNumber,
  getAliasedCurrency,
  getCurrencyLabel,
  getEurPerBtc,
  getLocaleForFormat,
  isSourceCurrencyCode,
  type Rates,
} from "./currency";

const rates: Rates = {
  usd: 100_000,
  eur: 90_000,
};

describe("currency conversions", () => {
  it("converts between sat, btc, usd, and eur using provided rates", () => {
    expect(convertAmount(SATS_PER_BTC, "sat", "btc")).toBe(1);
    expect(convertAmount(SATS_PER_BTC, "sat", "usd", rates)).toBe(100_000);
    expect(convertAmount(SATS_PER_BTC, "sat", "eur", rates)).toBe(90_000);
    expect(convertAmount(100_000, "usd", "sat", rates)).toBe(SATS_PER_BTC);
    expect(convertAmount(90_000, "eur", "sat", rates)).toBe(SATS_PER_BTC);
  });

  it("returns the original amount when source and target currencies match", () => {
    expect(convertAmount(12_345.6789, "btc", "btc")).toBe(12_345.6789);
    expect(convertAmount(12_345, "sat", "sat")).toBe(12_345);
  });

  it("rounds to whole satoshis when converting into sat", () => {
    expect(convertToSat(0.000000006, "btc")).toBe(1);
    expect(convertToSat(0.000000004, "btc")).toBe(0);
    expect(convertToSat(123.6, "sat")).toBe(124);
  });

  it("throws when fiat conversions are attempted without rates", () => {
    expect(() => convertFromSat(1_000, "usd")).toThrowError("Rates required for USD conversion");
    expect(() => convertFromSat(1_000, "eur")).toThrowError("Rates required for EUR conversion");
    expect(() => convertToSat(10, "usd")).toThrowError("Rates required for fiat conversion");
    expect(() => convertToSat(10, "eur")).toThrowError("Rates required for fiat conversion");
  });

  it("computes the eur per btc cross-rate from usd and eur/usd", () => {
    expect(getEurPerBtc(rates)).toBe(90_000);
  });
});

describe("token currencies", () => {
  it("treats a crsat as exactly one sat", () => {
    expect(convertAmount(1_000, "crsat", "sat")).toBe(1_000);
    expect(convertToSat(1_000, "crsat")).toBe(1_000);
    expect(convertAmount(SATS_PER_BTC, "crsat", "btc")).toBe(1);
    expect(convertAmount(SATS_PER_BTC, "crsat", "eur", rates)).toBe(90_000);
  });

  it("values an e-IOU at the fixed 0.067 euro-cent peg", () => {
    expect(EUR_PER_EIOU).toBe(0.00067);
    expect(convertAmount(1_000, "eiou", "eur")).toBeCloseTo(0.67, 10);
    expect(convertAmount(0, "eiou", "eur")).toBe(0);
  });

  it("reaches non-euro targets by taking the peg through the live rates", () => {
    // 1,000 e-IOU = EUR 0.67, and one BTC is EUR 90,000.
    const sats = Math.round((0.67 / 90_000) * SATS_PER_BTC);
    expect(convertAmount(1_000, "eiou", "sat", rates)).toBe(sats);
    // Cross-currency conversions route through whole sats, so usd follows from the rounded sat amount.
    expect(convertAmount(1_000, "eiou", "usd", rates)).toBeCloseTo((sats / SATS_PER_BTC) * 100_000, 10);
  });

  it("needs rates for an e-IOU target other than euro", () => {
    expect(() => convertAmount(1_000, "eiou", "usd")).toThrowError("Rates required for USD conversion");
    expect(() => convertToSat(1_000, "eiou")).toThrowError("Rates required for fiat conversion");
  });

  it("reports crsat as a unit alias for sat and e-IOU as its own unit", () => {
    expect(getAliasedCurrency("crsat")).toBe("sat");
    expect(getAliasedCurrency("eiou")).toBeNull();
    expect(getAliasedCurrency("usd")).toBeNull();
  });

  it("labels and recognises the token units", () => {
    expect(getCurrencyLabel("eiou")).toBe("e-IOU");
    expect(getCurrencyLabel("crsat")).toBe("crsat");
    expect(getCurrencyLabel("sat")).toBe("sat");
    expect(isSourceCurrencyCode("crsat")).toBe(true);
    expect(isSourceCurrencyCode("eiou")).toBe(true);
    expect(isSourceCurrencyCode("sat")).toBe(true);
    expect(isSourceCurrencyCode("e-IOU")).toBe(false);
  });

  it("counts token units in whole units", () => {
    expect(formatAmountNumber(1234.9, "crsat", "en-US")).toBe("1,235");
    expect(formatAmountNumber(1234, "eiou", "de-DE")).toBe("1.234");
  });
});

describe("currency formatting", () => {
  it("formats fiat amounts as decimals with two fractional digits", () => {
    expect(formatAmountNumber(1234.5, "usd", "en-US")).toBe("1,234.50");
    expect(formatAmountNumber(1234.5, "eur", "de-DE")).toBe("1.234,50");
  });

  it("formats bitcoin values with exactly eight decimals", () => {
    expect(formatAmountNumber(1.2, "btc", "en-US")).toBe("1.20000000");
    expect(formatAmountNumber(0.00000001, "btc", "en-US")).toBe("0.00000001");
  });

  it("formats satoshi values as whole numbers without decimals", () => {
    expect(formatAmountNumber(1234.9, "sat", "en-US")).toBe("1,235");
    expect(formatAmountNumber(1234, "sat", "de-DE")).toBe("1.234");
  });
});

describe("locale resolution", () => {
  it("maps decimal format preferences to the expected locales", () => {
    expect(getLocaleForFormat("en-GB", "comma")).toBe("en-US");
    expect(getLocaleForFormat("en-GB", "point")).toBe("de-DE");
    expect(getLocaleForFormat("en-GB", "space")).toBe("fr-FR");
  });
});
