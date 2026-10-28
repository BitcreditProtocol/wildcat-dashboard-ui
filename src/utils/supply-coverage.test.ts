import { describe, expect, it } from "vitest";
import { supplyMismatches } from "./supply-coverage";

describe("supplyMismatches", () => {
  it("reports nothing when each supply equals its collateral", () => {
    expect(
      supplyMismatches({
        debit_circulating_supply: { value: 1_000, unit: "sat" },
        credit_circulating_supply: { value: 500, unit: "crsat" },
        onchain_collateral: 1_000,
        ebill_collateral: 500,
      })
    ).toEqual([]);
  });

  it("reports the exact signed difference for each token that is off", () => {
    expect(
      supplyMismatches({
        debit_circulating_supply: { value: 1_250, unit: "sat" },
        credit_circulating_supply: { value: 400, unit: "crsat" },
        onchain_collateral: 1_000,
        ebill_collateral: 500,
      })
    ).toEqual([
      { token: "debit", supply: 1_250, collateral: 1_000, difference: 250 },
      { token: "credit", supply: 400, collateral: 500, difference: -100 },
    ]);
  });

  it("only flags the token that is off", () => {
    expect(
      supplyMismatches({
        debit_circulating_supply: 10,
        credit_circulating_supply: 7,
        onchain_collateral: 10,
        ebill_collateral: 0,
      })
    ).toEqual([{ token: "credit", supply: 7, collateral: 0, difference: 7 }]);
  });
});
