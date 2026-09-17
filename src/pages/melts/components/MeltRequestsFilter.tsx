import { Search as SearchComponent } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { ListFilters, type FilterGroup } from "@/components/ListFilters";
import { createSortGroup } from "@/components/sort-filter-group";
import { filterGroupMessages } from "@/i18n/descriptors";
import type { MeltRequestsFilter, MeltRequestsSortField } from "../types";

interface MeltRequestsControlsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  requestFilter: MeltRequestsFilter;
  onRequestFilterChange: (value: MeltRequestsFilter) => void;
  sortBy: string;
  onSortChange: (field: MeltRequestsSortField) => void;
  sortOptions: { field: MeltRequestsSortField; label: string }[];
  filterOptions: { value: MeltRequestsFilter; label: string }[];
}

export function MeltRequestsFilter({
  searchQuery,
  onSearchQueryChange,
  requestFilter,
  onRequestFilterChange,
  sortBy,
  onSortChange,
  sortOptions,
  filterOptions,
}: MeltRequestsControlsProps) {
  const intl = useIntl();

  const filterGroups: FilterGroup[] = [
    {
      id: "show",
      title: intl.formatMessage(filterGroupMessages.show),
      value: requestFilter,
      options: filterOptions.map((option) => ({ value: option.value, label: option.label })),
      onSelect: (value) => {
        onRequestFilterChange(value as MeltRequestsFilter);
      },
    },
    createSortGroup({
      title: intl.formatMessage(filterGroupMessages.sortBy),
      sortBy,
      options: sortOptions,
      onSortChange,
    }),
  ];

  return (
    <div className="flex items-center gap-3">
      <SearchComponent
        value={searchQuery}
        className="flex-1 max-w-md"
        placeholder={intl.formatMessage({
          id: "deniedMeltRequests.search.placeholder",
          defaultMessage: "Search by request ID, amount, or created date...",
        })}
        onSearch={onSearchQueryChange}
        onChange={onSearchQueryChange}
        size="sm"
      />
      <ListFilters groups={filterGroups} hasActiveFilters={requestFilter !== "all"} />
    </div>
  );
}
