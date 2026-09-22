import { DatePicker, type DateRange } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RANGES_BY_DIRECTION, type ChartRange, type RangeDirection } from "@/utils/chart-range";
import { formatDateShort } from "@/utils/dates";

const rangeMessages = defineMessages({
  all: { id: "balances.history.range.all", defaultMessage: "All" },
  custom: { id: "balances.history.range.custom", defaultMessage: "Custom" },
  past30d: { id: "balances.history.range.past.30d", defaultMessage: "Last 30d" },
  past90d: { id: "balances.history.range.past.90d", defaultMessage: "Last 90d" },
  next30d: { id: "balances.history.range.future.30d", defaultMessage: "Next 30d" },
  next90d: { id: "balances.history.range.future.90d", defaultMessage: "Next 90d" },
  label: { id: "balances.history.range.label", defaultMessage: "Time range" },
  pickerLabel: { id: "balances.history.range.picker.label", defaultMessage: "Pick a date range" },
});

const RANGE_LABELS: Record<ChartRange, (typeof rangeMessages)[keyof typeof rangeMessages]> = {
  all: rangeMessages.all,
  past30d: rangeMessages.past30d,
  past90d: rangeMessages.past90d,
  next30d: rangeMessages.next30d,
  next90d: rangeMessages.next90d,
  custom: rangeMessages.custom,
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
        {RANGES_BY_DIRECTION[direction].map((range) => (
          <ToggleGroupItem key={range} value={range} className="px-3 whitespace-nowrap">
            {intl.formatMessage(RANGE_LABELS[range])}
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
