import type { BillBalanceEntry, OnChainOperation } from "@/generated/client/types.gen";
import { createLogger } from "@/lib/logger";
import { type RangeBounds, isWithinBounds } from "@/utils/chart-range";
import { getUtcStartOfDate, toUtcDateKey } from "@/utils/dates";

const logger = createLogger("cash-flow");

/**
 * How wide one bar is. Days stop being readable past about a quarter, so anything longer is
 * bucketed by month; the cut-off sits just above the 90-day presets so those stay daily.
 */
export type CashFlowGranularity = "day" | "month";

const DAILY_SPAN_LIMIT_DAYS = 92;
const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * One period's flows, in satoshis. Bitcoin and e-bill flows stay apart, and an e-bill only counts
 * as paid once its payment has settled on-chain: the bill balance endpoint carries a `paid` flag
 * but no payment date, so the settled `EbillPayment` operation is what dates the cash. A bill
 * still unpaid is an expected inflow on its maturity date — collateral, not cash — and is left
 * out of `net`.
 */
export interface CashFlowBucket {
  period: string;
  bitcoinIn: number;
  /** Melts paying holders out, as a negative number so it draws below the axis. */
  bitcoinOut: number;
  ebillPaid: number;
  ebillExpected: number;
  /** Realised flows only: bitcoin in and out plus settled e-bill payments. */
  net: number;
}

type FlowKind = "bitcoinIn" | "bitcoinOut" | "ebillPaid" | "ebillExpected";

interface Flow {
  seconds: number;
  kind: FlowKind;
  amount: number;
}

function onChainFlow(operation: OnChainOperation): Flow {
  const amount = Math.abs(operation.amount);

  switch (operation.op_type.type) {
    case "Melt":
      return { seconds: operation.timestamp, kind: "bitcoinOut", amount: -amount };
    case "EbillPayment":
      return { seconds: operation.timestamp, kind: "ebillPaid", amount };
    case "Mint":
    case "AddReserve":
      return { seconds: operation.timestamp, kind: "bitcoinIn", amount };
  }
}

function expectedBillFlow(bill: BillBalanceEntry): Flow | null {
  const sum = Number(bill.sum);
  const maturity = getUtcStartOfDate(bill.maturity_date);

  if (!Number.isFinite(sum) || maturity === null) {
    logger.error("Unplaceable bill", bill.id, bill.sum, bill.maturity_date);
    return null;
  }

  return { seconds: Math.floor(maturity.getTime() / 1000), kind: "ebillExpected", amount: sum };
}

export function periodKey(seconds: number, granularity: CashFlowGranularity): string {
  const day = toUtcDateKey(new Date(seconds * 1000));

  return granularity === "day" ? day : day.slice(0, 7);
}

/** The first second of the period after `key`, so empty periods between two flows can be filled. */
function nextPeriodStart(key: string, granularity: CashFlowGranularity): number {
  const [year, month, day] = key.split("-").map(Number);
  const next = granularity === "day" ? Date.UTC(year, month - 1, day + 1) : Date.UTC(year, month, 1);

  return Math.floor(next / 1000);
}

/** Days when the window or the data spans a quarter or less, months beyond that. */
export function cashFlowGranularity(from: number, to: number): CashFlowGranularity {
  return to - from <= DAILY_SPAN_LIMIT_DAYS * SECONDS_PER_DAY ? "day" : "month";
}

export interface CashFlow {
  granularity: CashFlowGranularity;
  buckets: CashFlowBucket[];
}

/**
 * Realised and expected flows per period inside a window, with every period between the first
 * and last present so the axis keeps time even where nothing moved. Without a window the axis
 * runs from the earliest flow to the latest, stretched to cover today so the chart can mark it.
 */
export function cashFlow(
  operations: OnChainOperation[],
  bills: BillBalanceEntry[],
  bounds: RangeBounds | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): CashFlow {
  const flows = [
    ...operations.map(onChainFlow),
    ...bills.filter((bill) => !bill.paid).flatMap((bill) => expectedBillFlow(bill) ?? []),
  ].filter((flow) => isWithinBounds(flow.seconds, bounds));

  if (bounds === null && flows.length === 0) {
    return { granularity: "month", buckets: [] };
  }

  const from = bounds?.from ?? Math.min(nowSeconds, ...flows.map((flow) => flow.seconds));
  const to = bounds?.to ?? Math.max(nowSeconds, ...flows.map((flow) => flow.seconds));
  const granularity = cashFlowGranularity(from, to);

  const buckets = new Map<string, CashFlowBucket>();
  const lastKey = periodKey(to, granularity);

  for (let key = periodKey(from, granularity); key <= lastKey; key = periodKey(nextPeriodStart(key, granularity), granularity)) {
    buckets.set(key, { period: key, bitcoinIn: 0, bitcoinOut: 0, ebillPaid: 0, ebillExpected: 0, net: 0 });
  }

  for (const flow of flows) {
    const bucket = buckets.get(periodKey(flow.seconds, granularity));

    if (bucket === undefined) {
      continue;
    }

    bucket[flow.kind] += flow.amount;

    if (flow.kind !== "ebillExpected") {
      bucket.net += flow.amount;
    }
  }

  return { granularity, buckets: [...buckets.values()] };
}

export function hasCashFlow(bucket: CashFlowBucket): boolean {
  return bucket.bitcoinIn !== 0 || bucket.bitcoinOut !== 0 || bucket.ebillPaid !== 0 || bucket.ebillExpected !== 0;
}
