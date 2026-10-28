import { describe, expect, it } from "vitest";
import type { BillBalanceEntry, OnChainOperation, OnChainOperationType } from "@/generated/client/types.gen";
import { cashFlow, cashFlowGranularity, hasCashFlow, periodKey } from "./cash-flow";

function operation(opType: OnChainOperationType, amount: number, isoDate: string): OnChainOperation {
  return { op_type: opType, txids: ["tx"], amount, timestamp: Date.parse(isoDate) / 1000 };
}

function bill(overrides: Partial<BillBalanceEntry>): BillBalanceEntry {
  return { id: "bill", issue_date: "2026-01-01", maturity_date: "2026-06-30", sum: "1000", paid: false, ...overrides };
}

const seconds = (isoDate: string) => Date.parse(isoDate) / 1000;

describe("cashFlowGranularity", () => {
  it("uses days up to a quarter and months beyond", () => {
    expect(cashFlowGranularity(seconds("2026-01-01"), seconds("2026-03-31"))).toBe("day");
    expect(cashFlowGranularity(seconds("2026-01-01"), seconds("2026-06-01"))).toBe("month");
  });
});

describe("periodKey", () => {
  it("keys by UTC day or month", () => {
    expect(periodKey(seconds("2026-02-03T23:30:00Z"), "day")).toBe("2026-02-03");
    expect(periodKey(seconds("2026-02-03T23:30:00Z"), "month")).toBe("2026-02");
  });
});

describe("cashFlow", () => {
  const now = seconds("2026-03-15T12:00:00Z");

  it("splits bitcoin in, bitcoin out, settled e-bill payments and expected maturities by month", () => {
    const { granularity, buckets } = cashFlow(
      [
        operation({ type: "Mint", quote_id: "q1" }, 500, "2026-01-10T00:00:00Z"),
        operation({ type: "AddReserve", reserve_id: "r1" }, 200, "2026-01-20T00:00:00Z"),
        operation({ type: "Melt", quote_id: "q2" }, 300, "2026-02-05T00:00:00Z"),
        operation({ type: "EbillPayment", bill_id: "b0" }, 1000, "2026-02-28T00:00:00Z"),
      ],
      [bill({ id: "b1", maturity_date: "2026-06-30" }), bill({ id: "b0", maturity_date: "2026-02-28", paid: true })],
      null,
      now
    );

    expect(granularity).toBe("month");
    expect(buckets.map((bucket) => bucket.period)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(buckets[0]).toMatchObject({ bitcoinIn: 700, bitcoinOut: 0, ebillPaid: 0, net: 700 });
    expect(buckets[1]).toMatchObject({ bitcoinIn: 0, bitcoinOut: -300, ebillPaid: 1000, net: 700 });
    expect(buckets[5]).toMatchObject({ ebillExpected: 1000, net: 0 });
  });

  it("does not count a paid bill twice: its cash comes from the on-chain payment", () => {
    const { buckets } = cashFlow([], [bill({ paid: true })], null, now);

    expect(buckets.every((bucket) => !hasCashFlow(bucket))).toBe(true);
  });

  it("treats the melt amount as an outflow whatever its wire sign", () => {
    const { buckets } = cashFlow([operation({ type: "Melt", quote_id: "q" }, -300, "2026-03-01T00:00:00Z")], [], null, now);

    expect(buckets.find((bucket) => bucket.period === "2026-03-01")?.bitcoinOut).toBe(-300);
  });

  it("fills every day of a short window and drops flows outside it", () => {
    const { granularity, buckets } = cashFlow(
      [
        operation({ type: "Mint", quote_id: "in" }, 100, "2026-03-02T10:00:00Z"),
        operation({ type: "Mint", quote_id: "out" }, 999, "2026-04-02T10:00:00Z"),
      ],
      [],
      { from: seconds("2026-03-01T00:00:00Z"), to: seconds("2026-03-07T23:59:59Z") },
      now
    );

    expect(granularity).toBe("day");
    expect(buckets).toHaveLength(7);
    expect(buckets[1]).toMatchObject({ period: "2026-03-02", bitcoinIn: 100 });
    expect(buckets.reduce((sum, bucket) => sum + bucket.bitcoinIn, 0)).toBe(100);
  });

  it("skips a bill whose sum cannot be read", () => {
    const { buckets } = cashFlow([], [bill({ sum: "n/a" })], null, now);

    expect(buckets.every((bucket) => !hasCashFlow(bucket))).toBe(true);
  });

  it("returns nothing when there is no history and no window", () => {
    expect(cashFlow([], [], null, now).buckets).toEqual([]);
  });
});
