import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listKeysetInfosInfiniteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { Heading, Search as SearchComponent } from "@bitcredit/ui-library";
import { FilterChipRow } from "@/components/FilterChipRow";
import { ListFilters, type FilterGroup } from "@/components/ListFilters";
import { createSortGroup } from "@/components/sort-filter-group";
import { filterGroupMessages } from "@/i18n/descriptors";
import { KeysetLoader } from "@/pages/keysets/components/KeysetLoader";
import { KeysetCard } from "@/pages/keysets/components/KeysetCard";
import { useKeysetFiltering } from "@/hooks/use-keyset-filtering";
import { getNextKeysetPageOffset, getPageKeysets } from "@/utils/keyset-pages";
import * as React from "react";

const KEYSETS_POLL_INTERVAL_MS = 10_000;
const KEYSETS_PAGE_SIZE = 100;

function PageBody() {
  const intl = useIntl();
  const {
    data,
    isLoading: keysetsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...listKeysetInfosInfiniteOptions({ query: { limit: KEYSETS_PAGE_SIZE } }),
    refetchInterval: KEYSETS_POLL_INTERVAL_MS,
    initialPageParam: 0,
    getNextPageParam: getNextKeysetPageOffset,
  });

  const keysets = React.useMemo(() => data?.pages.flatMap((page) => getPageKeysets(page)) ?? [], [data]);
  const isLoadingAllPages = hasNextPage || isFetchingNextPage;

  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const {
    searchQuery,
    setSearchQuery,
    keysetFilter,
    toggleKeysetFilter,
    hasNonDefaultFilters,
    resetFilters,
    sortBy,
    toggleSort,
    sortedKeysets,
    noExpiryText,
    sortOptions,
    filterOptions,
  } = useKeysetFiltering(keysets);

  if (keysetsLoading) {
    return <KeysetLoader />;
  }

  if (!keysets || keysets.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        <FormattedMessage id="keysets.empty" defaultMessage="No keysets found" />
      </div>
    );
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "show",
      title: intl.formatMessage(filterGroupMessages.show),
      value: keysetFilter,
      options: filterOptions.map((option) => ({ value: option.value, label: option.label })),
      onSelect: (value) => {
        toggleKeysetFilter(value as typeof keysetFilter);
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchComponent
          value={searchQuery}
          className="flex-1 max-w-md"
          placeholder={intl.formatMessage({
            id: "keysets.search.placeholder",
            defaultMessage: "Search by keyset ID, currency, maturity date, or status...",
          })}
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

      <div className="flex flex-col gap-2">
        {filterGroups.map((group) => (
          <FilterChipRow key={group.id} group={group} withLabel={group.id !== "show"} className="hidden lg:flex" />
        ))}
      </div>

      {isLoadingAllPages && (
        <div className="text-center text-sm text-muted-foreground">
          <FormattedMessage
            id="keysets.pagination.loadingAll"
            defaultMessage="Loading all keysets..."
            description="Shown while the remaining keyset pages are loaded so search and filters cover every keyset"
          />
        </div>
      )}

      {sortedKeysets.length === 0 && !isLoadingAllPages ? (
        <div className="p-4 text-muted-foreground text-center">
          <FormattedMessage id="keysets.search.noMatch" defaultMessage="No keysets match your search criteria" />
        </div>
      ) : (
        <>
          {sortedKeysets.map((keyset) => (
            <KeysetCard key={keyset.id} keyset={keyset} searchQuery={searchQuery} noExpiryText={noExpiryText} />
          ))}
        </>
      )}
    </div>
  );
}

export default function KeysetsPage() {
  return (
    <>
      <Breadcrumbs>
        <FormattedMessage id="keysets.page.title" defaultMessage="Keysets" />
      </Breadcrumbs>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        <FormattedMessage id="keysets.page.title" defaultMessage="Keysets" />
      </Heading>
      <PageBody />
    </>
  );
}
