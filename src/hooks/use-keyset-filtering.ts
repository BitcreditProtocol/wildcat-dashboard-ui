import { useState, useMemo } from "react";
import type { KeySetInfo } from "@/generated/client/types.gen";
import { useIntl } from "react-intl";

type SortBy =
  | "maturity-asc"
  | "maturity-desc"
  | "status-asc"
  | "status-desc"
  | "currency-asc"
  | "currency-desc";

export type KeysetFilter =
  | "all"
  | "active"
  | "inactive"
  | "expired"
  | "no-expiry";

export function useKeysetFiltering(keysets: KeySetInfo[]) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc");
  const [keysetFilter, setKeysetFilter] = useState<KeysetFilter>("all");

  const now = new Date();

  const noExpiryText = intl.formatMessage({
    id: "keysets.noExpiry",
    defaultMessage: "No expiry",
  });

  const filteredKeysets = keysets.filter((keyset) => {
    const expiryDate = keyset.final_expiry
      ? new Date(keyset.final_expiry * 1000)
      : null;
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
    const currencyUnit = (
      typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom
    ).toLowerCase();
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

    return (
      keysetId.includes(query) ||
      currencyUnit.includes(query) ||
      finalExpiryDate.includes(query) ||
      status.includes(query)
    );
  });

  const sortedKeysets = useMemo(
    () =>
      [...filteredKeysets].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "maturity-asc":
          case "maturity-desc": {
            const aExpiry = a.final_expiry
              ? new Date(a.final_expiry * 1000)
              : null;
            const bExpiry = b.final_expiry
              ? new Date(b.final_expiry * 1000)
              : null;

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
            const aCurrency =
              typeof a.unit === "string" ? a.unit : a.unit.Custom;
            const bCurrency =
              typeof b.unit === "string" ? b.unit : b.unit.Custom;
            comparison = aCurrency.localeCompare(bCurrency);
            if (sortBy === "currency-desc") comparison = -comparison;
            break;
          }
        }

        return comparison;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredKeysets, sortBy],
  );

  const toggleSort = (field: "maturity" | "status" | "currency") => {
    if (sortBy.startsWith(field)) {
      setSortBy(
        sortBy.endsWith("asc")
          ? (`${field}-desc` as SortBy)
          : (`${field}-asc` as SortBy),
      );
    } else {
      setSortBy(`${field}-asc` as SortBy);
    }
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

  const filterOptions = [
    {
      value: "all" as const,
      label: intl.formatMessage({
        id: "keysets.filter.all",
        defaultMessage: "All keysets",
      }),
    },
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
    sortBy,
    toggleSort,
    sortedKeysets,
    noExpiryText,
    sortOptions,
    filterOptions,
  };
}
