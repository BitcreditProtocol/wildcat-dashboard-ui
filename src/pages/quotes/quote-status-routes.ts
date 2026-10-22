import type { QuoteStatus } from "@/hooks/use-quote-list";

export interface QuoteStatusRoute {
  status: QuoteStatus;
  path: string;
}

/**
 * The status pages, in the order a quote moves through them: waiting on a decision,
 * then answered, then in flight, then finished with. The chips on the quotes page and
 * the routes in the router are both built from this, so a chip cannot point at a path
 * that does not exist.
 */
export const QUOTE_STATUS_ROUTES: QuoteStatusRoute[] = [
  { status: "Pending", path: "quotes/pending" },
  { status: "Offered", path: "quotes/offered" },
  { status: "OfferExpired", path: "quotes/offerexpired" },
  { status: "Accepted", path: "quotes/accepted" },
  { status: "MintingEnabled", path: "quotes/mintingenabled" },
  { status: "Denied", path: "quotes/denied" },
  { status: "Rejected", path: "quotes/rejected" },
  { status: "Canceled", path: "quotes/canceled" },
];
