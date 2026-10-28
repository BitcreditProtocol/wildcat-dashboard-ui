import type { MintSummary } from "./operator-api";
export function maturityBuckets(summary: MintSummary, now = Date.now(), horizon: 90 | 365 = 90): bigint[] {
  const buckets = [0n, 0n, 0n];
  const boundaries = horizon === 90 ? [30, 60, 90] : [90, 180, 365];
  const today = Date.parse(new Date(now).toISOString().slice(0, 10));
  for (const q of summary.portfolio.quotes) {
    if (!q.financed || q.paid !== false) continue;
    const days = Math.ceil((Date.parse(q.maturity) - today) / 86_400_000);
    if (days >= 0 && days <= horizon) {
      const index = boundaries.findIndex((end) => days <= end);
      buckets[index] = (buckets[index] ?? 0n) + BigInt(q.amountSat);
    }
  }
  return buckets;
}
