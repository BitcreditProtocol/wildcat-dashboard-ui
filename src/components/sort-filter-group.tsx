import { AppIcon } from "@bitcredit/ui-library";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { FilterGroup } from "./ListFilters";

/**
 * Builds the sorting group. Selecting the field that is already sorted on flips the
 * direction, which is what the arrow on the selected option shows.
 */
export function createSortGroup<T extends string>({
  title,
  sortBy,
  options,
  onSortChange,
}: {
  title: string;
  sortBy: string;
  options: { field: T; label: string }[];
  onSortChange: (field: T) => void;
}): FilterGroup {
  return {
    id: "sort",
    title,
    value: options.find((option) => sortBy.startsWith(`${option.field}-`))?.field ?? "",
    options: options.map((option) => ({ value: option.field, label: option.label })),
    onSelect: (value) => {
      onSortChange(value as T);
    },
    selectedIcon: <AppIcon icon={sortBy.endsWith("asc") ? ArrowUp : ArrowDown} size="sm" />,
  };
}
