import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listQuotesInfiniteOptions,
  getQuoteOptions,
  listEbillsOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import { postTokenStatus } from "@/generated/client/sdk.gen";
import { useInfiniteQuery, useQuery, useQueries } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  formatNumber,
  truncateString,
  formatStatusLabel,
} from "@/utils/strings";
import {
  getEffectiveQuoteStatus,
  getQuoteStatusVariant,
} from "@/utils/quote-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  BitcreditBill,
  BillInfo,
  InfoReply,
  LightInfo,
  TokenStateResponse,
} from "@/generated/client/types.gen";
import { ParticipantsOverviewCard } from "@/components/ParticipantsOverview";
import { toast } from "sonner";
import * as React from "react";
import SearchComponent, { HighlightText } from "@/components/ui/search";
import { useState } from "react";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { SortButtons } from "@/components/SortButtons";
import { useIntl } from "react-intl";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuoteStatus =
  | "Accepted"
  | "Denied"
  | "OfferExpired"
  | "Offered"
  | "Pending"
  | "Rejected"
  | "Canceled"
  | "MintingEnabled";
type SortBy =
  | "status-asc"
  | "status-desc"
  | "sum-asc"
  | "sum-desc"
  | "maturity-asc"
  | "maturity-desc";
type QuickFilter =
  | "all"
  | "requested-to-pay"
  | "ready-to-request-to-pay"
  | "active-fee-token"
  | "maturity-today";

const RETRY_COUNT = 2;
const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const ALL_PAGE_SIZE_VALUE = "all";
const ALL_PAGE_SIZE_LIMIT = 100_000;
const QUOTE_STATUS_POLL_INTERVAL_MS = 10_000;
const QUOTE_POLLING_TERMINAL_STATUSES = new Set([
  "Denied",
  "Rejected",
  "Canceled",
  "MintingEnabled",
]);
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);

const shouldPollStatusPage = (status?: QuoteStatus) =>
  status === undefined ||
  status === "Pending" ||
  status === "Offered" ||
  status === "Accepted" ||
  status === "MintingEnabled";

const shouldFetchEbillsForStatusPage = (status?: QuoteStatus) =>
  status === undefined || status === "Pending" || status === "Offered";

type ItemsPerPageValue = number | typeof ALL_PAGE_SIZE_VALUE;

interface StatusQuotePageProps {
  status?: QuoteStatus;
}

interface QuoteListPage {
  data?: unknown[];
  quotes?: unknown[];
  total?: number;
}

function isLightInfo(value: unknown): value is LightInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "sum" in value &&
    typeof value.sum === "number"
  );
}

function getPageQuotes(page: QuoteListPage | undefined): LightInfo[] {
  if (!page) {
    return [];
  }

  return (page.data ?? page.quotes ?? []).filter(isLightInfo);
}

function isPaginatedPage(page: QuoteListPage | undefined): boolean {
  return Array.isArray(page?.data) && typeof page?.total === "number";
}

function getParticipantSearchValues(bill: BillInfo | null | undefined): string[] {
  if (!bill) {
    return [];
  }

  const participantValues = [bill.payee, ...bill.endorsees]
    .flatMap((participant) => {
      if (!participant) {
        return [];
      }

      if ("Ident" in participant) {
        return [
          participant.Ident.name,
          participant.Ident.node_id,
          participant.Ident.email ?? "",
        ];
      }

      return [participant.Anon.node_id];
    })
    .filter(Boolean);

  return [...participantValues, bill.drawee.name, bill.drawer.name, bill.drawee.node_id, bill.drawer.node_id];
}

function hasKeysetId(quoteDetails: InfoReply | undefined): boolean {
  return Boolean(quoteDetails && "keyset_id" in quoteDetails);
}

function isMaturityToday(maturityDate: string | undefined, todayIsoDate: string): boolean {
  return maturityDate === todayIsoDate;
}

function canRequestToPay(args: {
  effectiveStatus: string;
  quoteDetails: InfoReply | undefined;
  ebill: BitcreditBill | undefined;
}): boolean {
  const { effectiveStatus, quoteDetails, ebill } = args;
  const payment = ebill?.status?.payment;

  return (
    (effectiveStatus === "Accepted" || effectiveStatus === "MintingEnabled") &&
    hasKeysetId(quoteDetails) &&
    Boolean(ebill) &&
    !payment?.paid &&
    !payment?.requested_to_pay
  );
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

function QuoteItemCard({
  quote,
  effectiveStatus,
  searchQuery,
}: {
  quote: LightInfo;
  effectiveStatus: string;
  searchQuery: string;
}) {
  const intl = useIntl();
  const navigate = useNavigate();

  const queryResult = useQuery({
    ...getQuoteOptions({
      path: { qid: quote.id },
    }),
    retry: RETRY_COUNT,
    retryDelay,
    enabled: !!quote.id,
  });

  const {
    data: quoteDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = queryResult;
  const bill = quoteDetails?.bill;

  const handleQuoteClick = (e: React.MouseEvent) => {
    if (detailsError) {
      e.preventDefault();
      const errorMessage = getApiErrorMessage(detailsError);
      toast.error(
        intl.formatMessage({
          id: "quotes.card.error.title",
          defaultMessage: "Cannot load quote",
        }),
        {
          description: intl.formatMessage(
            {
              id: "quotes.card.error.description",
              defaultMessage: "Quote {id} is unavailable. {message}",
            },
            {
              id: truncateString(quote.id, 12),
              message:
                errorMessage ||
                intl.formatMessage({
                  id: "quotes.error.tryAgain",
                  defaultMessage: "Please try again later.",
                }),
            },
          ),
          id: `quote-error-${quote.id}`,
          duration: 5000,
        },
      );
    } else {
      void navigate(`/quotes/${quote.id}`);
    }
  };

  return (
    <Card className="text-sm">
      <div className="flex justify-between items-center gap-4 px-4 pt-4">
        <CardTitle className="text-xl">
          <div className="items-center flex gap-1">
            <span className="font-mono pt-2">
              <Link
                to={`/quotes/${quote.id}`}
                onClick={handleQuoteClick}
              >
                <HighlightText
                  text={quote.id}
                  highlight={searchQuery}
                />
              </Link>
            </span>
            <span></span>
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="leading-none font-semibold tracking-tight text-3xl">
            <HighlightText
              text={`${formatNumber(intl.locale, quote.sum)} sat`}
              highlight={searchQuery}
            />
          </div>
          <Badge variant={getQuoteStatusVariant(effectiveStatus)}>
            <HighlightText
              text={intl.formatMessage({
                id: `quote.status.${effectiveStatus}`,
                defaultMessage: formatStatusLabel(effectiveStatus),
              })}
              highlight={searchQuery}
            />
          </Badge>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 px-4 py-2">
        <div>
          <Button
            size="sm"
            className="max-w-sm px-12"
            onClick={handleQuoteClick}
          >
            {intl.formatMessage({
              id: "quotes.card.view",
              defaultMessage: "View",
            })}
          </Button>
        </div>
        {isLoadingDetails && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            {intl.formatMessage({
              id: "quotes.card.loadingBillDetails",
              defaultMessage: "Loading bill details...",
            })}
          </div>
        )}
        {detailsError && (
          <div className="text-sm text-red-500">
            {intl.formatMessage({
              id: "quotes.card.error.billInfo",
              defaultMessage: "Error loading bill information",
            })}
          </div>
        )}
        {bill && (
          <ParticipantsOverviewCard
            drawee={bill.drawee}
            drawer={bill.drawer}
            payee={bill.payee}
            holder={bill.endorsees}
          />
        )}
        {!isLoadingDetails && !detailsError && !bill && (
          <div className="text-sm text-gray-400">
            {intl.formatMessage({
              id: "quotes.card.noBillData",
              defaultMessage: "No bill data available",
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuoteList({ status }: { status?: QuoteStatus }) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [itemsPerPage, setItemsPerPage] =
    useState<ItemsPerPageValue>(PAGE_SIZE);
  const limit =
    itemsPerPage === ALL_PAGE_SIZE_VALUE ? ALL_PAGE_SIZE_LIMIT : itemsPerPage;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const todayIsoDate = new Date().toISOString().split("T")[0];
  const paymentSearchRequested =
    normalizedSearchQuery.includes("request") ||
    normalizedSearchQuery.includes("pay");
  const feeTokenSearchRequested =
    normalizedSearchQuery.includes("fee token") ||
    normalizedSearchQuery.includes("active fee");

  const {
    data,
    isFetching,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...listQuotesInfiniteOptions({
      query: {
        limit,
        status,
      },
    }),
    refetchInterval: shouldPollStatusPage(status)
      ? QUOTE_STATUS_POLL_INTERVAL_MS
      : false,
    refetchIntervalInBackground: true,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (sum, page) => sum + getPageQuotes(page).length,
        0,
      );
      const total = lastPage.total ?? getPageQuotes(lastPage).length;
      return loadedCount < total ? loadedCount : undefined;
    },
    retry: RETRY_COUNT,
    retryDelay,
  });
  const quotes = data?.pages.flatMap((page) => getPageQuotes(page)) ?? [];
  const totalQuotes = data?.pages[0]?.total ?? quotes.length;
  const usesLegacyFallback =
    data?.pages.some((page) => !isPaginatedPage(page)) ?? false;
  const shouldFetchEbills =
    shouldFetchEbillsForStatusPage(status) ||
    quickFilter === "requested-to-pay" ||
    quickFilter === "ready-to-request-to-pay" ||
    paymentSearchRequested;
  const { data: ebills } = useQuery({
    ...listEbillsOptions(),
    enabled: shouldFetchEbills && quotes.length > 0,
    refetchInterval:
      shouldFetchEbills && quotes.length > 0
        ? QUOTE_STATUS_POLL_INTERVAL_MS
        : false,
    refetchIntervalInBackground: true,
  });

  const quoteDetailsQueries = useQueries({
    queries: quotes.map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id },
      }),
      retry: RETRY_COUNT,
      retryDelay,
      enabled: !!quote.id,
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const currentStatus = query.state.data?.status ?? quote.status;
        return QUOTE_POLLING_TERMINAL_STATUSES.has(currentStatus)
          ? false
          : QUOTE_STATUS_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: true,
    })),
  });
  const shouldFetchFeeTokenStatuses =
    quickFilter === "active-fee-token" || feeTokenSearchRequested;
  const feeTokenStatusQueries = useQueries({
    queries: quotes.map((quote, index) => {
      const quoteDetails = quoteDetailsQueries[index]?.data;
      const feeToken =
        quoteDetails &&
        "fee" in quoteDetails &&
        typeof quoteDetails.fee === "string"
          ? quoteDetails.fee
          : undefined;

      return {
        queryKey: ["quote-fee-token-status", quote.id, feeToken],
        enabled: shouldFetchFeeTokenStatuses && Boolean(feeToken),
        staleTime: 60_000,
        retry: RETRY_COUNT,
        retryDelay,
        queryFn: async (): Promise<TokenStateResponse> => {
          const { data } = await postTokenStatus({
            body: { token: feeToken! },
            throwOnError: true,
          });
          return data;
        },
      };
    }),
  });

  const noQuotesMessage = intl.formatMessage({
    id: "quotes.list.empty",
    defaultMessage: "No quotes available.",
  });

  if (error) {
    const errorMessage =
      (error as { message?: string }).message ?? String(error);
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

  const billIdToEbillMap = new Map<string, BitcreditBill>();
  (ebills ?? []).forEach((ebill) => {
    billIdToEbillMap.set(ebill.id, ebill);
  });

  const effectiveStatusByQuoteId = new Map<string, string>();
  quotes.forEach((quote, index) => {
    const billId = quoteDetailsQueries[index]?.data?.bill?.id;
    const ebill = billId ? billIdToEbillMap.get(billId) : undefined;
    const quoteStatus =
      quoteDetailsQueries[index]?.data?.status ?? quote.status;
    effectiveStatusByQuoteId.set(
      quote.id,
      getEffectiveQuoteStatus(quoteStatus, ebill),
    );
  });

  const filteredQuotes = quotes.filter((quote, index) => {
    const quoteDetails = quoteDetailsQueries[index]?.data;
    const bill = quoteDetails?.bill;
    const effectiveStatus = effectiveStatusByQuoteId.get(quote.id) ?? quote.status;
    const ebill = bill?.id ? billIdToEbillMap.get(bill.id) : undefined;
    const payment = ebill?.status?.payment;
    const isReadyToRequestToPay = canRequestToPay({
      effectiveStatus,
      quoteDetails,
      ebill,
    });
    const feeTokenStatus = feeTokenStatusQueries[index]?.data;
    const hasActiveFeeToken = feeTokenStatus?.state === "Unspent";
    const matchesMaturityToday = isMaturityToday(bill?.maturity_date, todayIsoDate);

    if (status && effectiveStatus !== status) {
      return false;
    }

    switch (quickFilter) {
      case "requested-to-pay":
        if (!payment?.requested_to_pay) {
          return false;
        }
        break;
      case "ready-to-request-to-pay":
        if (!isReadyToRequestToPay) {
          return false;
        }
        break;
      case "active-fee-token":
        if (!hasActiveFeeToken) {
          return false;
        }
        break;
      case "maturity-today":
        if (!matchesMaturityToday) {
          return false;
        }
        break;
      default:
        break;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    const searchableContent = [
      quote.id,
      effectiveStatus,
      quote.sum.toString(),
      bill?.maturity_date ?? "",
      ...getParticipantSearchValues(bill),
      payment?.requested_to_pay ? "request to pay requested requested to pay req to pay" : "",
      isReadyToRequestToPay
        ? "ready request to pay ready req to pay can request to pay"
        : "",
      hasActiveFeeToken ? "active fee token fee token active" : "",
      matchesMaturityToday ? "maturity today due today" : "",
    ]
      .join(" ")
      .toLowerCase();

    return searchableContent.includes(normalizedSearchQuery);
  });

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aIndex = quotes.findIndex((q) => q.id === a.id);
    const bIndex = quotes.findIndex((q) => q.id === b.id);

    const aBill = aIndex >= 0 ? quoteDetailsQueries[aIndex]?.data?.bill : null;
    const bBill = bIndex >= 0 ? quoteDetailsQueries[bIndex]?.data?.bill : null;

    switch (sortBy) {
      case "status-asc":
        return (effectiveStatusByQuoteId.get(a.id) ?? a.status).localeCompare(
          effectiveStatusByQuoteId.get(b.id) ?? b.status,
        );
      case "status-desc":
        return (effectiveStatusByQuoteId.get(b.id) ?? b.status).localeCompare(
          effectiveStatusByQuoteId.get(a.id) ?? a.status,
        );
      case "sum-asc":
        return a.sum - b.sum;
      case "sum-desc":
        return b.sum - a.sum;
      case "maturity-asc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0;
        if (!aBill?.maturity_date) return 1;
        if (!bBill?.maturity_date) return -1;
        return (
          new Date(aBill.maturity_date).getTime() -
          new Date(bBill.maturity_date).getTime()
        );
      }
      case "maturity-desc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0;
        if (!aBill?.maturity_date) return 1;
        if (!bBill?.maturity_date) return -1;
        return (
          new Date(bBill.maturity_date).getTime() -
          new Date(aBill.maturity_date).getTime()
        );
      }
      default:
        return 0;
    }
  });

  const toggleSort = (field: "status" | "sum" | "maturity") => {
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
      field: "sum" as const,
      label: intl.formatMessage({
        id: "quotes.sort.amount",
        defaultMessage: "Amount",
      }),
    },
    {
      field: "maturity" as const,
      label: intl.formatMessage({
        id: "quotes.sort.maturity",
        defaultMessage: "Maturity",
      }),
    },
    {
      field: "status" as const,
      label: intl.formatMessage({
        id: "quotes.sort.status",
        defaultMessage: "Status",
      }),
    },
  ];
  const hasActiveFilters = normalizedSearchQuery.length > 0 || quickFilter !== "all";
  const quickFilterOptions = [
    {
      value: "all" as const,
      label: intl.formatMessage({
        id: "quotes.filter.all",
        defaultMessage: "All quotes",
      }),
    },
    {
      value: "requested-to-pay" as const,
      label: intl.formatMessage({
        id: "quotes.filter.requestedToPay",
        defaultMessage: "Requested to pay",
      }),
    },
    {
      value: "ready-to-request-to-pay" as const,
      label: intl.formatMessage({
        id: "quotes.filter.readyToRequestToPay",
        defaultMessage: "Ready to request to pay",
      }),
    },
    {
      value: "active-fee-token" as const,
      label: intl.formatMessage({
        id: "quotes.filter.activeFeeToken",
        defaultMessage: "Active fee token",
      }),
    },
    {
      value: "maturity-today" as const,
      label: intl.formatMessage({
        id: "quotes.filter.maturityToday",
        defaultMessage: "Maturity today",
      }),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage({
              id: "quotes.search.placeholder",
              defaultMessage:
                "Search by quote ID, participant, status, amount, or maturity...",
            })}
            onSearch={setSearchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
          <Select
            value={quickFilter}
            onValueChange={(value) => setQuickFilter(value as QuickFilter)}
          >
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
              onValueChange={(value) =>
                setItemsPerPage(
                  value === ALL_PAGE_SIZE_VALUE
                    ? ALL_PAGE_SIZE_VALUE
                    : Number(value),
                )
              }
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                  >
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
              { loaded: quotes.length, total: totalQuotes },
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
        {sortedQuotes.length === 0 && !hasActiveFilters && (
          <div className="py-2 font-bold">{noQuotesMessage}</div>
        )}
        {sortedQuotes.map((quote, index) => {
          if (!quote.id) {
            console.warn(`Quote at index ${index} is missing an ID:`, quote);
          }
          return (
            <div key={quote.id || `quote-fallback-${index}`}>
              <QuoteItemCard
                quote={quote}
                effectiveStatus={
                  effectiveStatusByQuoteId.get(quote.id) ?? quote.status
                }
                searchQuery={searchQuery}
              />
            </div>
          );
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
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
        { status: statusLabel },
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
                <BreadcrumbLink
                  key="quotes"
                  asChild
                >
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
