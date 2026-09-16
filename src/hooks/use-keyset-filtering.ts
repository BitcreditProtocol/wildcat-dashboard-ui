import { useState } from "react";
import type { KeySetInfo } from "@/generated/client/types.gen";
import { useIntl } from "react-intl";

type SortField = "maturity" | "status" | "currency";
type SortDirection = "asc" | "desc";
type SortBy = `${SortField}-${SortDirection}`;

export type KeysetFilter = "all" | "active" | "inactive" | "expired" | "no-expiry";

export const DEFAULT_KEYSET_FILTER: KeysetFilter = "all";
export const DEFAULT_KEYSET_SORT: SortBy = "maturity-asc";

export function useKeysetFiltering(keysets: KeySetInfo[]) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>(DEFAULT_KEYSET_SORT);
  const [keysetFilter, setKeysetFilter] = useState<KeysetFilter>(DEFAULT_KEYSET_FILTER);

  const now = new Date();

  const noExpiryText = intl.formatMessage({
    id: "keysets.noExpiry",
    defaultMessage: "No expiry",
  });

  const filteredKeysets = keysets.filter((keyset) => {
    const expiryDate = keyset.final_expiry ? new Date(keyset.final_expiry * 1000) : null;
    const isExpired = Boolean(expiryDate && expiryDate < now);

    switch (keysetFilter) {
      case "active":
        if (!keyset.active) return false;
        break;
      case "inactive":
        if (keyset.active) return false;
        break;
      case "expired":
        if (!isExpired) return false;
        break;
      case "no-expiry":
        if (keyset.final_expiry != null) return false;
        break;
      default:
        break;
    }

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const keysetId = keyset.id.toLowerCase();
    const currencyUnit = (typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom).toLowerCase();
    const finalExpiryDate = keyset.final_expiry
      ? new Date(keyset.final_expiry * 1000)
          .toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })
          .replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
          .toLowerCase()
      : noExpiryText.toLowerCase();
    const status = keyset.active
      ? intl
          .formatMessage({
            id: "keysets.status.active",
            defaultMessage: "Active",
          })
          .toLowerCase()
      : intl
          .formatMessage({
            id: "keysets.status.inactive",
            defaultMessage: "Inactive",
          })
          .toLowerCase();

    return keysetId.includes(query) || currencyUnit.includes(query) || finalExpiryDate.includes(query) || status.includes(query);
  });

  const sortedKeysets = [...filteredKeysets].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "maturity-asc":
      case "maturity-desc": {
        const aExpiry = a.final_expiry ? new Date(a.final_expiry * 1000) : null;
        const bExpiry = b.final_expiry ? new Date(b.final_expiry * 1000) : null;

        if (!aExpiry && !bExpiry) {
          comparison = 0;
        } else if (!aExpiry) {
          comparison = 1;
        } else if (!bExpiry) {
          comparison = -1;
        } else {
          const aIsExpired = aExpiry < now;
          const bIsExpired = bExpiry < now;

          if (aIsExpired && !bIsExpired) {
            comparison = -1;
          } else if (!aIsExpired && bIsExpired) {
            comparison = 1;
          } else {
            comparison = aExpiry.getTime() - bExpiry.getTime();
          }
        }
        if (sortBy === "maturity-desc") comparison = -comparison;
        break;
      }
      case "status-asc":
      case "status-desc": {
        const aStatus = a.active ? 1 : 0;
        const bStatus = b.active ? 1 : 0;
        comparison = bStatus - aStatus;
        if (sortBy === "status-desc") comparison = -comparison;
        break;
      }
      case "currency-asc":
      case "currency-desc": {
        const aCurrency = typeof a.unit === "string" ? a.unit : a.unit.Custom;
        const bCurrency = typeof b.unit === "string" ? b.unit : b.unit.Custom;
        comparison = aCurrency.localeCompare(bCurrency);
        if (sortBy === "currency-desc") comparison = -comparison;
        break;
      }
    }

    return comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === `${field}-asc`) {
      setSortBy(`${field}-desc`);
      return;
    }

    if (sortBy === `${field}-desc`) {
      setSortBy(DEFAULT_KEYSET_SORT);
      return;
    }

    setSortBy(`${field}-asc`);
  };

  const toggleKeysetFilter = (value: KeysetFilter) => {
    setKeysetFilter(value === keysetFilter ? DEFAULT_KEYSET_FILTER : value);
  };

  const hasNonDefaultFilters = keysetFilter !== DEFAULT_KEYSET_FILTER || sortBy !== DEFAULT_KEYSET_SORT;

  const resetFilters = () => {
    setKeysetFilter(DEFAULT_KEYSET_FILTER);
    setSortBy(DEFAULT_KEYSET_SORT);
  };

  const sortOptions = [
    {
      field: "currency" as const,
      label: intl.formatMessage({
        id: "keysets.sort.currency",
        defaultMessage: "Currency",
      }),
    },
    {
      field: "maturity" as const,
      label: intl.formatMessage({
        id: "keysets.sort.maturity",
        defaultMessage: "Maturity",
      }),
    },
    {
      field: "status" as const,
      label: intl.formatMessage({
        id: "keysets.sort.status",
        defaultMessage: "Status",
      }),
    },
  ];

  // No "all" option: nothing selected is what shows every keyset.
  const filterOptions = [
    {
      value: "active" as const,
      label: intl.formatMessage({
        id: "keysets.filter.active",
        defaultMessage: "Active",
      }),
    },
    {
      value: "inactive" as const,
      label: intl.formatMessage({
        id: "keysets.filter.inactive",
        defaultMessage: "Inactive",
      }),
    },
    {
      value: "expired" as const,
      label: intl.formatMessage({
        id: "keysets.filter.expired",
        defaultMessage: "Expired",
      }),
    },
    {
      value: "no-expiry" as const,
      label: intl.formatMessage({
        id: "keysets.filter.noExpiry",
        defaultMessage: "No expiry",
      }),
    },
  ];

  return {
    searchQuery,
    setSearchQuery,
    keysetFilter,
    setKeysetFilter,
    toggleKeysetFilter,
    hasNonDefaultFilters,
    resetFilters,
    sortBy,
    toggleSort,
    sortedKeysets,
    noExpiryText,
    sortOptions,
    filterOptions,
  };
}
