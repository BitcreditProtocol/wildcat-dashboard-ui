import type { Amount } from "@/generated/client/types.gen";

export interface SupplyCoverageInput {
  debit_circulating_supply?: Amount | number | null;
  credit_circulating_supply?: Amount | number | null;
  onchain_collateral?: number | null;
  ebill_collateral?: number | null;
}

export interface SupplyMismatch {
  token: "debit" | "credit";
  supply: number;
  collateral: number;
  difference: number;
}

function amountValue(amount?: Amount | number | null): number {
  if (typeof amount === "number") {
    return amount;
  }
  return amount?.value ?? 0;
}

export function supplyMismatches(coverage: SupplyCoverageInput): SupplyMismatch[] {
  const pairs: Omit<SupplyMismatch, "difference">[] = [
    { token: "debit", supply: amountValue(coverage.debit_circulating_supply), collateral: coverage.onchain_collateral ?? 0 },
    { token: "credit", supply: amountValue(coverage.credit_circulating_supply), collateral: coverage.ebill_collateral ?? 0 },
  ];

  return pairs.map((pair) => ({ ...pair, difference: pair.supply - pair.collateral })).filter((pair) => pair.difference !== 0);
}
