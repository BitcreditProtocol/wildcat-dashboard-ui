import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppIcon, Button, Heading } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { LoaderIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { FilterChipRow } from "@/components/FilterChipRow";
import { ListFilters, type FilterGroup } from "@/components/ListFilters";
import { createSortGroup } from "@/components/sort-filter-group";
import { Search as SearchComponent } from "@bitcredit/ui-library";
import { useQuoteList, PAGE_SIZE_OPTIONS, ALL_PAGE_SIZE_VALUE } from "@/hooks/use-quote-list";
import type { QuoteStatus, QuickFilter } from "@/hooks/use-quote-list";
import { filterGroupMessages, getQuoteStatusMessage } from "@/i18n/descriptors";
import { QuoteItemCard } from "./components/QuoteItemCard";
import { QuoteStatusChips } from "./components/QuoteStatusChips";

interface StatusQuotePageProps {
  status?: QuoteStatus;
}

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col gap-1.5 my-2 w-full">
        <Skeleton className="h-4 rounded-lg" />
        <Skeleton className="h-29 rounded-lg mt-1" />
        <Skeleton className="h-29 rounded-lg" />
        <Skeleton className="h-29 rounded-lg" />
        <Skeleton className="h-29 rounded-lg" />
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  const intl = useIntl();

  return (
    <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-800 font-semibold">
        {intl.formatMessage({
          id: "quotes.error.loadQuotes.title",
          defaultMessage: "Failed to load quotes",
        })}
      </div>
      <div className="text-red-600 text-sm">
        {message ||
          intl.formatMessage({
            id: "quotes.error.unknown",
            defaultMessage: "Unknown error occurred",
          })}
      </div>
      <div className="text-xs text-red-500">
        {intl.formatMessage({
          id: "quotes.error.checkApi",
          defaultMessage: "Try again. If the problem continues, contact support.",
        })}
      </div>
    </div>
  );
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const intl = useIntl();
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    quickFilter,
    toggleQuickFilter,
    hasNonDefaultFilters,
    resetFilters,
    itemsPerPage,
    setItemsPerPage,
    quotes,
    totalQuotes,
    usesLegacyFallback,
    effectiveStatusByQuoteId,
    sortedQuotes,
    sortOptions,
    quickFilterOptions,
    hasActiveFilters,
    noQuotesMessage,
    isFetching,
    isFetchingNextPage,
    isLoadingAllPages,
    hasNextPage,
    fetchNextPage,
    isLoading,
    error,
    toggleSort,
  } = useQuoteList(status);

  const errorMessage = error ? ((error as { message?: string }).message ?? String(error)) : undefined;

  const filterGroups: FilterGroup[] = [
    {
      id: "show",
      title: intl.formatMessage(filterGroupMessages.show),
      value: quickFilter,
      options: quickFilterOptions.map((option) => ({ value: option.value, label: option.label })),
      onSelect: (value) => {
        toggleQuickFilter(value as QuickFilter);
      },
    },
    createSortGroup({
      title: intl.formatMessage(filterGroupMessages.sortBy),
      sortBy,
      options: sortOptions,
      onSortChange: toggleSort,
    }),
  ];

  if (!usesLegacyFallback) {
    filterGroups.push({
      id: "rowsPerPage",
      title: intl.formatMessage(filterGroupMessages.rowsPerPage),
      value: String(itemsPerPage),
      columns: 5,
      options: [
        ...PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) })),
        {
          value: ALL_PAGE_SIZE_VALUE,
          label: intl.formatMessage({
            id: "quotes.pagination.all",
            defaultMessage: "All",
          }),
        },
      ],
      onSelect: (value) => {
        setItemsPerPage(value === ALL_PAGE_SIZE_VALUE ? ALL_PAGE_SIZE_VALUE : Number(value));
      },
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage({
              id: "quotes.search.placeholder",
              defaultMessage: "Search by quote ID, bill ID, participant, status, amount, or maturity...",
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
        {totalQuotes > 0 && (
          <div className="text-sm text-muted-foreground">
            {intl.formatMessage(
              {
                id: "quotes.pagination.count",
                defaultMessage: "Showing {loaded} of {total} quotes",
              },
              { loaded: quotes.length, total: totalQuotes }
            )}
          </div>
        )}
      </div>

      <div className="my-4 flex flex-col gap-2">
        <QuoteStatusChips status={status} />
        {filterGroups.map((group) => (
          <FilterChipRow key={group.id} group={group} withLabel={group.id !== "show"} className="hidden lg:flex" />
        ))}
      </div>

      {errorMessage !== undefined && <LoadError message={errorMessage} />}

      {errorMessage === undefined && isLoading && <Loader />}

      {errorMessage === undefined && !isLoading && (
        <>
          <div className="flex items-center justify-center">
            <AppIcon
              icon={LoaderIcon}
              weight="thin"
              className={cn({
                "animate-spin": isFetching || isFetchingNextPage,
                invisible: !isFetching && !isFetchingNextPage,
              })}
            />
          </div>

          {isLoadingAllPages && (
            <div className="text-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "quotes.pagination.loadingAll",
                defaultMessage: "Searching all quotes...",
                description: "Shown while the remaining quote pages are loaded so search and filters cover every quote",
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5 my-2">
            {sortedQuotes.length === 0 && hasActiveFilters && !isLoadingAllPages && (
              <div className="py-2 text-center text-muted-foreground">
                {intl.formatMessage({
                  id: "quotes.search.noMatch",
                  defaultMessage: "No quotes match your search criteria",
                })}
              </div>
            )}
            {sortedQuotes.length === 0 && !hasActiveFilters && <div className="py-2 font-bold">{noQuotesMessage}</div>}
            {sortedQuotes
              .filter((q) => q.id)
              .map((quote) => (
                <div key={quote.id}>
                  <QuoteItemCard
                    quote={quote}
                    effectiveStatus={effectiveStatusByQuoteId.get(quote.id) ?? quote.status}
                    searchQuery={searchQuery}
                  />
                </div>
              ))}
          </div>

          {hasNextPage && !isLoadingAllPages && (
            <div className="flex justify-center px-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full max-w-sm"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? intl.formatMessage({
                      id: "quotes.pagination.loadingMore",
                      defaultMessage: "Loading more...",
                    })
                  : intl.formatMessage({
                      id: "quotes.pagination.loadMore",
                      defaultMessage: "Load more",
                    })}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function PageBody({ status }: { status?: QuoteStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <QuoteList status={status} />
      </div>
    </div>
  );
}

export default function StatusQuotePage({ status }: StatusQuotePageProps) {
  const intl = useIntl();
  const statusLabel = status ? intl.formatMessage(getQuoteStatusMessage(status)) : undefined;
  const pageTitle = status
    ? intl.formatMessage(
        {
          id: "quotes.statusPage.title",
          defaultMessage: "{status} quotes",
        },
        { status: statusLabel }
      )
    : intl.formatMessage({
        id: "quotes.statusPage.titleAll",
        defaultMessage: "All quotes",
      });

  return (
    <>
      <Breadcrumbs
        parents={
          status
            ? [
                <BreadcrumbLink key="quotes" asChild>
                  <Link to="/quotes">
                    {intl.formatMessage({
                      id: "quotes.breadcrumb",
                      defaultMessage: "Quotes",
                    })}
                  </Link>
                </BreadcrumbLink>,
              ]
            : undefined
        }
      >
        {statusLabel ??
          intl.formatMessage({
            id: "quotes.breadcrumb",
            defaultMessage: "Quotes",
          })}
      </Breadcrumbs>

      <Heading as="h1" variant="page" className="mb-6 pt-4">
        {pageTitle}
      </Heading>
      <PageBody status={status} />
    </>
  );
}
