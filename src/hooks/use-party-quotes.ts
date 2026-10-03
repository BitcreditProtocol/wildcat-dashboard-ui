import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listEbillsOptions, listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { LightInfo, ListQuotesData } from "@/generated/client/types.gen";
import { getPageQuotes, type QuoteListPage } from "@/utils/quote-pages";
import {
  overdueUnconfirmed,
  summarizePartyQuotes,
  type PartyQuoteSummary,
  type QuotePartyRole,
  type Tally,
} from "@/pages/quotes/quote-parties";

/** Enough for any one party's bills that are not yet due; a larger book is reported as incomplete. */
export const PARTY_QUOTE_LIMIT = 500;
/** Party figures move when any of the party's quotes moves, not on a terminal state of their own. */
const PARTY_POLL_INTERVAL_MS = 30_000;

export interface PartyQuotesState {
  isLoading: boolean;
  error: Error | null;
  summary: PartyQuoteSummary | undefined;
  /** False when the Mint holds more of this party's bills than one read returned. */
  isComplete: boolean;
  /** Bills the Mint holds past maturity without a confirmed payment; undefined while unknown. */
  overdue: Tally | undefined;
  /**
   * Denied quotes of the applicant on other bills, over all time and for any reason (an evidence
   * closure is a denial too). Undefined for payers and while loading.
   */
  deniedOtherBills: number | undefined;
}

function partyQuery(role: QuotePartyRole, nodeId: string): NonNullable<ListQuotesData["query"]> {
  // Wildcat's `bill_payer_id` matches the payee; the party who pays at maturity is the drawee.
  return role === "applicant" ? { bill_holder_id: nodeId } : { bill_drawee_id: nodeId };
}

function pageTotal(page: QuoteListPage | undefined): number {
  return page?.total ?? getPageQuotes(page).length;
}

const polled = { staleTime: 15_000, refetchInterval: PARTY_POLL_INTERVAL_MS, placeholderData: keepPreviousData } as const;

/**
 * One party's bills that have not matured yet, straight from the Mint's quote filters, so the
 * figures cover every quote the Mint holds rather than the pages the list has loaded.
 * `current` is the quote on screen: it is counted from its own live record.
 */
export function usePartyQuotes(
  role: QuotePartyRole,
  nodeId: string | undefined,
  { current, billId }: { current?: LightInfo; billId?: string } = {}
): PartyQuotesState {
  const today = new Date().toISOString().slice(0, 10);
  const enabled = nodeId !== undefined && nodeId.length > 0;
  const filter = enabled ? partyQuery(role, nodeId) : {};
  const countsDenials = enabled && role === "applicant";

  const open = useQuery({
    ...listQuotesOptions({ query: { ...filter, bill_maturity_date_from: today, limit: PARTY_QUOTE_LIMIT } }),
    ...polled,
    enabled,
  });
  const denied = useQuery({
    ...listQuotesOptions({ query: { ...filter, status: "Denied", limit: 1 } }),
    ...polled,
    enabled: countsDenials,
  });
  // A reissued quote follows a denied one for the same bill; those denials are this bill's, not another's.
  const deniedThisBill = useQuery({
    ...listQuotesOptions({ query: { ...filter, bill_id: billId, status: "Denied", limit: 1 } }),
    ...polled,
    enabled: countsDenials && billId !== undefined,
  });
  // The Mint's own eBills carry payment status; the quote list reads the same key.
  const ebills = useQuery({ ...listEbillsOptions(), ...polled, enabled });

  const page = open.data as QuoteListPage | undefined;
  const quotes = getPageQuotes(page);
  const deniedReady = denied.data !== undefined && (billId === undefined || deniedThisBill.data !== undefined);
  return {
    isLoading: open.isLoading,
    error: open.error,
    summary: page === undefined ? undefined : summarizePartyQuotes(quotes, current),
    isComplete: pageTotal(page) <= quotes.length,
    overdue: enabled && ebills.data !== undefined ? overdueUnconfirmed(ebills.data, role, nodeId, today) : undefined,
    deniedOtherBills:
      countsDenials && deniedReady
        ? Math.max(0, pageTotal(denied.data) - (billId === undefined ? 0 : pageTotal(deniedThisBill.data)))
        : undefined,
  };
}
