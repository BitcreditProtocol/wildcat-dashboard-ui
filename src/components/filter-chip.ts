import { cn } from "@bitcredit/ui-library";

/**
 * One look for both chip rows above a list: the status links and the quick filter
 * buttons. Chips never shrink, so a row that does not fit scrolls rather than squashing
 * its labels.
 */
export function filterChipProps(isActive: boolean) {
  return {
    size: "xs" as const,
    variant: isActive ? ("default" as const) : ("outline" as const),
    className: cn("min-h-9 shrink-0 font-normal", !isActive && "border-divider-50"),
  };
}

/** Wraps a chip row: scrollable while space is tight, wrapping once there is room. */
export const FILTER_CHIP_ROW_CLASS = "flex flex-nowrap gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0";
