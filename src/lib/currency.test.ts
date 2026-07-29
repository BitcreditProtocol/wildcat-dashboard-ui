import { describe, expect, it } from "vitest";
import {
  SATS_PER_BTC,
  convertAmount,
  convertFromSat,
  convertToSat,
  formatAmountNumber,
  getEurPerBtc,
  getLocaleForFormat,
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
