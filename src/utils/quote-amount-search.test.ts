import { describe, expect, it } from "vitest";
import { matchesQuoteAmount } from "./quote-amount-search";

describe("quote face amount search", () => {
  it.each(["2000000", "2,000,000", "2.000.000", "2 000 000 sat", "2\u202f000\u202f000 SAT"])("accepts %s", (query) => {
    expect(matchesQuoteAmount(2_000_000, query)).toBe(true);
  });
  it.each(["2027-03-19", "bill-2000000", "200", "", "sat", "2 million"])("does not reinterpret %s", (query) => {
    expect(matchesQuoteAmount(2_000_000, query)).toBe(false);
  });
  it("does not turn a decimal amount into a different integer", () => {
    expect(matchesQuoteAmount(250, "2.50 sat")).toBe(false);
  });
});
