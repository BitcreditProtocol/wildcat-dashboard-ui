import { listQuotesInfiniteOptions, getQuoteOptions, listEbillsOptions } from "@/generated/client/@tanstack/react-query.gen";
import { postTokenStatus } from "@/generated/client/sdk.gen";
import { useInfiniteQuery, useQuery, useQueries } from "@tanstack/react-query";
import type { BitcreditBill, BillInfo, InfoReply, LightInfo } from "@/generated/client/types.gen";
import type { TokenStateResponse } from "@/generated/client/types.gen";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { isBeforeUtcStartOfDate } from "@/utils/dates";
import * as React from "react";
import { useState } from "react";
import { useIntl } from "react-intl";

export type QuoteStatus = "Accepted" | "Denied" | "OfferExpired" | "Offered" | "Pending" | "Rejected" | "Canceled" | "MintingEnabled";

type SortField = "status" | "sum" | "maturity";
type SortDirection = "asc" | "desc";
export type SortBy = `${SortField}-${SortDirection}`;

export type QuickFilter = "all" | "requested-to-pay" | "ready-to-request-to-pay" | "active-fee-token" | "maturity-today";

export type ItemsPerPageValue = number | typeof ALL_PAGE_SIZE_VALUE;

export const PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const ALL_PAGE_SIZE_VALUE = "all";

const ALL_PAGE_SIZE_LIMIT = 100_000;
const RETRY_COUNT = 2;
const QUOTE_STATUS_POLL_INTERVAL_MS = 10_000;
const FEE_TOKEN_STATUS_CONCURRENCY = 5;
const QUOTE_POLLING_TERMINAL_STATUSES = new Set(["Denied", "Rejected", "Canceled", "MintingEnabled"]);
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);

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

interface QuoteListPage {
  data?: unknown[];
  quotes?: unknown[];
  total?: number;
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
        return [participant.Ident.name, participant.Ident.node_id, participant.Ident.email ?? ""];
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
    !payment?.requested_to_pay &&
    !isBeforeUtcStartOfDate(quoteDetails?.bill?.maturity_date)
  );
}

function matchesRequestToPaySearch(query: string): boolean {
  return /\b(request(?:ed)?(?:\s+to)?\s+pay|req\s+to\s+pay)\b/i.test(query);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function shouldPollStatusPage(status?: QuoteStatus): boolean {
  return status === undefined || status === "Pending" || status === "Offered" || status === "Accepted" || status === "MintingEnabled";
}

function shouldFetchEbillsForStatusPage(status?: QuoteStatus): boolean {
  return status === undefined || status === "Pending" || status === "Offered";
}

export function useQuoteList(status?: QuoteStatus) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("maturity-asc");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPageValue>(PAGE_SIZE);
  const [feeTokenStatusByQuoteId, setFeeTokenStatusByQuoteId] = useState<Map<string, TokenStateResponse>>(new Map());
  const limit = itemsPerPage === ALL_PAGE_SIZE_VALUE ? ALL_PAGE_SIZE_LIMIT : itemsPerPage;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const todayIsoDate = new Date().toISOString().split("T")[0];
  const paymentSearchRequested = matchesRequestToPaySearch(normalizedSearchQuery);
  const feeTokenSearchRequested = normalizedSearchQuery.includes("fee token") || normalizedSearchQuery.includes("active fee");

  const { data, isFetching, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    ...listQuotesInfiniteOptions({
      query: {
        limit,
        status,
      },
    }),
    refetchInterval: shouldPollStatusPage(status) ? QUOTE_STATUS_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + getPageQuotes(page).length, 0);
      const total = lastPage.total ?? getPageQuotes(lastPage).length;
      return loadedCount < total ? loadedCount : undefined;
    },
    retry: RETRY_COUNT,
    retryDelay,
  });

  const quotes = React.useMemo(() => data?.pages.flatMap((page) => getPageQuotes(page)) ?? [], [data]);
  const totalQuotes = data?.pages[0]?.total ?? quotes.length;
  const usesLegacyFallback = data?.pages.some((page) => !isPaginatedPage(page)) ?? false;
  const shouldFetchEbills =
    shouldFetchEbillsForStatusPage(status) ||
    quickFilter === "requested-to-pay" ||
    quickFilter === "ready-to-request-to-pay" ||
    paymentSearchRequested;
  const { data: ebills } = useQuery({
    ...listEbillsOptions(),
    enabled: shouldFetchEbills && quotes.length > 0,
    refetchInterval: shouldFetchEbills && quotes.length > 0 ? QUOTE_STATUS_POLL_INTERVAL_MS : false,
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
        return QUOTE_POLLING_TERMINAL_STATUSES.has(currentStatus) ? false : QUOTE_STATUS_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: true,
    })),
  });

  const shouldFetchFeeTokenStatuses = quickFilter === "active-fee-token" || feeTokenSearchRequested;

  React.useEffect(() => {
    if (!shouldFetchFeeTokenStatuses) {
      return;
    }

    const feeTokenQuotes = quotes
      .map((quote, index) => {
        const quoteDetails = quoteDetailsQueries[index]?.data;
        const feeToken = quoteDetails && "fee" in quoteDetails && typeof quoteDetails.fee === "string" ? quoteDetails.fee : undefined;

        if (!feeToken) {
          return null;
        }

        return { quoteId: quote.id, feeToken };
      })
      .filter(isDefined);

    const pendingQuotes = feeTokenQuotes.filter((entry) => !feeTokenStatusByQuoteId.has(entry.quoteId));

    if (pendingQuotes.length === 0) {
      return;
    }

    let cancelled = false;
    let nextIndex = 0;

    const runWorker = async () => {
      while (!cancelled) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= pendingQuotes.length) {
          return;
        }

        const entry = pendingQuotes[currentIndex];

        try {
          const { data } = await postTokenStatus({
            body: { token: entry.feeToken },
            throwOnError: true,
          });

          if (cancelled) {
            return;
          }

          setFeeTokenStatusByQuoteId((current) => {
            if (current.has(entry.quoteId)) {
              return current;
            }

            const next = new Map(current);
            next.set(entry.quoteId, data);
            return next;
          });
        } catch {
          if (cancelled) {
            return;
          }
        }
      }
    };

    const workers = Array.from({
      length: Math.min(FEE_TOKEN_STATUS_CONCURRENCY, pendingQuotes.length),
    }).map(() => runWorker());

    void Promise.allSettled(workers);

    return () => {
      cancelled = true;
    };
  }, [feeTokenStatusByQuoteId, quoteDetailsQueries, quotes, shouldFetchFeeTokenStatuses]);

  const noQuotesMessage = intl.formatMessage({
    id: "quotes.list.empty",
    defaultMessage: "No quotes available.",
  });

  const billIdToEbillMap = new Map<string, BitcreditBill>();
  (ebills ?? []).forEach((ebill) => {
    billIdToEbillMap.set(ebill.id, ebill);
  });

  const effectiveStatusByQuoteId = new Map<string, string>();
  quotes.forEach((quote, index) => {
    const billId = quoteDetailsQueries[index]?.data?.bill?.id;
    const ebill = billId ? billIdToEbillMap.get(billId) : undefined;
    const quoteStatus = quoteDetailsQueries[index]?.data?.status ?? quote.status;
    effectiveStatusByQuoteId.set(quote.id, getEffectiveQuoteStatus(quoteStatus, ebill));
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
    const feeTokenStatus = feeTokenStatusByQuoteId.get(quote.id);
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
      isReadyToRequestToPay ? "ready request to pay ready req to pay can request to pay" : "",
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
        return (effectiveStatusByQuoteId.get(a.id) ?? a.status).localeCompare(effectiveStatusByQuoteId.get(b.id) ?? b.status);
      case "status-desc":
        return (effectiveStatusByQuoteId.get(b.id) ?? b.status).localeCompare(effectiveStatusByQuoteId.get(a.id) ?? a.status);
      case "sum-asc":
        return a.sum - b.sum;
      case "sum-desc":
        return b.sum - a.sum;
      case "maturity-asc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0;
        if (!aBill?.maturity_date) return 1;
        if (!bBill?.maturity_date) return -1;
        return new Date(aBill.maturity_date).getTime() - new Date(bBill.maturity_date).getTime();
      }
      case "maturity-desc": {
        if (!aBill?.maturity_date && !bBill?.maturity_date) return 0;
        if (!aBill?.maturity_date) return 1;
        if (!bBill?.maturity_date) return -1;
        return new Date(bBill.maturity_date).getTime() - new Date(aBill.maturity_date).getTime();
      }
      default:
        return 0;
    }
  });

  const toggleSort = (field: SortField) => {
    if (sortBy.startsWith(field)) {
      const nextDirection: SortDirection = sortBy.endsWith("asc") ? "desc" : "asc";
      setSortBy(`${field}-${nextDirection}`);
      return;
    }

    setSortBy(`${field}-asc`);
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

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    quickFilter,
    setQuickFilter,
    itemsPerPage,
    setItemsPerPage,
    quotes,
    totalQuotes,
    usesLegacyFallback,
    effectiveStatusByQuoteId,
    billIdToEbillMap,
    filteredQuotes,
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
  };
}
