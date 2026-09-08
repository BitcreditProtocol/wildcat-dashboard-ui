import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import {
  listKeysetInfosOptions,
  listQuotesInfiniteOptions,
  getQuoteOptions,
  listEbillsOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import type { BitcreditBill, InfoReply, LightInfo } from "@/generated/client/types.gen";
import { getEbillMintCompleteQueryOptions, type EbillMintComplete } from "@/lib/ebill-mint-complete";
import { canQuoteHaveKeyset, doesQuoteBelongToKeyset } from "@/utils/keyset";
import { getNextQuotePageOffset, getPageQuotes } from "@/utils/quote-pages";

const KEYSET_DETAIL_POLL_INTERVAL_MS = 10_000;
const MINT_COMPLETE_POLL_INTERVAL_MS = 60_000;
const MINT_COMPLETE_RETRY_COUNT = 3;
const MINT_COMPLETE_RETRY_DELAY_MS = 30_000;
const QUOTE_PAGE_SIZE = 250;

const QUOTE_POLLING_TERMINAL_STATUSES = new Set(["Denied", "Rejected", "Canceled", "MintingEnabled"]);
type QuoteDetailQueryResult = UseQueryResult<InfoReply>;
type MintCompleteQueryResult = UseQueryResult<EbillMintComplete>;

export interface KeysetQuoteRow {
  quote: LightInfo;
  quoteDetails: InfoReply;
  ebill: BitcreditBill | null;
  mintCompleteQuery: MintCompleteQueryResult | null;
}

export function useKeysetDetail(keysetId: string) {
  const { data: keysets, isLoading: keysetsLoading } = useQuery({
    ...listKeysetInfosOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  // A quote's keyset is only known from its details, and the list endpoint cannot filter
  // by keyset, so every quote has to be walked - not just the first page.
  const {
    data: quotePages,
    isLoading: quotesLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...listQuotesInfiniteOptions({ query: { limit: QUOTE_PAGE_SIZE } }),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    initialPageParam: 0,
    getNextPageParam: getNextQuotePageOffset,
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allQuotes = useMemo(() => quotePages?.pages.flatMap((page) => getPageQuotes(page)) ?? [], [quotePages]);

  const { data: ebills } = useQuery({
    ...listEbillsOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const keyset = keysets?.data.find((k) => k.id === keysetId);

  // Only quotes far enough along to carry a keyset id are worth a detail request.
  const candidateQuotes = useMemo(() => allQuotes.filter((quote) => canQuoteHaveKeyset(quote.status)), [allQuotes]);

  const quoteDetailsQueries = useQueries({
    queries: candidateQuotes.map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id },
      }),
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const currentStatus = query.state.data?.status ?? quote.status;
        return QUOTE_POLLING_TERMINAL_STATUSES.has(currentStatus) ? false : KEYSET_DETAIL_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: true,
    })),
    combine: (results) => results as QuoteDetailQueryResult[],
  });

  const quoteDetailsLoading = quoteDetailsQueries.some((query) => query.isLoading);
  // A failed detail request means a quote silently drops out of the table, so surface it.
  const unresolvedQuoteCount = quoteDetailsQueries.filter((query) => query.isError).length;

  const matchedQuotes = candidateQuotes
    .map((quote, index) => ({ quote, quoteDetails: quoteDetailsQueries[index]?.data }))
    .filter((entry): entry is { quote: LightInfo; quoteDetails: InfoReply } => doesQuoteBelongToKeyset(entry.quoteDetails, keysetId));

  const matchingBillIds = [...new Set(matchedQuotes.map((entry) => entry.quoteDetails.bill.id))];

  const mintCompleteQueries = useQueries({
    queries: matchingBillIds.map((billId) => ({
      ...getEbillMintCompleteQueryOptions({ billId }),
      refetchInterval: (query: { state: { data?: { complete?: boolean }; error?: unknown } }) => {
        if (query.state.error) return false;
        return query.state.data?.complete === false ? MINT_COMPLETE_POLL_INTERVAL_MS : false;
      },
      retry: MINT_COMPLETE_RETRY_COUNT,
      retryDelay: MINT_COMPLETE_RETRY_DELAY_MS,
      refetchOnWindowFocus: false,
    })),
    combine: (results) => results as MintCompleteQueryResult[],
  });

  const billIdToEbillMap = useMemo(() => {
    const map = new Map<string, BitcreditBill>();
    if (ebills) {
      for (const ebill of ebills) {
        map.set(ebill.id, ebill);
      }
    }
    return map;
  }, [ebills]);

  const mintCompleteByBillId = new Map(matchingBillIds.map((billId, index) => [billId, mintCompleteQueries[index] ?? null]));

  const quoteRows: KeysetQuoteRow[] = matchedQuotes.map(({ quote, quoteDetails }) => {
    const billId = quoteDetails.bill.id;

    return {
      quote,
      quoteDetails,
      ebill: billIdToEbillMap.get(billId) ?? null,
      mintCompleteQuery: mintCompleteByBillId.get(billId) ?? null,
    };
  });

  return {
    keyset,
    quoteRows,
    keysetsLoading,
    // Which quotes belong to this keyset is unknown until every page and every
    // candidate's details have arrived; showing the empty state before then reads
    // as "this keyset has no quotes".
    quotesLoading: quotesLoading || hasNextPage || isFetchingNextPage || quoteDetailsLoading,
    unresolvedQuoteCount,
  };
}
