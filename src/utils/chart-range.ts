import { calendarDayToUtc, toUtcEndOfDay } from "@/utils/dates";

/**
 * Every balance-history endpoint hands over its whole history in one response and takes no
 * query parameters, so narrowing a chart to a window is a local operation on data already in
 * hand — no refetch, and "all" is always one click away.
 */
export type ChartRange = "all" | "past30d" | "past90d" | "next30d" | "next90d" | "custom";

/**
 * Which windows a chart offers. On-chain operations have already settled, so that chart looks
 * back; keyset expiries are dates the mint is waiting for, so those look forward; the e-bill
 * ladder straddles today — bills that have matured on one side, maturities still coming on the
 * other — so it offers both.
 */
export type RangeDirection = "past" | "future" | "both";

/**
 * Presets only guess at a chart's time scale, and maturity and expiry ladders are scaled by the
 * bills behind them rather than by the calendar, so a couple of presets per side cover the
 * common questions and "custom" hands the bounds to the operator for everything else.
 */
const RANGE_SPANS: Partial<Record<ChartRange, { days: number; towards: "past" | "future" }>> = {
  past30d: { days: 30, towards: "past" },
  past90d: { days: 90, towards: "past" },
  next30d: { days: 30, towards: "future" },
  next90d: { days: 90, towards: "future" },
};

/** The presets a chart lists, in toggle order. "custom" is not among them: it has its own chip. */
export const RANGES_BY_DIRECTION: Record<RangeDirection, ChartRange[]> = {
  past: ["all", "past30d", "past90d"],
  future: ["all", "next30d", "next90d"],
  both: ["all", "past30d", "past90d", "next30d", "next90d"],
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
export function rangeBounds(range: ChartRange, now: Date = new Date()): RangeBounds | null {
  const preset = RANGE_SPANS[range];

  if (preset === undefined) {
    return null;
  }

  const today = Math.floor(now.getTime() / 1000);
  const span = preset.days * SECONDS_PER_DAY;

  return preset.towards === "past" ? { from: today - span, to: today } : { from: today, to: today + span };
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
