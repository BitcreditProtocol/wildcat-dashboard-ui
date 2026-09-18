import { useMemo, useState } from "react";
import type { DateRange } from "@bitcredit/ui-library";
import { type ChartRange, type RangeBounds, type RangeDirection, customBounds, rangeBounds } from "@/utils/chart-range";

export interface ChartRangeState {
  range: ChartRange;
  setRange: (range: ChartRange) => void;
  picked: DateRange | undefined;
  setPicked: (picked: DateRange | undefined) => void;
  bounds: RangeBounds | null;
}

/**
 * Range state for one chart. Every chart owns its own, so narrowing the on-chain balance leaves
 * the maturity ladder beside it alone.
 *
 * A half-finished custom pick — one end clicked, the other not yet — clips nothing rather than
 * clipping to a single day, so the chart stays whole while the picker is open.
 */
export function useChartRange(direction: RangeDirection): ChartRangeState {
  const [range, setRange] = useState<ChartRange>("all");
  const [picked, setPicked] = useState<DateRange | undefined>(undefined);

  const bounds = useMemo(() => {
    if (range !== "custom") {
      return rangeBounds(range, direction);
    }

    return picked?.from && picked.to ? customBounds(picked.from, picked.to) : null;
  }, [direction, picked, range]);

  return { range, setRange, picked, setPicked, bounds };
}
