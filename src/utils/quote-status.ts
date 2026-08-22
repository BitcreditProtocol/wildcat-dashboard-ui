import type { BitcreditBill, InfoReplyDiscriminants } from "@/generated/client/types.gen";

export type QuoteStatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "pending"
  | "processing"
  | "info"
  | "loading"
  | "neutral"
  | "outline";

export type EffectiveQuoteStatus = InfoReplyDiscriminants;

const preservedQuoteStatuses = new Set<InfoReplyDiscriminants>([
  "Accepted",
  "Denied",
  "Rejected",
  "Canceled",
  "MintingEnabled",
  "FailedEbillValidation",
]);

const pollingCompleteQuoteStatuses = new Set<string>(["Denied", "Rejected", "Canceled", "MintingEnabled", "FailedEbillValidation"]);

export const isQuotePollingCompleteStatus = (status: string): boolean => pollingCompleteQuoteStatuses.has(status);

export const getEffectiveQuoteStatus = (status: InfoReplyDiscriminants, ebill?: BitcreditBill | null): EffectiveQuoteStatus => {
  if (status === "MintingEnabled") {
    return status;
  }

  if (preservedQuoteStatuses.has(status)) {
    return status;
  }

  if (ebill?.status?.acceptance?.accepted) {
    return "Accepted";
  }

  return status;
};

export const getQuoteStatusVariant = (status: string): QuoteStatusVariant => {
  switch (status) {
    case "Offered":
    case "OfferExpired":
      return "default";
    case "Pending":
      return "default";
    case "Accepted":
    case "Minting":
    case "MintingEnabled":
      return "success";
    case "Denied":
    case "Canceled":
    case "Rejected":
    case "FailedEbillValidation":
      return "destructive";
    default:
      return "outline";
  }
};
