import type { BillBalanceEntry, KeysetBalance, OnChainOperation, OnChainOperationType } from "@/generated/client/types.gen";
import { createLogger } from "@/lib/logger";
import { type RangeBounds, isWithinBounds } from "@/utils/chart-range";
import { getUtcStartOfDate } from "@/utils/dates";
import { type TokenKind, keysetTokenKind, serializeKeysetId } from "@/utils/keyset";

const logger = createLogger("balance-history");

/**
 * Which way an on-chain operation moves the mint's own balance.
 *
 * `Mint` and `AddReserve` fund the mint on-chain and an `EbillPayment` is a bill the mint
 * holds being settled, so the three of them are inflows; a `Melt` pays a holder out, which
 * makes it the only outflow. The aggregator types `amount` as a plain i64 and documents no
 * sign convention, so callers take the magnitude and apply the direction here — correct
 * whether or not the wire value already carries a sign.
 */
export function onChainOperationDirection(opType: OnChainOperationType): 1 | -1 {
  return opType.type === "Melt" ? -1 : 1;
}

/** The operation's effect on the on-chain balance, in satoshis. */
export function signedOnChainAmount(operation: OnChainOperation): number {
  return onChainOperationDirection(operation.op_type) * Math.abs(operation.amount);
}

export interface OnChainBalancePoint {
  timestamp: number;
  balance: number;
}

/**
 * The running on-chain balance, oldest first. The endpoint reports discrete operations
 * rather than a balance series, so the series is accumulated here; operations sharing a
 * timestamp collapse into the one closing balance they produce.
 */
export function onChainBalanceSeries(operations: OnChainOperation[]): OnChainBalancePoint[] {
  const ordered = [...operations].sort((a, b) => a.timestamp - b.timestamp);
  const series: OnChainBalancePoint[] = [];
  let balance = 0;

  for (const operation of ordered) {
    balance += signedOnChainAmount(operation);
    const last = series[series.length - 1];

    if (last?.timestamp === operation.timestamp) {
      last.balance = balance;
    } else {
      series.push({ timestamp: operation.timestamp, balance });
    }
  }

  return series;
}

/**
 * The running balance narrowed to a window.
 *
 * Dropping operations outside the window *before* accumulating would restart the balance at zero
 * and understate every point in it, so the series is accumulated over the whole history first and
 * only clipped here: the balance carried into the window survives as an opening point at its
 * start. A window whose only point is that opening balance is extended to the window end, so a
 * quiet period reads as a flat line rather than a single invisible dot.
 */
export function clipBalanceSeries(series: OnChainBalancePoint[], bounds: RangeBounds | null): OnChainBalancePoint[] {
  if (bounds === null) {
    return series;
  }

  const inside = series.filter((point) => isWithinBounds(point.timestamp, bounds));
  const before = series.filter((point) => point.timestamp < bounds.from);
  const opening = before[before.length - 1];

  if (opening === undefined || inside[0]?.timestamp === bounds.from) {
    return inside;
  }

  const clipped = [{ timestamp: bounds.from, balance: opening.balance }, ...inside];

  return clipped.length === 1 ? [...clipped, { timestamp: bounds.to, balance: opening.balance }] : clipped;
}

export interface OnChainLedgerEntry {
  key: string;
  timestamp: number;
  operation: OnChainOperation;
  change: number;
  balance: number;
}

export interface OnChainLedger {
  opening: number;
  entries: OnChainLedgerEntry[];
  closing: number;
}

/**
 * The on-chain balance as the operations that make it up, so `opening` plus every `change`
 * adds up to `closing`. Like `clipBalanceSeries`, the balance is accumulated over the whole
 * history before the window is applied, so a narrowed window still opens on the true balance.
 */
export function onChainLedger(operations: OnChainOperation[], bounds: RangeBounds | null): OnChainLedger {
  const ordered = [...operations].sort((a, b) => a.timestamp - b.timestamp);
  const entries: OnChainLedgerEntry[] = [];
  let opening = 0;
  let balance = 0;

  ordered.forEach((operation, index) => {
    const change = signedOnChainAmount(operation);
    balance += change;

    if (bounds !== null && operation.timestamp < bounds.from) {
      opening = balance;
    } else if (bounds === null || isWithinBounds(operation.timestamp, bounds)) {
      entries.push({ key: `${operation.timestamp}-${index}`, timestamp: operation.timestamp, operation, change, balance });
    }
  });

  return { opening, entries, closing: entries[entries.length - 1]?.balance ?? opening };
}

export interface EbillCollateralEntry {
  id: string;
  maturityDate: string;
  paid: number;
  outstanding: number;
}

/**
 * The bills behind the maturity ladder, one row each, earliest maturity first. A bill's sum sits
 * in `paid` or `outstanding`, never both, so the columns total to the ladder's two stacks.
 */
export function ebillCollateralEntries(bills: BillBalanceEntry[], bounds: RangeBounds | null): EbillCollateralEntry[] {
  const entries: EbillCollateralEntry[] = [];

  for (const bill of bills) {
    const sum = Number(bill.sum);
    const utcStart = getUtcStartOfDate(bill.maturity_date);

    if (!Number.isFinite(sum)) {
      logger.error("Unparseable bill sum", bill.id, bill.sum);
      continue;
    }

    if (bounds !== null && (utcStart === null || !isWithinBounds(Math.floor(utcStart.getTime() / 1000), bounds))) {
      continue;
    }

    entries.push({
      id: bill.id,
      maturityDate: bill.maturity_date,
      paid: bill.paid ? sum : 0,
      outstanding: bill.paid ? 0 : sum,
    });
  }

  return entries.sort((a, b) => a.maturityDate.localeCompare(b.maturityDate) || a.id.localeCompare(b.id));
}

export interface EbillMaturityBucket {
  maturityDate: string;
  paid: number;
  outstanding: number;
}

/**
 * E-bill collateral grouped by the date it matures on, earliest first, with paid and
 * outstanding kept apart: a bill is collateral until its own endpoint says `paid`, and the
 * two facts must not be merged into a single total.
 */
export function ebillCollateralByMaturity(bills: BillBalanceEntry[]): EbillMaturityBucket[] {
  const buckets = new Map<string, EbillMaturityBucket>();

  for (const bill of bills) {
    const sum = Number(bill.sum);

    if (!Number.isFinite(sum)) {
      logger.error("Unparseable bill sum", bill.id, bill.sum);
      continue;
    }

    const bucket = buckets.get(bill.maturity_date) ?? { maturityDate: bill.maturity_date, paid: 0, outstanding: 0 };

    if (bill.paid) {
      bucket.paid += sum;
    } else {
      bucket.outstanding += sum;
    }

    buckets.set(bill.maturity_date, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
}

/**
 * The maturity buckets with an empty bucket for today, so the chart has a category for its
 * "today" line to sit on: the axis is categorical, and a line can only be drawn on a date the
 * ladder already carries. A day that matures bills of its own keeps them.
 */
export function withTodayMarker(buckets: EbillMaturityBucket[], todayKey: string): EbillMaturityBucket[] {
  if (buckets.some((bucket) => bucket.maturityDate === todayKey)) {
    return buckets;
  }

  return [...buckets, { maturityDate: todayKey, paid: 0, outstanding: 0 }].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
}

/**
 * Maturity buckets inside a window. Each bucket is an independent sum rather than a running
 * total, so unlike the on-chain series it can simply be filtered. A bucket whose date does not
 * parse is dropped, because a bill that cannot be placed on the axis cannot be windowed either.
 */
export function clipMaturityBuckets(buckets: EbillMaturityBucket[], bounds: RangeBounds | null): EbillMaturityBucket[] {
  if (bounds === null) {
    return buckets;
  }

  return buckets.filter((bucket) => {
    const utcStart = getUtcStartOfDate(bucket.maturityDate);

    return utcStart !== null && isWithinBounds(Math.floor(utcStart.getTime() / 1000), bounds);
  });
}

export interface KeysetBalancePoint {
  keysetId: string;
  expiry: number;
  balance: number;
}

/**
 * The satoshis on one keyset entry. The spec and the aggregator now agree on a bare integer,
 * but a value that is not one is still reported and dropped rather than charted as a bar of
 * undefined height, which draws nothing while leaving the chart looking merely empty.
 */
function keysetBalanceValue(balance: KeysetBalance["balance"]): number | null {
  return Number.isFinite(balance) ? balance : null;
}

/**
 * Outstanding eCash per keyset, ordered by the expiry it runs to. A balance carries no unit of
 * its own and so says nothing about which token it belongs to; `keysetBalancesForToken` splits
 * them by expiry.
 */
export function keysetBalanceSeries(balances: KeysetBalance[]): KeysetBalancePoint[] {
  const points: KeysetBalancePoint[] = [];

  for (const entry of balances) {
    const balance = keysetBalanceValue(entry.balance);

    if (balance === null) {
      logger.error("Unreadable keyset balance", entry.keyset_id, entry.balance);
      continue;
    }

    points.push({ keysetId: serializeKeysetId(entry.keyset_id), expiry: entry.expiry, balance });
  }

  return points.sort((a, b) => a.expiry - b.expiry || a.keysetId.localeCompare(b.keysetId));
}

/**
 * The keyset balances issuing one token. The endpoint reports no unit, so the split is the
 * keyset's own expiry: everything already expired is debit eCash, everything still running is
 * credit. Each chart therefore covers one side of now, which is also why their range toggles
 * offer opposite windows.
 */
export function keysetBalancesForToken(points: KeysetBalancePoint[], token: TokenKind, nowSeconds: number): KeysetBalancePoint[] {
  return points.filter((point) => keysetTokenKind(point.expiry, nowSeconds) === token);
}

/** Keysets whose expiry falls inside a window. Like maturity buckets, these are independent sums. */
export function clipKeysetBalances(points: KeysetBalancePoint[], bounds: RangeBounds | null): KeysetBalancePoint[] {
  return bounds === null ? points : points.filter((point) => isWithinBounds(point.expiry, bounds));
}
