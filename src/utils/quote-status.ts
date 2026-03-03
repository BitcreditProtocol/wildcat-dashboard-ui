export type QuoteStatusVariant = "default" | "secondary" | "destructive" | "success" | "outline"

export const getQuoteStatusVariant = (status: string): QuoteStatusVariant => {
  switch (status) {
    case "Offered":
    case "OfferExpired":
      return "default"
    case "Pending":
      return "default"
    case "Accepted":
    case "Minting":
    case "MintingEnabled":
      return "success"
    case "Denied":
    case "Canceled":
    case "Rejected":
      return "destructive"
    default:
      return "outline"
  }
}
