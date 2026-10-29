import { Button, cn, Text } from "@bitcredit/ui-library";
import { FILTER_CHIP_ROW_CLASS, filterChipProps } from "./filter-chip";
import type { FilterGroup } from "./ListFilters";

interface FilterChipRowProps {
  group: FilterGroup;
  withLabel?: boolean;
  className?: string;
}

export function FilterChipRow({ group, withLabel = false, className }: FilterChipRowProps) {
  return (
    <div className={cn(FILTER_CHIP_ROW_CLASS, "items-center", className)} role="group" aria-label={group.title}>
      {withLabel && (
        <Text variant="label" className="shrink-0">
          {group.title}
        </Text>
      )}
      {group.options.map((option) => {
        const isActive = option.value === group.value;
        return (
          <Button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              group.onSelect(option.value);
            }}
            {...filterChipProps(isActive)}
          >
            {option.label}
            {isActive ? group.selectedIcon : null}
          </Button>
        );
      })}
    </div>
  );
}
