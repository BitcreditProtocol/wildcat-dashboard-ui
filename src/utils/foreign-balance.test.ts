import { describe, expect, it } from "vitest";
import type { ForeignBalanceEntry } from "@/generated/client/types.gen";
import { foreignBalanceTotals, sortForeignBalances } from "./foreign-balance";

function entry(mintId: string, settled: number, unsettled: number): ForeignBalanceEntry {
  return { mint_id: mintId, settled, unsettled };
}

describe("foreignBalanceTotals", () => {
  it("totals nothing when the mint holds no foreign eCash", () => {
    expect(foreignBalanceTotals([])).toEqual({ settled: 0, unsettled: 0 });
  });

  it("keeps settled and unsettled apart rather than reporting one total", () => {
    expect(foreignBalanceTotals([entry("a", 100, 7), entry("b", 20, 3)])).toEqual({ settled: 120, unsettled: 10 });
  });

  it("counts a mint that owes everything it holds as settled zero", () => {
    expect(foreignBalanceTotals([entry("a", 0, 500)])).toEqual({ settled: 0, unsettled: 500 });
  });
});

describe("sortForeignBalances", () => {
  it("puts the mint holding the most value first", () => {
    const sorted = sortForeignBalances([entry("a", 10, 0), entry("b", 1, 100), entry("c", 50, 0)]);

    expect(sorted.map((balance) => balance.mint_id)).toEqual(["b", "c", "a"]);
  });

  it("breaks a tie on the mint id so the list does not reshuffle between polls", () => {
    const sorted = sortForeignBalances([entry("z", 5, 5), entry("m", 5, 5), entry("a", 5, 5)]);

    expect(sorted.map((balance) => balance.mint_id)).toEqual(["a", "m", "z"]);
  });

  it("leaves the caller's array untouched", () => {
    const entries = [entry("a", 1, 0), entry("b", 9, 0)];
    sortForeignBalances(entries);

    expect(entries.map((balance) => balance.mint_id)).toEqual(["a", "b"]);
  });
});
