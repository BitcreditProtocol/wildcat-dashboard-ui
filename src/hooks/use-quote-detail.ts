import { toast } from "@bitcredit/ui-library";
import {
  getQuoteOptions,
  listEbillsOptions,
  getEbillEndorsementsOptions,
  postTokenStatusMutation,
} from "@/generated/client/@tanstack/react-query.gen";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { useIntl } from "react-intl";
import { useEffect, useRef } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { getEbillMintCompleteQueryOptions } from "@/lib/ebill-mint-complete";

const QUOTE_STATUS_POLL_INTERVAL_MS = 10_000;
const QUOTE_DETAIL_POLL_INTERVAL_MS = 10_000;
const QUOTE_POLLING_TERMINAL_STATUSES = new Set(["Denied", "Rejected", "Canceled", "MintingEnabled"]);

export function useQuoteDetail(id: string) {
  const intl = useIntl();

  const {
    data: quoteData,
    isFetching,
    error,
    isLoading,
  } = useQuery({
    ...getQuoteOptions({
      path: { qid: id },
    }),
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status as string | undefined;
      if (!status) {
        return QUOTE_STATUS_POLL_INTERVAL_MS;
      }

      return QUOTE_POLLING_TERMINAL_STATUSES.has(status) ? false : QUOTE_STATUS_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const billId = quoteData?.bill?.id;

  const ebillsQuery = useQuery({
    ...listEbillsOptions(),
    retry: 1,
    enabled: !!billId,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const ebill = (query.state.data ?? []).find((item) => item.id === billId);
      return ebill?.status?.payment?.paid ? false : QUOTE_DETAIL_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const endorsementsQuery = useQuery({
    ...getEbillEndorsementsOptions({ path: { bid: billId ?? "" } }),
    retry: 1,
    enabled: !!billId,
    refetchInterval: QUOTE_DETAIL_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const ebill = ebillsQuery.data?.find((item) => item.id === billId);
  const effectiveQuoteStatus = getEffectiveQuoteStatus(quoteData?.status ?? "Pending", ebill);
  const isPaid = ebill?.status?.payment?.paid === true;
  const shouldCheckMintComplete = effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled" || isPaid;

  const feeTokenRequestRef = useRef<string | null>(null);

  const {
    mutate: requestFeeTokenStatus,
    isPending: isFeeTokenStatusPending,
    isSuccess: isFeeTokenStatusSuccess,
    isError: isFeeTokenStatusError,
    data: feeTokenStatusData,
  } = useMutation({
    ...postTokenStatusMutation(),
    retry: 5,
    onError: (error) => {
      const message = getApiErrorMessage(error);
      toast({
        title: intl.formatMessage(
          {
            id: "quotes.feeToken.check.error",
            defaultMessage: "Failed to check fee token: {error}",
          },
          { error: message }
        ),
        variant: "error",
      });
      feeTokenRequestRef.current = null;
    },
  });

  const mintCompleteQuery = useQuery({
    ...getEbillMintCompleteQueryOptions({ billId: billId ?? "" }),
    retry: 1,
    enabled: !!billId && shouldCheckMintComplete,
    refetchInterval: (query) => {
      if (!shouldCheckMintComplete) {
        return false;
      }

      const data = query.state.data;
      return data?.complete === false ? 60000 : false;
    },
  });

  const feeTokenFromQuote = quoteData && "fee" in quoteData ? quoteData.fee : null;
  const quoteStatusForEffect = effectiveQuoteStatus;

  useEffect(() => {
    if (!feeTokenFromQuote || quoteStatusForEffect !== "MintingEnabled") {
      return;
    }

    if (feeTokenRequestRef.current === feeTokenFromQuote) {
      return;
    }

    if (isFeeTokenStatusPending || isFeeTokenStatusSuccess) {
      return;
    }

    feeTokenRequestRef.current = feeTokenFromQuote;
    requestFeeTokenStatus({
      body: { token: feeTokenFromQuote },
    });
  }, [feeTokenFromQuote, isFeeTokenStatusPending, isFeeTokenStatusSuccess, quoteStatusForEffect, requestFeeTokenStatus]);

  const isMintComplete = mintCompleteQuery.data?.complete ?? false;
  const isMintCompleteLoading = mintCompleteQuery.isLoading;
  const feeToken = quoteData && "fee" in quoteData && typeof quoteData.fee === "string" ? quoteData.fee : null;

  const billStatus = ebill?.status;
  const paymentStatus = billStatus?.payment;
  const cws = ebill?.current_waiting_state;
  const ebillPaid = Boolean(paymentStatus?.paid);
  const hasPaymentRequestInWaitingState = Boolean(cws && "Payment" in cws);
  const requestedToPay = Boolean(paymentStatus?.requested_to_pay ?? billStatus?.has_requested_funds ?? hasPaymentRequestInWaitingState);
  const rejectedToPay = Boolean(paymentStatus?.rejected_to_pay);
  const paymentDeadlineTs = paymentStatus?.payment_deadline_timestamp ?? null;
  const timeOfRequestToPay = paymentStatus?.time_of_request_to_pay ?? null;

  const isInMempool = cws && "Payment" in cws && cws.Payment.payment_data?.in_mempool === true;
  const showPayment = effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled";
  const documentFiles = ebill?.data?.files ?? [];

  return {
    quoteData,
    isFetching,
    error,
    isLoading,
    ebill,
    endorsementsQuery: {
      data: endorsementsQuery.data,
      isLoading: endorsementsQuery.isLoading,
    },
    effectiveQuoteStatus,
    isPaid,
    isMintComplete,
    isMintCompleteLoading,
    feeToken,
    feeTokenStatusData,
    isFeeTokenStatusPending,
    isFeeTokenStatusSuccess,
    isFeeTokenStatusError,
    ebillPaid,
    requestedToPay,
    rejectedToPay,
    paymentDeadlineTs,
    timeOfRequestToPay,
    isInMempool,
    showPayment,
    documentFiles,
    billId,
  };
}
