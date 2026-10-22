import type { ForeignBalanceEntry } from "@/generated/client/types.gen";

export interface ForeignBalanceTotals {
  settled: number;
  unsettled: number;
}

/**
 * Foreign eCash totalled with settled and unsettled kept apart. Settled is e-IOU value this mint
 * can act on now; unsettled is value a foreign mint still owes it. Summing the two into a single
 * headline would report eCash the mint does not hold yet, so the card shows settled and names the
 * unsettled remainder separately.
 */
export function foreignBalanceTotals(entries: ForeignBalanceEntry[]): ForeignBalanceTotals {
  return entries.reduce<ForeignBalanceTotals>(
    (totals, entry) => ({ settled: totals.settled + entry.settled, unsettled: totals.unsettled + entry.unsettled }),
    { settled: 0, unsettled: 0 }
  );
}

/**
 * Mints ordered by the total value held with them, largest first, so the mint the operator has most
 * at stake with heads the breakdown. Equal holdings fall back to the mint id, which keeps the list
 * from reshuffling under itself between polls.
 */
export function sortForeignBalances(entries: ForeignBalanceEntry[]): ForeignBalanceEntry[] {
  return [...entries].sort((a, b) => b.settled + b.unsettled - (a.settled + a.unsettled) || a.mint_id.localeCompare(b.mint_id));
}
