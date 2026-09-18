import { DatePicker, type DateRange } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CHART_RANGES, type ChartRange, type RangeDirection } from "@/utils/chart-range";
import { formatDateShort } from "@/utils/dates";

const rangeMessages = defineMessages({
  all: { id: "balances.history.range.all", defaultMessage: "All" },
  custom: { id: "balances.history.range.custom", defaultMessage: "Custom" },
  past30d: { id: "balances.history.range.past.30d", defaultMessage: "30d" },
  past90d: { id: "balances.history.range.past.90d", defaultMessage: "90d" },
  future30d: { id: "balances.history.range.future.30d", defaultMessage: "Next 30d" },
  future90d: { id: "balances.history.range.future.90d", defaultMessage: "Next 90d" },
  label: { id: "balances.history.range.label", defaultMessage: "Time range" },
  pickerLabel: { id: "balances.history.range.picker.label", defaultMessage: "Pick a date range" },
});

type RangeMessage = (typeof rangeMessages)[keyof typeof rangeMessages];

const RANGE_LABELS: Record<RangeDirection, Record<ChartRange, RangeMessage>> = {
  past: { all: rangeMessages.all, "30d": rangeMessages.past30d, "90d": rangeMessages.past90d, custom: rangeMessages.custom },
  future: { all: rangeMessages.all, "30d": rangeMessages.future30d, "90d": rangeMessages.future90d, custom: rangeMessages.custom },
};

interface ChartRangeToggleProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  direction: RangeDirection;
  picked: DateRange | undefined;
  onPickedChange: (picked: DateRange | undefined) => void;
}

export function ChartRangeToggle({ value, onChange, direction, picked, onPickedChange }: ChartRangeToggleProps) {
  const intl = useIntl();
  const customLabel =
    value === "custom" && picked?.from && picked.to
      ? `${formatDateShort(picked.from, intl.locale)} – ${formatDateShort(picked.to, intl.locale)}`
      : intl.formatMessage(rangeMessages.custom);

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={value}
        onValueChange={(next) => onChange((next || value) as ChartRange)}
        aria-label={intl.formatMessage(rangeMessages.label)}
      >
        {CHART_RANGES.filter((range) => range !== "custom").map((range) => (
          <ToggleGroupItem key={range} value={range} className="px-3 whitespace-nowrap">
            {intl.formatMessage(RANGE_LABELS[direction][range])}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <DatePicker
        mode="range"
        label={intl.formatMessage(rangeMessages.pickerLabel)}
        value={picked}
        onChange={(next) => {
          onPickedChange(next);
          onChange(next?.from ? "custom" : "all");
        }}
        isFutureNavigationDisabled={direction === "past"}
        shouldDisplayDateFilter={false}
        customComponent={
          <ToggleGroup type="single" size="sm" variant="outline" value={value === "custom" ? "custom" : ""}>
            <ToggleGroupItem value="custom" className="px-3 whitespace-nowrap">
              {customLabel}
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />
    </div>
  );
}
