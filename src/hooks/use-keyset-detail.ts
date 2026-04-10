import { useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listKeysetInfosOptions,
  listKeysetInfosQueryKey,
  listQuotesOptions,
  getQuoteOptions,
  listEbillsOptions,
  postEnableRedemptionMutation,
} from "@/generated/client/@tanstack/react-query.gen";
import type { BitcreditBill } from "@/generated/client/types.gen";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { getEbillMintCompleteQueryOptions } from "@/lib/ebill-mint-complete";
import { deserializeKeysetId, doesBillMatchKeysetMaturity } from "@/utils/keyset";

const KEYSET_DETAIL_POLL_INTERVAL_MS = 10_000;
const MINT_COMPLETE_POLL_INTERVAL_MS = 60_000;
const MINT_COMPLETE_RETRY_COUNT = 3;
const MINT_COMPLETE_RETRY_DELAY_MS = 30_000;

const QUOTE_POLLING_TERMINAL_STATUSES = new Set([
  "Denied",
  "Rejected",
  "Canceled",
  "MintingEnabled",
]);

export function useKeysetDetail(keysetId: string) {
  const intl = useIntl();
  const queryClient = useQueryClient();

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

  const allQuotes = useMemo(
    () => allQuotesData?.data ?? [],
    [allQuotesData?.data],
  );

  const { data: ebills } = useQuery({
    ...listEbillsOptions(),
    refetchInterval: KEYSET_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const keyset = keysets?.data.find((k) => k.id === keysetId);
  const parsedKeysetId = keyset ? deserializeKeysetId(keyset.id) : null;

  const redemptionMutation = useMutation({
    ...postEnableRedemptionMutation(),
    onSuccess: () => {
      toast.success(
        intl.formatMessage({
          id: "keyset.detail.redeem.success",
          defaultMessage: "Redemption enabled successfully",
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: listKeysetInfosQueryKey(),
        exact: false,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(
        intl.formatMessage(
          {
            id: "keyset.detail.redeem.error",
            defaultMessage: "Failed to enable redemption: {error}",
          },
          { error: message },
        ),
      );
    },
  });

  const quoteDetailsQueries = useQueries({
    queries: allQuotes.map((quote) => ({
      ...getQuoteOptions({
        path: { qid: quote.id },
      }),
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const currentStatus = query.state.data?.status ?? quote.status;
        return QUOTE_POLLING_TERMINAL_STATUSES.has(currentStatus)
          ? false
          : KEYSET_DETAIL_POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: true,
    })),
  });

  const quoteDetailsLoading = quoteDetailsQueries.some((q) => q.isLoading);

  const quoteDetailsDepsKey = useMemo(() => {
    return quoteDetailsQueries
      .map((query) => {
        const billId = query.data?.bill?.id ?? "";
        const maturityDate = query.data?.bill?.maturity_date ?? "";
        return `${billId}|${maturityDate}`;
      })
      .join(",");
  }, [quoteDetailsQueries]);

  const matchingBillIds = useMemo(() => {
    const billIds: string[] = [];

    if (!keyset?.final_expiry || quoteDetailsLoading) {
      return billIds;
    }

    const keysetFinalExpiry = keyset.final_expiry;

    allQuotes.forEach((_quote, index) => {
      const quoteDetails = quoteDetailsQueries[index]?.data;
      const billMaturityDate = quoteDetails?.bill?.maturity_date;
      const billId = quoteDetails?.bill?.id;

      if (!billMaturityDate || !billId) {
        return;
      }

      if (doesBillMatchKeysetMaturity(keysetFinalExpiry, billMaturityDate)) {
        billIds.push(billId);
      }
    });

    return billIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyset?.final_expiry, allQuotes, quoteDetailsDepsKey, quoteDetailsLoading]);

  const mintCompleteQueries = useQueries({
    queries: matchingBillIds.map((billId) => ({
      ...getEbillMintCompleteQueryOptions({ billId }),
      refetchInterval: (query: {
        state: { data?: { complete?: boolean }; error?: unknown };
      }) => {
        if (query.state.error) return false;
        return query.state.data?.complete === false
          ? MINT_COMPLETE_POLL_INTERVAL_MS
          : false;
      },
      retry: MINT_COMPLETE_RETRY_COUNT,
      retryDelay: MINT_COMPLETE_RETRY_DELAY_MS,
      refetchOnWindowFocus: false,
    })),
  });

  const allBillsPaid =
    matchingBillIds.length > 0 &&
    matchingBillIds.every((billId) => {
      const ebill = ebills?.find((e) => e.id === billId);
      return ebill?.status?.payment?.paid === true;
    });

  const allMintComplete =
    matchingBillIds.length > 0 &&
    mintCompleteQueries.every((query) => query.data?.complete === true);

  const canEnableRedemption = allBillsPaid && allMintComplete;
  const anyMintCompleteLoading = mintCompleteQueries.some((q) => q.isLoading);
  const hasNoMatchingBills = matchingBillIds.length === 0;

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
    parsedKeysetId,
    redemptionMutation,
    allQuotes,
    quoteDetailsQueries,
    matchingBillIds,
    mintCompleteQueries,
    allBillsPaid,
    allMintComplete,
    canEnableRedemption,
    anyMintCompleteLoading,
    hasNoMatchingBills,
    matchingQuotes,
    ebills,
    billIdToEbillMap,
    keysetsLoading,
    quotesLoading,
    quoteDetailsLoading,
  };
}
