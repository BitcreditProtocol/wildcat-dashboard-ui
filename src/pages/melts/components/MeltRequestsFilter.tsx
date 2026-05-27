import { Search as SearchComponent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { SortButtons } from "@/components/SortButtons";
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
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
        <Select value={requestFilter} onValueChange={(value) => onRequestFilterChange(value as MeltRequestsFilter)}>
          <SelectTrigger className="h-11 w-full sm:min-w-0 sm:max-w-64" label="">
            <SelectValue
              placeholder={intl.formatMessage({
                id: "deniedMeltRequests.filter.label",
                defaultMessage: "Filter",
              })}
            />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SortButtons sortBy={sortBy} onSortChange={onSortChange} options={sortOptions} />
    </div>
  );
}
