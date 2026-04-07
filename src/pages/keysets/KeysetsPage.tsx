import { PageTitle } from "@/components/PageTitle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { listKeysetInfosOptions } from "@/generated/client/@tanstack/react-query.gen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { useState } from "react";
import SearchComponent, { HighlightText } from "@/components/ui/search";
import { SortButtons } from "@/components/SortButtons.tsx";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Loader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

type SortBy =
  | "maturity-asc"
  | "maturity-desc"
  | "status-asc"
  | "status-desc"
  | "currency-asc"
  | "currency-desc";
type KeysetFilter =
  | "all"
  | "active"
  | "inactive"
  | "expired"
  | "no-expiry";

const KEYSETS_POLL_INTERVAL_MS = 10_000;

function PageBody() {
  const { data: keysetsResponse, isLoading: keysetsLoading } = useQuery({
    ...listKeysetInfosOptions(),
    refetchInterval: KEYSETS_POLL_INTERVAL_MS,
  });
  const keysets = keysetsResponse?.data ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc");
  const [keysetFilter, setKeysetFilter] = useState<KeysetFilter>("all");
  const intl = useIntl();
  const noExpiryText = intl.formatMessage({
    id: "keysets.noExpiry",
    defaultMessage: "No expiry",
  });
  const now = new Date();

  if (keysetsLoading) {
    return <Loader />;
  }

  if (!keysets || keysets.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        <FormattedMessage
          id="keysets.empty"
          defaultMessage="No keysets found"
        />
      </div>
    );
  }

  const filteredKeysets = keysets.filter((keyset) => {
    const expiryDate = keyset.final_expiry
      ? new Date(keyset.final_expiry * 1000)
      : null;
    const isExpired = Boolean(expiryDate && expiryDate < now);

    switch (keysetFilter) {
      case "active":
        if (!keyset.active) {
          return false;
        }
        break;
      case "inactive":
        if (keyset.active) {
          return false;
        }
        break;
      case "expired":
        if (!isExpired) {
          return false;
        }
        break;
      case "no-expiry":
        if (keyset.final_expiry !== null) {
          return false;
        }
        break;
      default:
        break;
    }

    if (!searchQuery) {
      return true;
    }

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
          const now = new Date();
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
        if (sortBy === "maturity-desc") {
          comparison = -comparison;
        }
        break;
      }
      case "status-asc":
      case "status-desc": {
        const aStatus = a.active ? 1 : 0;
        const bStatus = b.active ? 1 : 0;
        comparison = bStatus - aStatus;
        if (sortBy === "status-desc") {
          comparison = -comparison;
        }
        break;
      }
      case "currency-asc":
      case "currency-desc": {
        const aCurrency = typeof a.unit === "string" ? a.unit : a.unit.Custom;
        const bCurrency = typeof b.unit === "string" ? b.unit : b.unit.Custom;
        comparison = aCurrency.localeCompare(bCurrency);
        if (sortBy === "currency-desc") {
          comparison = -comparison;
        }
        break;
      }
    }

    return comparison;
  });

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage({
              id: "keysets.search.placeholder",
              defaultMessage:
                "Search by keyset ID, currency, maturity date, or status...",
            })}
            onSearch={setSearchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
          <Select
            value={keysetFilter}
            onValueChange={(value) => setKeysetFilter(value as KeysetFilter)}
          >
            <SelectTrigger className="h-11 w-full sm:w-1/3 sm:min-w-0 sm:max-w-64">
              <SelectValue
                placeholder={intl.formatMessage({
                  id: "keysets.filter.label",
                  defaultMessage: "Filter",
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SortButtons
          sortBy={sortBy}
          onSortChange={toggleSort}
          options={sortOptions}
        />
      </div>

      {sortedKeysets.length === 0 ? (
        <div className="p-4 text-muted-foreground text-center">
          <FormattedMessage
            id="keysets.search.noMatch"
            defaultMessage="No keysets match your search criteria"
          />
        </div>
      ) : (
        <>
          {sortedKeysets.map((keyset) => {
            const finalExpiryDate = keyset.final_expiry
              ? new Date(keyset.final_expiry * 1000)
                  .toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                  .replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
              : noExpiryText;
            const currencyUnit =
              typeof keyset.unit === "string"
                ? keyset.unit
                : keyset.unit.Custom;
            const statusText = keyset.active
              ? intl.formatMessage({
                  id: "keysets.status.active",
                  defaultMessage: "Active",
                })
              : intl.formatMessage({
                  id: "keysets.status.inactive",
                  defaultMessage: "Inactive",
                });

            return (
              <Card
                key={keyset.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/keysets/${keyset.id}`}
                        className="block"
                      >
                        <CardTitle className="font-mono text-sm">
                          <HighlightText
                            text={keyset.id}
                            highlight={searchQuery}
                          />
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1">
                        <FormattedMessage
                          id="keysets.card.meta"
                          defaultMessage="Currency: {currency} | Maturity date: {maturityDate}"
                          values={{
                            currency: (
                              <HighlightText
                                text={currencyUnit}
                                highlight={searchQuery}
                              />
                            ),
                            maturityDate: (
                              <HighlightText
                                text={finalExpiryDate}
                                highlight={searchQuery}
                              />
                            ),
                          }}
                        />
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={keyset.active ? "default" : "secondary"}>
                        <HighlightText
                          text={statusText}
                          highlight={searchQuery}
                        />
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Button
                    size="sm"
                    variant="default"
                    className="max-w-sm px-12"
                    asChild
                  >
                    <Link to={`/keysets/${keyset.id}`}>
                      <FormattedMessage
                        id="keysets.view"
                        defaultMessage="View"
                      />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function KeysetsPage() {
  return (
    <>
      <Breadcrumbs>
        <FormattedMessage
          id="keysets.page.title"
          defaultMessage="Keysets"
        />
      </Breadcrumbs>
      <PageTitle>
        <FormattedMessage
          id="keysets.page.title"
          defaultMessage="Keysets"
        />
      </PageTitle>
      <PageBody />
    </>
  );
}
