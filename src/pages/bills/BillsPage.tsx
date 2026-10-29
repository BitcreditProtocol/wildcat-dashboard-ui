import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterChipRow } from "@/components/FilterChipRow";
import { ListFilters, type FilterGroup } from "@/components/ListFilters";
import { createSortGroup } from "@/components/sort-filter-group";
import { Heading, Search as SearchComponent, Skeleton, Text } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";
import { type BillFilter, useBillList } from "@/hooks/use-bill-list";
import { filterGroupMessages } from "@/i18n/descriptors";
import { BillItemCard } from "./components/BillItemCard";

const messages = defineMessages<{
  title: Record<string, never>;
  searchPlaceholder: Record<string, never>;
  count: { shown: number; total: number };
  empty: Record<string, never>;
  noMatch: Record<string, never>;
  error: Record<string, never>;
}>({
  title: { id: "bills.page.title", defaultMessage: "Bills" },
  searchPlaceholder: {
    id: "bills.search.placeholder",
    defaultMessage: "Search by bill ID, participant, amount, or maturity...",
  },
  count: { id: "bills.count", defaultMessage: "Showing {shown} of {total} bills" },
  empty: { id: "bills.empty", defaultMessage: "No bills available." },
  noMatch: { id: "bills.search.noMatch", defaultMessage: "No bills match your search criteria" },
  error: { id: "bills.error", defaultMessage: "Failed to load bills" },
});

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 my-2">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}

function PageBody() {
  const intl = useIntl();
  const {
    searchQuery,
    setSearchQuery,
    billFilter,
    toggleBillFilter,
    sortBy,
    toggleSort,
    filterOptions,
    sortOptions,
    hasNonDefaultFilters,
    resetFilters,
    bills,
    sortedBills,
    hasActiveFilters,
    isLoading,
    error,
  } = useBillList();

  const filterGroups: FilterGroup[] = [
    {
      id: "show",
      title: intl.formatMessage(filterGroupMessages.show),
      value: billFilter,
      options: filterOptions.map((option) => ({ value: option.value, label: option.label })),
      onSelect: (value) => {
        toggleBillFilter(value as BillFilter);
      },
    },
    createSortGroup({
      title: intl.formatMessage(filterGroupMessages.sortBy),
      sortBy,
      options: sortOptions,
      onSortChange: toggleSort,
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage(messages.searchPlaceholder)}
            onSearch={setSearchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
          <ListFilters
            groups={filterGroups}
            hasActiveFilters={hasNonDefaultFilters}
            onReset={resetFilters}
            canReset={hasNonDefaultFilters}
            className="lg:hidden"
          />
        </div>
        {bills.length > 0 && (
          <Text variant="bodyMuted">{intl.formatMessage(messages.count, { shown: sortedBills.length, total: bills.length })}</Text>
        )}
      </div>

      {/* A row per group, once there is room for them. Narrower screens reach the same
          groups through the filters drawer next to the search instead. */}
      <div className="flex flex-col gap-2">
        {filterGroups.map((group) => (
          <FilterChipRow key={group.id} group={group} withLabel={group.id !== "show"} className="hidden lg:flex" />
        ))}
      </div>

      {error && <Text variant="bodyMuted">{intl.formatMessage(messages.error)}</Text>}

      {isLoading && <Loader />}

      {!isLoading && !error && sortedBills.length === 0 && (
        <Text variant="bodyMuted">{intl.formatMessage(hasActiveFilters ? messages.noMatch : messages.empty)}</Text>
      )}

      <div className="flex flex-col gap-1.5">
        {sortedBills.map((bill) => (
          <BillItemCard key={bill.id} bill={bill} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  );
}

export default function BillsPage() {
  const intl = useIntl();

  return (
    <>
      <Breadcrumbs>{intl.formatMessage(messages.title)}</Breadcrumbs>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        {intl.formatMessage(messages.title)}
      </Heading>
      <PageBody />
    </>
  );
}
