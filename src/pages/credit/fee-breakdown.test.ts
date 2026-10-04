import { describe, expect, it } from "vitest";
import type { DecisionCase } from "./decision-types";
import { feeBreakdown } from "./fee-breakdown";

// Figures from a real credit API case: 8,000,000 sat for 180 days at 540 bps a year.
const inputs = { costOfFundsBps: 100, expectedLossBps: 240, uncertaintyMarginBps: 100, returnObjectiveBps: 100, subsidyBps: 0 };
function decisionCase(
  overrides: {
    inputs?: Partial<typeof inputs>;
    appliedDiscountSat?: string;
    annualDiscountBps?: number;
    traceRate?: string;
    pd?: number;
  } = {}
) {
  const appliedDiscountSat = overrides.appliedDiscountSat ?? "216000";
  const fee = Number(appliedDiscountSat) + 50_000;
  return {
    snapshot: {
      acceptor: { probabilityOfDefaultBps: overrides.pd ?? 600, lossGivenDefaultBps: 4000, evidenceState: "independently_verified" },
    },
    policyPack: {
      maximumFeeRatioBps: 3000,
      maximumEffectiveAnnualBps: 1500,
    },
    result: {
      calculationTrace: [
        { step: "annual_discount_bps", inputs: { ...inputs, ...overrides.inputs }, result: String(overrides.annualDiscountBps ?? 540) },
        { step: "applied_discount_sat", inputs: { dayCountDenominator: 360 }, result: appliedDiscountSat },
      ],
      terms: {
        billSumSat: "8000000",
        discountedSat: String(8_000_000 - fee),
        appliedDiscountSat,
        operatingCostSat: "50000",
        effectiveFeeSat: String(fee),
        tenorDays: 180,
        annualDiscountBps: overrides.annualDiscountBps ?? 540,
        effectiveAnnualBps: 688,
        feeRatioBps: 333,
        offerExpiresOn: "2026-10-04",
      },
    },
  } as unknown as DecisionCase;
}

describe("feeBreakdown", () => {
  it("splits the discount into named parts that add up to it exactly", () => {
    const breakdown = feeBreakdown(decisionCase());

    expect(breakdown?.parts.map(({ key, sat }) => [key, sat])).toEqual([
      ["payerRisk", 96_000],
      ["uncertainty", 40_000],
      ["funding", 40_000],
      ["mintReturn", 40_000],
    ]);
    expect(breakdown?.feeSat).toBe(266_000);
    expect(breakdown?.holderReceivesSat).toBe(7_734_000);
    expect(breakdown?.operatingCostSat).toBe(50_000);
  });

  it("keeps the exact total when the parts do not divide evenly", () => {
    const breakdown = feeBreakdown(decisionCase({ appliedDiscountSat: "216007" }));
    const total = breakdown?.parts.reduce((sum, part) => sum + part.sat, 0);

    expect(total).toBe(216_007);
  });

  it("shows a subsidy as a reduction", () => {
    const breakdown = feeBreakdown(decisionCase({ inputs: { subsidyBps: 40 }, annualDiscountBps: 500, appliedDiscountSat: "200000" }));

    expect(breakdown?.parts.find((part) => part.key === "subsidy")?.sat).toBe(-16_000);
    expect(breakdown?.parts.reduce((sum, part) => sum + part.sat, 0)).toBe(200_000);
  });

  it("gives the rounding remainder to the highest-rate part, even when every part rounds to nothing", () => {
    const breakdown = feeBreakdown(decisionCase({ appliedDiscountSat: "3" }));

    expect(breakdown?.parts.map(({ key, sat }) => [key, sat])).toEqual([
      ["payerRisk", 3],
      ["uncertainty", 0],
      ["funding", 0],
      ["mintReturn", 0],
    ]);
  });

  it("shows nothing when the trace does not add up to the governed rate", () => {
    expect(feeBreakdown(decisionCase({ annualDiscountBps: 541 }))).toBeUndefined();
    // The payer-risk part must be the recorded payer's own figures (6% x 40% = 240 bps).
    expect(feeBreakdown(decisionCase({ pd: 700 }))).toBeUndefined();
    expect(feeBreakdown(decisionCase({ inputs: { expectedLossBps: undefined as unknown as number } }))).toBeUndefined();
  });
});
