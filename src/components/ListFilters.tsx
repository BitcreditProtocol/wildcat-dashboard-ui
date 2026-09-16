import {
  AppIcon,
  Button,
  cn,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTopBar,
  DrawerTrigger,
  Text,
  VisuallyHidden,
} from "@bitcredit/ui-library";
import { Check, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useIntl } from "react-intl";

export interface FilterGroupOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  value: string;
  options: FilterGroupOption[];
  onSelect: (value: string) => void;
  columns?: 2 | 5;
  selectedIcon?: ReactNode;
}

const COLUMN_LAYOUT = {
  2: { grid: "grid-cols-2", size: "sm" },
  5: { grid: "grid-cols-5", size: "xs" },
} as const;

export function FilterGroupSection({ group }: { group: FilterGroup }) {
  const layout = COLUMN_LAYOUT[group.columns ?? 2];

  return (
    <section className="flex flex-col gap-3">
      <Text variant="label" as="h3">
        {group.title}
      </Text>
      <div className={cn("grid gap-3", layout.grid)}>
        {group.options.map((option) => {
          const isSelected = option.value === group.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size={layout.size}
              aria-pressed={isSelected}
              onClick={() => group.onSelect(option.value)}
              className={cn("min-h-11 gap-2 whitespace-normal text-center font-normal leading-tight", !isSelected && "border-divider-50")}
            >
              {option.label}
              {isSelected ? (group.selectedIcon ?? <AppIcon icon={Check} size="sm" />) : null}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

interface ListFiltersProps {
  groups: FilterGroup[];
  hasActiveFilters?: boolean;
  className?: string;
  onReset?: () => void;
  canReset?: boolean;
}

export function ListFilters({ groups, hasActiveFilters = false, className, onReset, canReset = true }: ListFiltersProps) {
  const intl = useIntl();
  const title = intl.formatMessage({
    id: "listFilters.title",
    defaultMessage: "Filters",
  });

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("relative h-11 w-11 shrink-0 p-0", className)}
          aria-label={title}
          title={title}
        >
          <AppIcon icon={SlidersHorizontal} size="sm" />
          {hasActiveFilters && <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-text-300" />}
        </Button>
      </DrawerTrigger>
      <DrawerContent innerClassName="flex flex-col gap-6 overflow-y-auto px-6 pb-8">
        <DrawerTopBar title={title} />
        <VisuallyHidden asChild>
          <DrawerDescription>
            {intl.formatMessage({
              id: "listFilters.description",
              defaultMessage: "Choose what the list shows, how it is sorted and how many rows it loads.",
            })}
          </DrawerDescription>
        </VisuallyHidden>
        {groups.map((group) => (
          <FilterGroupSection key={group.id} group={group} />
        ))}
        {onReset && (
          <Button type="button" variant="outline" size="sm" className="min-h-11 w-full" onClick={onReset} disabled={!canReset}>
            {intl.formatMessage({
              id: "listFilters.reset",
              defaultMessage: "Reset all",
            })}
          </Button>
        )}
      </DrawerContent>
    </Drawer>
  );
}
