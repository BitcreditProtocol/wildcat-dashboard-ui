import { describe, expect, it, vi } from "vitest";
import type { BillBalanceEntry, KeysetBalance, OnChainOperation, OnChainOperationType } from "@/generated/client/types.gen";
import {
  clipBalanceSeries,
  clipKeysetBalances,
  clipMaturityBuckets,
  ebillCollateralByMaturity,
  keysetBalanceSeries,
  keysetBalancesForToken,
  onChainBalanceSeries,
  signedOnChainAmount,
  withTodayMarker,
} from "./balance-history";

function operation(opType: OnChainOperationType, amount: number, timestamp: number): OnChainOperation {
  return { op_type: opType, txids: ["tx"], amount, timestamp };
}

function bill(overrides: Partial<BillBalanceEntry>): BillBalanceEntry {
  return {
    id: "bill",
    issue_date: "2026-01-01",
    maturity_date: "2026-06-30",
    sum: "1000",
    paid: false,
    ...overrides,
  };
}

function keysetBalance(hexId: string, expiry: number, value: number): KeysetBalance {
  const bytes = hexId.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];

  return {
    keyset_id: { version: "Version00", id: { V1: bytes } },
    expiry,
    balance: { value, unit: null },
  };
}

describe("signedOnChainAmount", () => {
  it("counts a mint, an e-bill payment and a reserve as inflows", () => {
    expect(signedOnChainAmount(operation({ type: "Mint", quote_id: "q" }, 500, 1))).toBe(500);
    expect(signedOnChainAmount(operation({ type: "EbillPayment", bill_id: "b" }, 500, 1))).toBe(500);
    expect(signedOnChainAmount(operation({ type: "AddReserve", reserve_id: "r" }, 500, 1))).toBe(500);
  });

  it("counts a melt as an outflow", () => {
    expect(signedOnChainAmount(operation({ type: "Melt", quote_id: "q" }, 500, 1))).toBe(-500);
  });

  it("takes the direction from the operation type even when the amount is already signed", () => {
    expect(signedOnChainAmount(operation({ type: "Melt", quote_id: "q" }, -500, 1))).toBe(-500);
    expect(signedOnChainAmount(operation({ type: "Mint", quote_id: "q" }, -500, 1))).toBe(500);
  });
});

describe("onChainBalanceSeries", () => {
  it("returns no points without operations", () => {
    expect(onChainBalanceSeries([])).toEqual([]);
  });

  it("accumulates a running balance in timestamp order, not in the order received", () => {
    const series = onChainBalanceSeries([
      operation({ type: "Melt", quote_id: "q2" }, 300, 3_000),
      operation({ type: "Mint", quote_id: "q1" }, 1_000, 1_000),
      operation({ type: "AddReserve", reserve_id: "r1" }, 200, 2_000),
    ]);

    expect(series).toEqual([
      { timestamp: 1_000, balance: 1_000 },
      { timestamp: 2_000, balance: 1_200 },
      { timestamp: 3_000, balance: 900 },
    ]);
  });

  it("collapses operations sharing a timestamp into their closing balance", () => {
    const series = onChainBalanceSeries([
      operation({ type: "Mint", quote_id: "q1" }, 1_000, 1_000),
      operation({ type: "Mint", quote_id: "q2" }, 400, 2_000),
      operation({ type: "Melt", quote_id: "q3" }, 100, 2_000),
    ]);

    expect(series).toEqual([
      { timestamp: 1_000, balance: 1_000 },
      { timestamp: 2_000, balance: 1_300 },
    ]);
  });

  it("leaves the input untouched", () => {
    const operations = [operation({ type: "Melt", quote_id: "q2" }, 300, 3_000), operation({ type: "Mint", quote_id: "q1" }, 1_000, 1_000)];

    onChainBalanceSeries(operations);

    expect(operations[0].timestamp).toBe(3_000);
  });
});

describe("ebillCollateralByMaturity", () => {
  it("returns no buckets without bills", () => {
    expect(ebillCollateralByMaturity([])).toEqual([]);
  });

  it("keeps paid and outstanding apart within a maturity date", () => {
    const buckets = ebillCollateralByMaturity([
      bill({ id: "a", maturity_date: "2026-06-30", sum: "1000", paid: true }),
      bill({ id: "b", maturity_date: "2026-06-30", sum: "250", paid: false }),
    ]);

    expect(buckets).toEqual([{ maturityDate: "2026-06-30", paid: 1_000, outstanding: 250 }]);
  });

  it("orders buckets by maturity date, earliest first", () => {
    const buckets = ebillCollateralByMaturity([
      bill({ id: "a", maturity_date: "2026-12-01", sum: "1" }),
      bill({ id: "b", maturity_date: "2026-02-01", sum: "2" }),
      bill({ id: "c", maturity_date: "2026-07-01", sum: "3" }),
    ]);

    expect(buckets.map((bucket) => bucket.maturityDate)).toEqual(["2026-02-01", "2026-07-01", "2026-12-01"]);
  });

  it("adds up decimal sums", () => {
    const buckets = ebillCollateralByMaturity([
      bill({ id: "a", maturity_date: "2026-06-30", sum: "0.5" }),
      bill({ id: "b", maturity_date: "2026-06-30", sum: "1.25" }),
    ]);

    expect(buckets[0].outstanding).toBeCloseTo(1.75);
  });

  it("skips a bill whose sum does not parse rather than poisoning the bucket with NaN", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const buckets = ebillCollateralByMaturity([
      bill({ id: "a", maturity_date: "2026-06-30", sum: "not a number" }),
      bill({ id: "b", maturity_date: "2026-06-30", sum: "700" }),
    ]);

    expect(buckets).toEqual([{ maturityDate: "2026-06-30", paid: 0, outstanding: 700 }]);
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});

describe("keysetBalanceSeries", () => {
  it("returns no points without balances", () => {
    expect(keysetBalanceSeries([])).toEqual([]);
  });

  it("serializes the keyset id the way the keyset routes do", () => {
    expect(keysetBalanceSeries([keysetBalance("abcd", 10, 5)])).toEqual([{ keysetId: "00abcd", expiry: 10, balance: 5 }]);
  });

  it("orders by expiry, then by keyset id so equal expiries stay stable", () => {
    const series = keysetBalanceSeries([keysetBalance("ff", 20, 1), keysetBalance("bb", 10, 2), keysetBalance("aa", 10, 3)]);

    expect(series.map((point) => point.keysetId)).toEqual(["00aa", "00bb", "00ff"]);
  });

  // What the aggregator actually sends: a hex keyset id and the balance as a bare integer,
  // where the spec promises an `Id` object and an `Amount`.
  it("reads the balance the aggregator sends, not only the Amount the spec promises", () => {
    const wireEntry = { keyset_id: "01539548", expiry: 1_789_776_000, balance: 19_512 } as unknown as KeysetBalance;

    expect(keysetBalanceSeries([wireEntry])).toEqual([{ keysetId: "01539548", expiry: 1_789_776_000, balance: 19_512 }]);
  });

  it("drops a balance it cannot read rather than plotting a bar of no height", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unreadable = { keyset_id: "01539548", expiry: 10, balance: { unit: null } } as unknown as KeysetBalance;

    expect(keysetBalanceSeries([unreadable, keysetBalance("aa", 20, 3)])).toEqual([{ keysetId: "00aa", expiry: 20, balance: 3 }]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("clipBalanceSeries", () => {
  const series = [
    { timestamp: 1_000, balance: 500 },
    { timestamp: 2_000, balance: 900 },
    { timestamp: 3_000, balance: 700 },
  ];

  it("returns the whole series when nothing is clipped", () => {
    expect(clipBalanceSeries(series, null)).toEqual(series);
  });

  it("carries the balance from before the window in as an opening point", () => {
    expect(clipBalanceSeries(series, { from: 2_500, to: 4_000 })).toEqual([
      { timestamp: 2_500, balance: 900 },
      { timestamp: 3_000, balance: 700 },
    ]);
  });

  it("does not restart the balance at zero, which filtering before accumulating would", () => {
    const clipped = clipBalanceSeries(series, { from: 2_500, to: 4_000 });

    expect(clipped[0].balance).toBe(900);
  });

  it("holds a quiet window flat rather than leaving a single point", () => {
    expect(clipBalanceSeries(series, { from: 4_000, to: 5_000 })).toEqual([
      { timestamp: 4_000, balance: 700 },
      { timestamp: 5_000, balance: 700 },
    ]);
  });

  it("adds no opening point when the window starts before any history", () => {
    expect(clipBalanceSeries(series, { from: 0, to: 2_000 })).toEqual([
      { timestamp: 1_000, balance: 500 },
      { timestamp: 2_000, balance: 900 },
    ]);
  });

  it("does not duplicate a point that already sits on the window start", () => {
    expect(clipBalanceSeries(series, { from: 2_000, to: 4_000 })).toEqual([
      { timestamp: 2_000, balance: 900 },
      { timestamp: 3_000, balance: 700 },
    ]);
  });
});

describe("clipMaturityBuckets", () => {
  const buckets = [
    { maturityDate: "2026-09-17", paid: 0, outstanding: 10 },
    { maturityDate: "2026-10-17", paid: 5, outstanding: 0 },
  ];
  const october = Math.floor(Date.UTC(2026, 9, 1) / 1000);

  it("returns every bucket when nothing is clipped", () => {
    expect(clipMaturityBuckets(buckets, null)).toEqual(buckets);
  });

  it("keeps only the buckets maturing inside the window", () => {
    expect(clipMaturityBuckets(buckets, { from: october, to: october + 40 * 24 * 60 * 60 })).toEqual([buckets[1]]);
  });

  it("drops a bucket whose date cannot be placed on the axis", () => {
    expect(clipMaturityBuckets([{ maturityDate: "not a date", paid: 0, outstanding: 1 }], { from: 0, to: 1e12 })).toEqual([]);
  });
});

describe("withTodayMarker", () => {
  const bucket = { maturityDate: "2026-03-01", paid: 0, outstanding: 40 };

  it("gives the chart a category for today to draw its line on", () => {
    expect(withTodayMarker([bucket], "2026-02-01")).toEqual([{ maturityDate: "2026-02-01", paid: 0, outstanding: 0 }, bucket]);
  });

  it("keeps the marker in date order among the maturities", () => {
    const buckets = withTodayMarker([{ ...bucket, maturityDate: "2026-01-01" }, bucket], "2026-02-01");

    expect(buckets.map((entry) => entry.maturityDate)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("leaves a day that matures bills of its own alone", () => {
    expect(withTodayMarker([bucket], "2026-03-01")).toEqual([bucket]);
  });
});

describe("keysetBalancesForToken", () => {
  const now = 1_700_000_000;
  const expired = { keysetId: "00aa", expiry: now - 86_400, balance: 5 };
  const running = { keysetId: "00bb", expiry: now + 86_400, balance: 7 };

  it("gives each token the side of now its keysets sit on", () => {
    expect(keysetBalancesForToken([expired, running], "debit", now)).toEqual([expired]);
    expect(keysetBalancesForToken([expired, running], "credit", now)).toEqual([running]);
  });

  it("leaves neither token holding every balance", () => {
    const debit = keysetBalancesForToken([expired, running], "debit", now);
    const credit = keysetBalancesForToken([expired, running], "credit", now);

    expect(debit.length + credit.length).toBe(2);
  });
});

describe("clipKeysetBalances", () => {
  const points = [
    { keysetId: "00aa", expiry: 1_000, balance: 5 },
    { keysetId: "00bb", expiry: 5_000, balance: 7 },
  ];

  it("returns every keyset when nothing is clipped", () => {
    expect(clipKeysetBalances(points, null)).toEqual(points);
  });

  it("keeps only the keysets expiring inside the window", () => {
    expect(clipKeysetBalances(points, { from: 2_000, to: 6_000 })).toEqual([points[1]]);
  });
});
