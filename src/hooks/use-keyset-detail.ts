import { useMemo } from "react";
import { useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import {
  listKeysetInfosOptions,
  listQuotesOptions,
  getQuoteOptions,
  listEbillsOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import type { BitcreditBill, InfoReply } from "@/generated/client/types.gen";
import { getEbillMintCompleteQueryOptions, type EbillMintComplete } from "@/lib/ebill-mint-complete";
import { doesBillMatchKeysetMaturity } from "@/utils/keyset";
import { isQuotePollingCompleteStatus } from "@/utils/quote-status";

const KEYSET_DETAIL_POLL_INTERVAL_MS = 10_000;
const MINT_COMPLETE_POLL_INTERVAL_MS = 60_000;
const MINT_COMPLETE_RETRY_COUNT = 3;
const MINT_COMPLETE_RETRY_DELAY_MS = 30_000;

type QuoteDetailQueryResult = UseQueryResult<InfoReply>;
type MintCompleteQueryResult = UseQueryResult<EbillMintComplete>;

export function useKeysetDetail(keysetId: string) {
  const { data: keysets, isLoading: keysetsLoading } = useQuery({
    ...listKeysetInfosOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const { data: allQuotesData, isLoading: quotesLoading } = useQuery({
    ...listQuotesOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const allQuotes = useMemo(() => allQuotesData?.data ?? [], [allQuotesData?.data]);

  const { data: ebills } = useQuery({
    ...listEbillsOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const keyset = keysets?.data.find((k) => k.id === keysetId);
  const keysetFinalExpiry = keyset?.final_expiry;

  const quoteDetailsQueries = useQueries({
    queries: allQuotes.map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id },
      }),
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const currentStatus = query.state.data?.status ?? quote.status;
        return isQuotePollingCompleteStatus(currentStatus) ? false : KEYSET_DETAIL_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: true,
    })),
    combine: (results) => results as QuoteDetailQueryResult[],
  });

  const quoteDetailsLoading = quoteDetailsQueries.some((q) => q.isLoading);

  const quoteBillSummaries = quoteDetailsQueries.map((query) => ({
    billId: query.data?.bill?.id,
    maturityDate: query.data?.bill?.maturity_date,
  }));

  const matchingBillIds: string[] = [];

  if (keysetFinalExpiry && !quoteDetailsLoading) {
    quoteBillSummaries.forEach(({ billId, maturityDate }) => {
      if (!maturityDate || !billId) {
        return;
      }

      if (doesBillMatchKeysetMaturity(keysetFinalExpiry, maturityDate)) {
        matchingBillIds.push(billId);
      }
    });
  }

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

  const matchingQuotes = allQuotes.filter((_quote, index) => {
    const quoteDetails = quoteDetailsQueries[index]?.data;
    const billMaturityDate = quoteDetails?.bill?.maturity_date;

    if (!keyset?.final_expiry || !billMaturityDate) {
      return false;
    }

    return doesBillMatchKeysetMaturity(keyset.final_expiry, billMaturityDate);
  });

  return {
    keyset,
    allQuotes,
    quoteDetailsQueries,
    matchingBillIds,
    mintCompleteQueries,
    matchingQuotes,
    billIdToEbillMap,
    keysetsLoading,
    quotesLoading,
    quoteDetailsLoading,
  };
}
