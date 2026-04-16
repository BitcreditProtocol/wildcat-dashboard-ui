import type { BitcreditBill, InfoReplyDiscriminants } from "@/generated/client/types.gen";

export type QuoteStatusVariant = "default" | "secondary" | "destructive" | "success" | "outline";

export type EffectiveQuoteStatus = InfoReplyDiscriminants;

const terminalQuoteStatuses = new Set<InfoReplyDiscriminants>(["Accepted", "Denied", "Rejected", "Canceled", "MintingEnabled"]);

export const getEffectiveQuoteStatus = (status: InfoReplyDiscriminants, ebill?: BitcreditBill | null): EffectiveQuoteStatus => {
  if (status === "MintingEnabled") {
    return status;
  }

  if (terminalQuoteStatuses.has(status)) {
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
      return "destructive";
    default:
      return "outline";
  }
};
