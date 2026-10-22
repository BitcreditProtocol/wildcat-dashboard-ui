import type { PendingOutage } from "@/generated/client/types.gen";

export interface PendingOutageTotals {
  pendingExchanges: number;
  pendingAmount: number;
}

/** Stable identity of an outage: the evidence digest its Betas hold, hex-encoded. */
export function outageKey(outage: PendingOutage): string {
  return outage.evidence_digest.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Most widely held first, so the outage mirrored by `substitute_beta` leads the list.
 */
export function sortPendingOutages(outages: PendingOutage[]): PendingOutage[] {
  return [...outages].sort((a, b) => b.betas_holding - a.betas_holding);
}

/**
 * Clowder counts each swap once across outages, so the entries can simply be added up.
 */
export function totalPendingOutages(outages: PendingOutage[]): PendingOutageTotals {
  return outages.reduce<PendingOutageTotals>(
    (totals, outage) => ({
      pendingExchanges: totals.pendingExchanges + outage.pending_exchanges,
      pendingAmount: totals.pendingAmount + outage.pending_amount,
    }),
    { pendingExchanges: 0, pendingAmount: 0 }
  );
}
