import { describe, expect, it } from "vitest";
import { formatAmountString, parseAmountString } from "./amount-format";

describe("amount formatting", () => {
  it("formats and parses comma-style numbers", () => {
    expect(formatAmountString("1234.56", "comma")).toBe("1,234.56");
    expect(parseAmountString("1,234.56", "comma")).toBe(1234.56);
  });

  it("formats and parses point-style numbers", () => {
    expect(formatAmountString("1234.56", "point")).toBe("1.234,56");
    expect(parseAmountString("1.234,56", "point")).toBe(1234.56);
  });

  it("formats and parses space-style numbers", () => {
    expect(formatAmountString("1234.56", "space")).toBe("1 234,56");
    expect(parseAmountString("1 234,56", "space")).toBe(1234.56);
  });

  it("returns undefined for empty or invalid values", () => {
    expect(parseAmountString(undefined, "comma")).toBeUndefined();
    expect(parseAmountString("", "comma")).toBeUndefined();
    expect(parseAmountString("abc", "comma")).toBeUndefined();
    expect(parseAmountString("1,234.56", "point")).toBeUndefined();
  });
});
