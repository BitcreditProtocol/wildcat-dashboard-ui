import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listKeysetInfosInfiniteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { Heading, Search as SearchComponent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bitcredit/ui-library";
import { SortButtons } from "@/components/SortButtons";
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
    setKeysetFilter,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
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
          <Select value={keysetFilter} onValueChange={(value) => setKeysetFilter(value as typeof keysetFilter)}>
            <SelectTrigger className="h-11 w-full sm:min-w-0 sm:max-w-64" label="">
              <SelectValue
                placeholder={intl.formatMessage({
                  id: "keysets.filter.label",
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
        <SortButtons sortBy={sortBy} onSortChange={toggleSort} options={sortOptions} />
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
