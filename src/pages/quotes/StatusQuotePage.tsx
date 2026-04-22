import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@bitcredit/ui-library";
import { Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bitcredit/ui-library";
import { LoaderIcon } from "lucide-react";
import { Link } from "react-router";
import { formatStatusLabel } from "@/utils/strings";
import { cn } from "@/lib/utils";
import { useIntl } from "react-intl";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { SortButtons } from "@/components/SortButtons";
import { Search as SearchComponent } from "@bitcredit/ui-library";
import { useQuoteList, PAGE_SIZE_OPTIONS, ALL_PAGE_SIZE_VALUE } from "@/hooks/use-quote-list";
import type { QuoteStatus, QuickFilter } from "@/hooks/use-quote-list";
import { QuoteItemCard } from "./components/QuoteItemCard";

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

function QuoteList({ status }: { status?: QuoteStatus }) {
  const intl = useIntl();
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    quickFilter,
    setQuickFilter,
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
    hasNextPage,
    fetchNextPage,
    isLoading,
    error,
    toggleSort,
  } = useQuoteList(status);

  if (error) {
    const errorMessage = (error as { message?: string }).message ?? String(error);
    return (
      <div className="flex flex-col gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">
          {intl.formatMessage({
            id: "quotes.error.loadQuotes.title",
            defaultMessage: "Failed to load quotes",
          })}
        </div>
        <div className="text-red-600 text-sm">
          {errorMessage ||
            intl.formatMessage({
              id: "quotes.error.unknown",
              defaultMessage: "Unknown error occurred",
            })}
        </div>
        <div className="text-xs text-red-500">
          {intl.formatMessage({
            id: "quotes.error.checkApi",
            defaultMessage: "Check if the API server is running and accessible",
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage({
              id: "quotes.search.placeholder",
              defaultMessage: "Search by quote ID, participant, status, amount, or maturity...",
            })}
            onSearch={setSearchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
          <Select value={quickFilter} onValueChange={(value) => setQuickFilter(value as QuickFilter)}>
            <SelectTrigger className="h-11 w-full sm:w-1/3 sm:min-w-0 sm:max-w-64">
              <SelectValue
                placeholder={intl.formatMessage({
                  id: "quotes.filter.label",
                  defaultMessage: "Quick filter",
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {quickFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SortButtons sortBy={sortBy} onSortChange={toggleSort} options={sortOptions} />
      </div>

      <div className="flex items-center justify-center">
        <LoaderIcon
          className={cn("stroke-1", {
            "animate-spin": (isFetching || isFetchingNextPage) && !isLoading,
            invisible: (!isFetching && !isFetchingNextPage) || isLoading,
          })}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        {!usesLegacyFallback && (
          <div className="flex items-center gap-2">
            <span>
              {intl.formatMessage({
                id: "quotes.pagination.itemsPerPage",
                defaultMessage: "Items per page",
              })}
            </span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => setItemsPerPage(value === ALL_PAGE_SIZE_VALUE ? ALL_PAGE_SIZE_VALUE : Number(value))}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
                <SelectItem value={ALL_PAGE_SIZE_VALUE}>
                  {intl.formatMessage({
                    id: "quotes.pagination.all",
                    defaultMessage: "All",
                  })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {totalQuotes > 0 && (
          <div>
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

      <div className="flex flex-col gap-1.5 my-2">
        {sortedQuotes.length === 0 && hasActiveFilters && (
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

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
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
  );
}

function PageBody({ status }: { status?: QuoteStatus }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <QuoteList status={status} />
      </div>
    </div>
  );
}

export default function StatusQuotePage({ status }: StatusQuotePageProps) {
  const intl = useIntl();
  const statusLabel = status
    ? intl.formatMessage({
        id: `quote.status.${status}`,
        defaultMessage: formatStatusLabel(status),
      })
    : undefined;
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

      <PageTitle>{pageTitle}</PageTitle>
      <PageBody status={status} />
    </>
  );
}
