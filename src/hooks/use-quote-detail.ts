import { getQuoteOptions, listEbillsOptions, getEbillEndorsementsOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useQuery } from "@tanstack/react-query";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { getEbillMintCompleteQueryOptions } from "@/lib/ebill-mint-complete";

export interface QuoteDocument {
  name: string;
  hash: string;
  source: "billAttachment" | "requestToMint";
  fileUrl?: string;
}

const QUOTE_STATUS_POLL_INTERVAL_MS = 10_000;
const QUOTE_DETAIL_POLL_INTERVAL_MS = 10_000;
const QUOTE_POLLING_TERMINAL_STATUSES = new Set(["Denied", "Rejected", "Canceled", "MintingEnabled"]);

function getDocumentNameFromUrl(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl).pathname;
    const pathSegments = pathname.split("/").filter(Boolean);
    const pathSegment = pathSegments[pathSegments.length - 1];
    return pathSegment ? decodeURIComponent(pathSegment) : fileUrl;
  } catch {
    const pathSegments = fileUrl.split("/").filter(Boolean);
    const pathSegment = pathSegments[pathSegments.length - 1];
    return pathSegment ? decodeURIComponent(pathSegment) : fileUrl;
  }
}

export function useQuoteDetail(id: string) {
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

  const isMintComplete = mintCompleteQuery.data?.complete ?? false;
  const isMintCompleteLoading = mintCompleteQuery.isLoading;
  const feeToken = quoteData && "fee" in quoteData ? quoteData.fee : null;

  const billStatus = ebill?.status;
  const paymentStatus = billStatus?.payment;
  const cws = ebill?.current_waiting_state;
  const ebillPaid = Boolean(paymentStatus?.paid);
  const hasPaymentRequestInWaitingState = Boolean(cws && "Payment" in cws);
  const requestedToPay = Boolean(paymentStatus?.requested_to_pay ?? billStatus?.has_requested_funds ?? hasPaymentRequestInWaitingState);
  const rejectedToPay = Boolean(paymentStatus?.rejected_to_pay);
  const paymentDeadlineTs = paymentStatus?.payment_deadline_timestamp ?? null;
  const timeOfRequestToPay = paymentStatus?.time_of_request_to_pay ?? null;

  const isInMempool = cws && "Payment" in cws && cws.Payment.payment_data?.in_mempool;
  const showPayment = effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled";
  console.log(quoteData?.bill);
  const billAttachmentDocuments: QuoteDocument[] =
    ebill?.data?.files.map((file) => ({
      name: file.name,
      hash: file.hash,
      source: "billAttachment",
    })) ?? [];
  const requestToMintDocuments: QuoteDocument[] =
    quoteData?.bill?.file_urls?.map((fileUrl) => ({
      name: getDocumentNameFromUrl(fileUrl),
      hash: fileUrl,
      source: "requestToMint",
      fileUrl,
    })) ?? [];
  const documentFiles = billAttachmentDocuments.length > 0 ? billAttachmentDocuments : requestToMintDocuments;

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
