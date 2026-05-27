import { useMemo } from "react";
import { Heading } from "@bitcredit/ui-library";
import { useQuery } from "@tanstack/react-query";
import { FormattedMessage } from "react-intl";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { listDeniedMeltopsOptions } from "@/generated/client/@tanstack/react-query.gen";
import { DENIED_MELT_REQUESTS_POLL_INTERVAL_MS } from "./constants";
import { DeleteMeltRequestConfirmation } from "./components/DeleteMeltRequestConfirmation";
import { MeltRequestsFilter } from "./components/MeltRequestsFilter.tsx";
import { MeltRequestsSummary } from "./components/MeltRequestsSummary";
import { MeltRequestsTable } from "./components/MeltRequestsTable";
import { MeltRequestsEmptyState, MeltRequestsErrorState, MeltRequestsLoader } from "./components/MeltRequestsStates";
import { useDeleteDeniedMeltRequest } from "./useDeleteDeniedMeltRequest";
import { useMeltRequestsList } from "./useMeltRequestsList";

function PageBody() {
  const {
    data: deniedMeltopsResponse,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    ...listDeniedMeltopsOptions(),
    refetchInterval: DENIED_MELT_REQUESTS_POLL_INTERVAL_MS,
  });

  const operations = useMemo(() => deniedMeltopsResponse?.ops ?? [], [deniedMeltopsResponse?.ops]);
  const {
    searchQuery,
    setSearchQuery,
    requestFilter,
    setRequestFilter,
    sortBy,
    toggleSort,
    sortOptions,
    filterOptions,
    sortedOperations,
    hasActiveFilters,
  } = useMeltRequestsList(operations);
  const { deleteTarget, setDeleteTarget, confirmDelete, closeDeleteConfirmation, deletingId, isDeleting } = useDeleteDeniedMeltRequest();

  if (isLoading) {
    return <MeltRequestsLoader />;
  }

  if (isError) {
    return <MeltRequestsErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (operations.length === 0) {
    return <MeltRequestsEmptyState />;
  }

  return (
    <div className="space-y-4">
      <MeltRequestsFilter
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        requestFilter={requestFilter}
        onRequestFilterChange={setRequestFilter}
        sortBy={sortBy}
        onSortChange={toggleSort}
        sortOptions={sortOptions}
        filterOptions={filterOptions}
      />

      <MeltRequestsSummary
        hasActiveFilters={hasActiveFilters}
        shownCount={sortedOperations.length}
        totalCount={operations.length}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />

      {sortedOperations.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          <FormattedMessage id="deniedMeltRequests.search.noMatch" defaultMessage="No melt requests match your filters" />
        </div>
      ) : (
        <MeltRequestsTable operations={sortedOperations} isFetching={isFetching} deletingId={deletingId} onDelete={setDeleteTarget} />
      )}

      <DeleteMeltRequestConfirmation
        operation={deleteTarget}
        open={deleteTarget !== null}
        isPending={isDeleting}
        onOpenChange={closeDeleteConfirmation}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default function MeltRequestsPage() {
  return (
    <>
      <Breadcrumbs>
        <FormattedMessage id="deniedMeltRequests.page.title" defaultMessage="Melt requests" />
      </Breadcrumbs>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        <FormattedMessage id="deniedMeltRequests.page.title" defaultMessage="Melt requests" />
      </Heading>
      <PageBody />
    </>
  );
}
