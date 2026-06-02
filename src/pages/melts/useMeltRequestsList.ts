import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import type { DeniedMeltOp } from "@/generated/client/types.gen";
import { getSearchableContent, matchesRequestFilter, parseCreatedTime } from "./utils";
import type { MeltRequestsFilter, MeltRequestsSortDirection, MeltRequestsSortField, MeltRequestsSortBy } from "./types";

export function useMeltRequestsList(operations: DeniedMeltOp[]) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<MeltRequestsFilter>("all");
  const [sortBy, setSortBy] = useState<MeltRequestsSortBy>("created-desc");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const now = new Date();
  const utcDayBucket = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const filteredOperations = useMemo(() => {
    const filterNow = new Date(utcDayBucket);

    return operations.filter((operation) => {
      if (!matchesRequestFilter(operation, requestFilter, filterNow)) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      return getSearchableContent(operation, intl.locale).includes(normalizedSearchQuery);
    });
  }, [intl.locale, normalizedSearchQuery, operations, requestFilter, utcDayBucket]);

  const sortedOperations = useMemo(
    () =>
      [...filteredOperations].sort((left, right) => {
        let comparison = 0;

        switch (sortBy) {
          case "id-asc":
          case "id-desc":
            comparison = left.id.localeCompare(right.id);
            break;
          case "amount-asc":
          case "amount-desc":
            comparison = left.amount - right.amount;
            break;
          case "created-asc":
          case "created-desc":
            comparison = parseCreatedTime(left.created) - parseCreatedTime(right.created);
            break;
        }

        return sortBy.endsWith("desc") ? -comparison : comparison;
      }),
    [filteredOperations, sortBy]
  );

  const toggleSort = (field: MeltRequestsSortField) => {
    if (sortBy.startsWith(field)) {
      const nextDirection: MeltRequestsSortDirection = sortBy.endsWith("asc") ? "desc" : "asc";
      setSortBy(`${field}-${nextDirection}`);
      return;
    }

    setSortBy(`${field}-asc`);
  };

  const sortOptions = [
    {
      field: "created" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.sort.created",
        defaultMessage: "Created",
      }),
    },
    {
      field: "amount" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.sort.amount",
        defaultMessage: "Amount",
      }),
    },
    {
      field: "id" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.sort.id",
        defaultMessage: "Request ID",
      }),
    },
  ];

  const filterOptions = [
    {
      value: "all" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.filter.all",
        defaultMessage: "All melt requests",
      }),
    },
    {
      value: "today" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.filter.today",
        defaultMessage: "Created today",
      }),
    },
    {
      value: "last-7-days" as const,
      label: intl.formatMessage({
        id: "deniedMeltRequests.filter.last7Days",
        defaultMessage: "Last 7 days",
      }),
    },
  ];

  return {
    searchQuery,
    setSearchQuery,
    requestFilter,
    setRequestFilter,
    sortBy,
    toggleSort,
    sortOptions,
    filterOptions,
    sortedOperations,
    hasActiveFilters: normalizedSearchQuery.length > 0 || requestFilter !== "all",
  };
}
