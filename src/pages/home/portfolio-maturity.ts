import type { MintSummary } from "./operator-api";
export function maturityBuckets(summary: MintSummary, now = Date.now()): bigint[] {
  const buckets = [0n, 0n, 0n];
  const today = Date.parse(new Date(now).toISOString().slice(0, 10));
  for (const q of summary.portfolio.quotes) {
    if (!q.financed || q.paid !== false) continue;
    const days = Math.ceil((Date.parse(q.maturity) - today) / 86_400_000);
    if (days >= 0 && days <= 90) {
      const index = days <= 30 ? 0 : days <= 60 ? 1 : 2;
      buckets[index] = (buckets[index] ?? 0n) + BigInt(q.amountSat);
    }
  }
  return buckets;
}
