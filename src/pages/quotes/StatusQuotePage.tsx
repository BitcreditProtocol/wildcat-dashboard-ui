import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppIcon, Button, Heading } from "@bitcredit/ui-library";
import { Skeleton } from "@bitcredit/ui-library";
import { LoaderIcon, X } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router";
import { cn } from "@bitcredit/ui-library";
import { useEffect } from "react";
import { defineMessages, useIntl } from "react-intl";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { ListFilters, type FilterGroup } from "@/components/ListFilters";
import { createSortGroup } from "@/components/sort-filter-group";
import { Search as SearchComponent } from "@bitcredit/ui-library";
import { useQuoteList, PAGE_SIZE_OPTIONS, ALL_PAGE_SIZE_VALUE, DEFAULT_SORT_BY, PAGE_SIZE } from "@/hooks/use-quote-list";
import type { QuoteStatus, QuickFilter } from "@/hooks/use-quote-list";
import { filterGroupMessages, getQuoteStatusMessage } from "@/i18n/descriptors";
import { QuoteStatusTabs } from "./components/QuoteStatusTabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { filterChipProps } from "@/components/filter-chip";
import { QuoteInboxTable } from "./components/QuoteInboxTable";
import { PartyExposureBand } from "./components/PartyExposure";
import { billApplicant, billPayer } from "./quote-parties";

interface StatusQuotePageProps {
  status?: QuoteStatus;
}

const viewMessages = defineMessages({
  title: { id: "quotes.view.title", defaultMessage: "View", description: "Toggle choosing a flat or grouped quote list" },
  filters: {
    id: "quotes.toolbar.filters",
    defaultMessage: "Filters",
    description: "Button opening payment filters, sorting and page size",
  },
  needsAction: {
    id: "quotes.toolbar.needsAction",
    defaultMessage: "Needs your action",
    description: "Toggle showing only pending quotes whose next step is the Mint operator's",
  },
  removeFilter: { id: "quotes.toolbar.removeFilter", defaultMessage: "Remove filter", description: "Clear the active quick filter" },
  list: { id: "quotes.view.list", defaultMessage: "List", description: "One row per quote" },
  applicant: { id: "quotes.view.applicant", defaultMessage: "By applicant", description: "Quotes grouped under their applicant" },
});

const countMessages = defineMessages({
  matches: {
    id: "quotes.search.matchCount",
    defaultMessage: "{matches, plural, one {# match} other {# matches}} among {searched} quotes",
    description: "Search or filter result count after every quote was loaded and checked",
  },
  matchesSoFar: {
    id: "quotes.search.matchCountSoFar",
    defaultMessage: "{matches, plural, one {# match} other {# matches}} among {searched} of {total} quotes loaded so far",
    description: "Search or filter result count while some quotes are not loaded yet, so they were not checked",
  },
});

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col gap-1.5 my-2 w-full">
        <Skeleton className="h-9 rounded-lg" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-lg" />
        ))}
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

/** An empty parameter is no filter: Wildcat rejects an empty node id. */
function partyParam(params: URLSearchParams, key: "applicant" | "payer"): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : value;
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const intl = useIntl();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const applicantId = partyParam(params, "applicant");
  const payerId = applicantId === undefined ? partyParam(params, "payer") : undefined;
  const view = params.get("view") === "applicant" ? "applicant" : "list";
  const partyFilter =
    applicantId !== undefined
      ? { role: "applicant" as const, nodeId: applicantId }
      : payerId !== undefined
        ? { role: "payer" as const, nodeId: payerId }
        : undefined;
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    quickFilter,
    setQuickFilter,
    toggleQuickFilter,
    hasNonDefaultFilters,
    resetFilters,
    itemsPerPage,
    setItemsPerPage,
    quotes,
    totalQuotes,
    usesLegacyFallback,
    effectiveStatusByQuoteId,
    quoteDetailsById,
    failedQuoteDetailIds,
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
  } = useQuoteList(status, { applicantId, payerId });

  // The filtered party's name comes from any of its loaded bills; the band shows the node id until then.
  const partyName = (() => {
    for (const details of quoteDetailsById.values()) {
      if (!details) continue;
      if (applicantId !== undefined) {
        const applicant = billApplicant(details.bill);
        if (applicant?.nodeId === applicantId) return applicant.name;
      } else if (payerId !== undefined && billPayer(details.bill).nodeId === payerId) {
        return billPayer(details.bill).name;
      }
    }
    return undefined;
  })();
  // Carried across status pages. One party filter at a time: an applicant filter replaces a payer one.
  const partyParams = new URLSearchParams();
  if (applicantId !== undefined) partyParams.set("applicant", applicantId);
  if (payerId !== undefined) partyParams.set("payer", payerId);
  const viewParam = params.get("view");
  if (viewParam !== null) partyParams.set("view", viewParam);
  const clearPartyParams = new URLSearchParams(partyParams);
  clearPartyParams.delete("applicant");
  clearPartyParams.delete("payer");
  const clearPartyTo = `${location.pathname}${clearPartyParams.size > 0 ? `?${clearPartyParams}` : ""}`;

  const errorMessage = error ? ((error as { message?: string }).message ?? String(error)) : undefined;
  // A search or filter counts matches among loaded quotes only; unloaded pages are never implied to be searched.
  const matchMessage = !hasNextPage && quotes.length >= totalQuotes ? countMessages.matches : countMessages.matchesSoFar;
  const countLabel = hasActiveFilters
    ? intl.formatMessage(matchMessage, { matches: sortedQuotes.length, searched: quotes.length, total: totalQuotes })
    : intl.formatMessage(
        {
          id: "quotes.pagination.count",
          defaultMessage: "Showing {loaded} of {total} quotes",
        },
        { loaded: sortedQuotes.length, total: totalQuotes }
      );

  const filterGroups: FilterGroup[] = [
    {
      id: "show",
      title: intl.formatMessage(filterGroupMessages.show),
      value: quickFilter,
      // "Needs your action" has its own toggle in the toolbar.
      options: quickFilterOptions
        .filter((option) => option.value !== "needs-action")
        .map((option) => ({ value: option.value, label: option.label })),
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

  // Only pending quotes can wait on the operator's decision; elsewhere the toggle would only ever empty the list.
  const needsActionAvailable = status === undefined || status === "Pending";
  useEffect(() => {
    if (!needsActionAvailable && quickFilter === "needs-action") setQuickFilter("all");
  }, [needsActionAvailable, quickFilter, setQuickFilter]);

  const activeDrawerFilter =
    quickFilter === "all" || quickFilter === "needs-action" ? undefined : quickFilterOptions.find((option) => option.value === quickFilter);

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
      <QuoteStatusTabs status={status} search={partyParams.size > 0 ? `?${partyParams}` : ""} />

      {/* One toolbar: find, the one queue that matters most, how to see it, and everything else behind Filters. */}
      <div className="mt-4 mb-3 flex flex-wrap items-center gap-2">
        <SearchComponent
          value={searchQuery}
          className="w-full xl:w-auto xl:max-w-md xl:flex-1"
          placeholder={intl.formatMessage({
            id: "quotes.search.placeholder",
            defaultMessage: "Search by quote ID, bill ID, participant, status, amount, or maturity...",
          })}
          onSearch={setSearchQuery}
          onChange={setSearchQuery}
          size="sm"
        />
        {needsActionAvailable && (
          <Button
            type="button"
            aria-pressed={quickFilter === "needs-action"}
            onClick={() => toggleQuickFilter("needs-action")}
            {...filterChipProps(quickFilter === "needs-action")}
            className={cn(filterChipProps(quickFilter === "needs-action").className, "min-h-11")}
          >
            {intl.formatMessage(viewMessages.needsAction)}
          </Button>
        )}
        {applicantId === undefined && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            aria-label={intl.formatMessage(viewMessages.title)}
            onValueChange={(value) => {
              if (value === "") return;
              const next = new URLSearchParams(params);
              if (value === "applicant") next.set("view", "applicant");
              else next.delete("view");
              setParams(next, { replace: true });
            }}
          >
            <ToggleGroupItem value="list" className="h-11 flex-none px-3.5 text-xs whitespace-nowrap">
              {intl.formatMessage(viewMessages.list)}
            </ToggleGroupItem>
            <ToggleGroupItem value="applicant" className="h-11 flex-none px-3.5 text-xs whitespace-nowrap">
              {intl.formatMessage(viewMessages.applicant)}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        <ListFilters
          groups={filterGroups}
          label={intl.formatMessage(viewMessages.filters)}
          // The dot marks what the drawer holds: sorting, page size and its own filters.
          hasActiveFilters={sortBy !== DEFAULT_SORT_BY || itemsPerPage !== PAGE_SIZE || activeDrawerFilter !== undefined}
          onReset={resetFilters}
          canReset={hasNonDefaultFilters}
        />
        {activeDrawerFilter !== undefined && (
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="min-h-9 gap-1 font-normal"
            onClick={() => toggleQuickFilter(activeDrawerFilter.value)}
          >
            {activeDrawerFilter.label}
            <X className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{intl.formatMessage(viewMessages.removeFilter)}</span>
          </Button>
        )}
        {totalQuotes > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            {/* Background refreshes show here, beside the count, instead of reserving a row above the list. */}
            <AppIcon
              icon={LoaderIcon}
              size="sm"
              weight="thin"
              aria-hidden="true"
              className={cn({ "animate-spin": isFetching || isFetchingNextPage, invisible: !isFetching && !isFetchingNextPage })}
            />
            {countLabel}
          </div>
        )}
      </div>

      {partyFilter !== undefined && (
        <div className="mb-4">
          <PartyExposureBand
            key={partyFilter.nodeId}
            role={partyFilter.role}
            nodeId={partyFilter.nodeId}
            name={partyName}
            clearTo={clearPartyTo}
          />
        </div>
      )}

      {errorMessage !== undefined && <LoadError message={errorMessage} />}

      {errorMessage === undefined && isLoading && <Loader />}

      {errorMessage === undefined && !isLoading && (
        <>
          {isLoadingAllPages && (
            <div className="text-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "quotes.pagination.loadingAll",
                defaultMessage: "Searching all quotes...",
                description: "Shown while the remaining quote pages are loaded so search and filters cover every quote",
              })}
            </div>
          )}

          <div className="my-2 flex flex-col gap-2">
            {sortedQuotes.length === 0 && hasActiveFilters && !isLoadingAllPages && (
              <div className="py-2 text-center text-muted-foreground">
                {intl.formatMessage({
                  id: "quotes.search.noMatch",
                  defaultMessage: "No quotes match your search criteria",
                })}
              </div>
            )}
            {sortedQuotes.length === 0 && !hasActiveFilters && <div className="py-2 font-bold">{noQuotesMessage}</div>}
            {sortedQuotes.length > 0 && (
              <QuoteInboxTable
                rows={sortedQuotes
                  .filter((quote) => quote.id)
                  .map((quote) => ({
                    quote,
                    effectiveStatus: effectiveStatusByQuoteId.get(quote.id) ?? quote.status,
                    details: quoteDetailsById.get(quote.id),
                    detailsFailed: failedQuoteDetailIds.has(quote.id),
                  }))}
                grouped={view === "applicant" && applicantId === undefined}
                singleApplicant={applicantId !== undefined}
                searchQuery={searchQuery}
                sortBy={sortBy}
                onSort={toggleSort}
              />
            )}
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
