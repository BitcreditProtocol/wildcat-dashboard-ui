import { describe, expect, it } from "vitest";
import { convertAmount, formatAmountNumber, getLocaleForFormat, type Rates } from "./currency";

const rates: Rates = {
  usdPerBtc: 100_000,
  eurPerUsd: 0.9,
};

describe("currency utils", () => {
  it("maps decimal format preferences to formatting locales", () => {
    expect(getLocaleForFormat("en-US", "comma")).toBe("en-US");
    expect(getLocaleForFormat("en-US", "point")).toBe("de-DE");
    expect(getLocaleForFormat("en-US", "space")).toBe("fr-FR");
  });

  it("converts between sat and btc", () => {
    expect(convertAmount(100_000_000, "sat", "btc")).toBe(1);
    expect(convertAmount(1, "btc", "sat")).toBe(100_000_000);
  });

  it("converts sat to usd and eur with rates", () => {
    expect(convertAmount(100_000_000, "sat", "usd", rates)).toBe(100_000);
    expect(convertAmount(100_000_000, "sat", "eur", rates)).toBe(90_000);
  });

  it("converts fiat back to sat with rates", () => {
    expect(convertAmount(100_000, "usd", "sat", rates)).toBe(100_000_000);
    expect(convertAmount(90_000, "eur", "sat", rates)).toBe(100_000_000);
  });

  it("formats sat, btc, usd, and eur amounts", () => {
    expect(formatAmountNumber(12345, "sat", "en-US")).toBe("12,345");
    expect(formatAmountNumber(1.23456789, "btc", "en-US")).toBe("1.23456789");
    expect(formatAmountNumber(1234.5, "usd", "en-US")).toBe("$1,234.50");
    expect(formatAmountNumber(1234.5, "eur", "en-US")).toBe("€1,234.50");
  });
});
