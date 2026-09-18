import { calendarDayToUtc, toUtcEndOfDay } from "@/utils/dates";

/**
 * Every balance-history endpoint hands over its whole history in one response and takes no
 * query parameters, so narrowing a chart to a window is a local operation on data already in
 * hand — no refetch, and "all" is always one click away.
 */
export type ChartRange = "all" | "30d" | "90d" | "custom";

/**
 * Which side of today a chart's axis lives on. On-chain operations have already settled, so
 * their window runs backwards; e-bill maturities and keyset expiries are dates the mint is
 * waiting for, so theirs runs forwards.
 */
export type RangeDirection = "past" | "future";

export const CHART_RANGES: ChartRange[] = ["all", "30d", "90d", "custom"];

/**
 * Presets only guess at a chart's time scale, and maturity and expiry ladders are scaled by the
 * bills behind them rather than by the calendar, so two presets cover the common questions and
 * "custom" hands the bounds to the operator for everything else.
 */
const RANGE_DAYS: Record<"30d" | "90d", number> = {
  "30d": 30,
  "90d": 90,
};

const SECONDS_PER_DAY = 24 * 60 * 60;

/** Inclusive bounds in Unix seconds, or `null` when the range is "all" and nothing is clipped. */
export interface RangeBounds {
  from: number;
  to: number;
}

/**
 * Bounds for a preset. "all" clips nothing, and "custom" carries its own bounds rather than
 * deriving them from today, so it resolves to `null` here and is supplied by the caller.
 */
export function rangeBounds(range: ChartRange, direction: RangeDirection, now: Date = new Date()): RangeBounds | null {
  if (range === "all" || range === "custom") {
    return null;
  }

  const today = Math.floor(now.getTime() / 1000);
  const span = RANGE_DAYS[range] * SECONDS_PER_DAY;

  return direction === "past" ? { from: today - span, to: today } : { from: today, to: today + span };
}

/**
 * A hand-picked range, as whole UTC days: the picker hands back local-midnight dates, and every
 * axis on these charts is UTC, so the window has to cover the whole of both end days or a bill
 * maturing on the last day picked would fall outside it.
 */
export function customBounds(from: Date, to: Date): RangeBounds {
  const [earlier, later] = from.getTime() <= to.getTime() ? [from, to] : [to, from];

  return {
    from: Math.floor(calendarDayToUtc(earlier).getTime() / 1000),
    to: Math.floor(toUtcEndOfDay(calendarDayToUtc(later)).getTime() / 1000),
  };
}

export function isWithinBounds(unixSeconds: number, bounds: RangeBounds | null): boolean {
  return bounds === null || (unixSeconds >= bounds.from && unixSeconds <= bounds.to);
}
