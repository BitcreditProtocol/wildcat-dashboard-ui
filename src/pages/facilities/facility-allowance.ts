import type { FacilityCoverage } from "@bitcredit/ai-credit-shared";

export function allowanceBreakdown(allowance: FacilityCoverage["allowance"]) {
  const accepted = allowance.entries.filter((entry) => entry.state === "committed");
  const offers = allowance.entries.filter((entry) => entry.state === "reserved");
  const sum = (entries: typeof allowance.entries) => entries.reduce((total, entry) => total + BigInt(entry.faceValueSat), 0n);
  return { acceptedSat: sum(accepted), offerSat: sum(offers), acceptedCount: accepted.length, offerCount: offers.length };
}
