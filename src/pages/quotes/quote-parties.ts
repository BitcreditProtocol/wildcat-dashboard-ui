import type { BillInfo, BitcreditBill, LightBillParticipant, LightInfo } from "@/generated/client/types.gen";
import { isIdentified, participantLabel, unwrapParticipant } from "@/utils/bill-participants";

export interface QuoteParty {
  nodeId: string;
  name: string;
  /** The participant is anonymous: `name` is then its node id. */
  anonymous?: boolean;
}

export type QuotePartyRole = "applicant" | "payer";

/**
 * The applicant is the bill's current holder: the last endorsee, or the payee while the bill was
 * never endorsed. Wildcat's `bill_holder_id` filter uses the same rule, so a party taken from
 * here can be listed server-side.
 */
export function billApplicant(bill: BillInfo): QuoteParty | null {
  const holder = unwrapParticipant(bill.endorsees[bill.endorsees.length - 1] ?? bill.payee);
  return holder ? { nodeId: holder.node_id, name: participantLabel(holder, holder.node_id), anonymous: !isIdentified(holder) } : null;
}

/** Who passed the bill to the applicant by endorsement: the holder before them. Undefined for an unendorsed bill. */
export function billPreviousHolder(bill: BillInfo): string | undefined {
  if (bill.endorsees.length === 0) return undefined;
  const previous = unwrapParticipant(bill.endorsees[bill.endorsees.length - 2] ?? bill.payee);
  return previous ? participantLabel(previous, previous.node_id) : undefined;
}

/** The drawee pays at maturity. Wildcat's `bill_payer_id` matches the payee, so payer lists use `bill_drawee_id`. */
export function billPayer(bill: BillInfo): QuoteParty {
  return { nodeId: bill.drawee.node_id, name: bill.drawee.name };
}

/** The quote list filtered server-side to one applicant (holder) or one payer (drawee), on the given status page. */
export function partyListPath(role: QuotePartyRole, nodeId: string, basePath = "/quotes"): string {
  return `${basePath}?${role}=${encodeURIComponent(nodeId)}`;
}

/** Open quote stages after the request, in the order a quote moves through them. */
export const COMMITTED_STATUSES = ["Offered", "Accepted", "MintingEnabled"] as const;
export type PartyQuoteBucket = "Pending" | (typeof COMMITTED_STATUSES)[number];

export interface Tally {
  count: number;
  faceValueSat: number;
}

export interface PartyQuoteSummary {
  buckets: Record<PartyQuoteBucket, Tally>;
  /** Face value the Mint has offered or holders have accepted: what an offer on one more bill adds to. */
  committed: Tally;
  /** The stage the quote on screen was counted in, when it is open. */
  currentBucket: PartyQuoteBucket | undefined;
}

const isBucket = (status: string): status is PartyQuoteBucket =>
  status === "Pending" || (COMMITTED_STATUSES as readonly string[]).includes(status);

/**
 * Face value per open stage, by the Mint's stored quote status. Closed quotes (denied, rejected,
 * expired, cancelled) carry no exposure and are left out. The quote on screen is counted from its
 * own live record, so the figures follow an offer or denial before the list is read again.
 */
export function summarizePartyQuotes(quotes: readonly LightInfo[], current?: LightInfo): PartyQuoteSummary {
  const empty = (): Tally => ({ count: 0, faceValueSat: 0 });
  const buckets: PartyQuoteSummary["buckets"] = { Pending: empty(), Offered: empty(), Accepted: empty(), MintingEnabled: empty() };
  const add = (quote: LightInfo) => {
    if (!isBucket(quote.status)) return;
    buckets[quote.status].count += 1;
    buckets[quote.status].faceValueSat += quote.sum;
  };
  for (const quote of quotes) if (quote.id !== current?.id) add(quote);
  if (current) add(current);
  const committed = empty();
  for (const status of COMMITTED_STATUSES) {
    committed.count += buckets[status].count;
    committed.faceValueSat += buckets[status].faceValueSat;
  }
  return { buckets, committed, currentBucket: current && isBucket(current.status) ? current.status : undefined };
}

function lightNodeId(participant: LightBillParticipant): string {
  return "Ident" in participant ? participant.Ident.node_id : participant.Anon.node_id;
}

/**
 * Bills the Mint holds that are past maturity without a confirmed payment, for one party: as payer
 * (drawee) or as applicant (an endorser who passed the bill on, so recourse can reach them).
 * `paid` can lag the chain, so this is "not confirmed", never "defaulted".
 */
export function overdueUnconfirmed(bills: readonly BitcreditBill[], role: QuotePartyRole, nodeId: string, today: string): Tally {
  const tally: Tally = { count: 0, faceValueSat: 0 };
  for (const bill of bills as readonly Partial<BitcreditBill>[]) {
    // Older Mints and stubs answer partial bills; a bill without these fields cannot be judged, so it is skipped.
    const maturity = bill.data?.maturity_date;
    const paid = bill.status?.payment?.paid;
    if (maturity === undefined || paid === undefined || bill.participants === undefined) continue;
    if (maturity >= today || paid) continue;
    const involved =
      role === "payer"
        ? bill.participants.drawee?.node_id === nodeId
        : (bill.participants.endorsements ?? []).some((endorsement) => lightNodeId(endorsement.signed.data) === nodeId);
    if (!involved || bill.data === undefined) continue;
    tally.count += 1;
    tally.faceValueSat += Number(bill.data.sum);
  }
  return tally;
}

export interface ApplicantGroup<Row> {
  /** Null while the quote's bill has not loaded, so its holder is not known yet. */
  applicant: QuoteParty | null;
  rows: Row[];
}

/**
 * Groups rows by applicant, keeping the list's own order: a group sits where its first row
 * would, so the applicant with the most urgent case comes first under the default sort.
 */
export function groupByApplicant<Row>(rows: readonly Row[], applicantOf: (row: Row) => QuoteParty | null): ApplicantGroup<Row>[] {
  const groups = new Map<string, ApplicantGroup<Row>>();
  for (const row of rows) {
    const applicant = applicantOf(row);
    const key = applicant?.nodeId ?? "";
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { applicant, rows: [row] });
  }
  return [...groups.values()];
}
