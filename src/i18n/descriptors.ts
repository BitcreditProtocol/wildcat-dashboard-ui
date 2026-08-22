import { defineMessages } from "react-intl";

export const quoteStatusMessages = defineMessages({
  Pending: { id: "quote.status.Pending", defaultMessage: "Pending" },
  Offered: { id: "quote.status.Offered", defaultMessage: "Offered" },
  OfferExpired: { id: "quote.status.OfferExpired", defaultMessage: "Offer expired" },
  Accepted: { id: "quote.status.Accepted", defaultMessage: "Accepted" },
  Denied: { id: "quote.status.Denied", defaultMessage: "Denied" },
  Rejected: { id: "quote.status.Rejected", defaultMessage: "Rejected" },
  Canceled: { id: "quote.status.Canceled", defaultMessage: "Canceled" },
  Minting: { id: "quote.status.Minting", defaultMessage: "Minting" },
  MintingEnabled: { id: "quote.status.MintingEnabled", defaultMessage: "Minting enabled" },
  FailedEbillValidation: {
    id: "quote.status.FailedEbillValidation",
    defaultMessage: "eBill validation failed",
    description: "Terminal quote status when the Mint rejects the referenced eBill as invalid",
  },
});

export const participantRoleMessages = defineMessages({
  drawee: { id: "participants.role.drawee", defaultMessage: "Drawee" },
  drawer: { id: "participants.role.drawer", defaultMessage: "Drawer" },
  payee: { id: "participants.role.payee", defaultMessage: "Payee" },
  holder: { id: "participants.role.holder", defaultMessage: "Holder" },
  bearer: { id: "participants.role.bearer", defaultMessage: "Bearer" },
});

export function getQuoteStatusMessage(status: string) {
  return quoteStatusMessages[status as keyof typeof quoteStatusMessages] ?? quoteStatusMessages.Pending;
}
