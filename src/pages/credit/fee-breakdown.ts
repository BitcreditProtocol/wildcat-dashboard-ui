import type { DecisionCase } from "./decision-types";

export type FeePartKey = "payerRisk" | "uncertainty" | "funding" | "mintReturn" | "subsidy";

export interface FeePart {
  key: FeePartKey;
  /** Satoshis of the time-priced discount this part accounts for; negative for a subsidy. */
  sat: number;
  bps: number;
}

export interface FeeBreakdown {
  billSat: number;
  holderReceivesSat: number;
  feeSat: number;
  operatingCostSat: number;
  tenorDays: number;
  feeRatioBps: number;
  /** Time-priced parts, largest first; they sum exactly to the discount. */
  parts: FeePart[];
  payerRisk: { probabilityOfDefaultBps: number; lossGivenDefaultBps: number };
  /** The evidence level of the payer record, which set the uncertainty part. */
  uncertainty: { evidenceState: string };
}

/**
 * The minting fee as the parts the operator can reason about: what the payer might not pay, what
 * the Mint is unsure of, what its money costs while the bill is held, its margin, and the fixed
 * case cost. Read from the governed calculation trace and checked against the terms; anything that
 * does not add up returns undefined, so no invented split is ever shown.
 */
export function feeBreakdown(decisionCase: DecisionCase): FeeBreakdown | undefined {
  const terms = decisionCase.result.terms;
  if (terms === null) return undefined;
  const rate = decisionCase.result.calculationTrace.find((step) => step.step === "annual_discount_bps");
  const applied = decisionCase.result.calculationTrace.find((step) => step.step === "applied_discount_sat");
  const input = (key: string): number | undefined => {
    const value = rate?.inputs[key];
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  };
  const funding = input("costOfFundsBps");
  const payerRisk = input("expectedLossBps");
  const uncertainty = input("uncertaintyMarginBps");
  const mintReturn = input("returnObjectiveBps");
  const subsidy = input("subsidyBps");
  const { probabilityOfDefaultBps: pd, lossGivenDefaultBps: lgd, evidenceState } = decisionCase.snapshot.acceptor;
  if (
    funding === undefined ||
    payerRisk === undefined ||
    uncertainty === undefined ||
    mintReturn === undefined ||
    subsidy === undefined ||
    pd === null ||
    lgd === null
  )
    return undefined;
  const annual = funding + payerRisk + uncertainty + mintReturn - subsidy;
  const discount = BigInt(terms.appliedDiscountSat);
  // The same checks the Calculation tab makes before it shows the arithmetic: the payer-risk part must
  // be the recorded payer's own figures, and every step must agree with the terms.
  if (
    annual !== terms.annualDiscountBps ||
    annual <= 0 ||
    payerRisk !== Math.ceil((pd * lgd) / 10_000) ||
    rate?.result !== String(terms.annualDiscountBps) ||
    applied?.result !== terms.appliedDiscountSat ||
    discount + BigInt(terms.operatingCostSat) !== BigInt(terms.effectiveFeeSat) ||
    BigInt(terms.billSumSat) - BigInt(terms.discountedSat) !== BigInt(terms.effectiveFeeSat)
  )
    return undefined;

  // Split the discount in proportion to each part's rate, rounding charges down and the subsidy up, then
  // hand the (never negative) remainder to the part with the highest rate, so the parts add up exactly.
  const raw: { key: FeePartKey; bps: number }[] = [
    { key: "payerRisk", bps: payerRisk },
    { key: "uncertainty", bps: uncertainty },
    { key: "funding", bps: funding },
    { key: "mintReturn", bps: mintReturn },
  ];
  const parts: FeePart[] = raw
    .filter((part) => part.bps > 0)
    .map((part) => ({ ...part, sat: Number((discount * BigInt(part.bps)) / BigInt(annual)) }));
  if (subsidy > 0) {
    const sat = (discount * BigInt(subsidy) + BigInt(annual) - 1n) / BigInt(annual);
    parts.push({ key: "subsidy", bps: subsidy, sat: -Number(sat) });
  }
  const remainder = Number(discount) - parts.reduce((sum, part) => sum + part.sat, 0);
  const highestRate = parts.filter((part) => part.key !== "subsidy").sort((a, b) => b.bps - a.bps)[0];
  if (highestRate) highestRate.sat += remainder;
  parts.sort((a, b) => b.sat - a.sat);

  return {
    billSat: Number(terms.billSumSat),
    holderReceivesSat: Number(terms.discountedSat),
    feeSat: Number(terms.effectiveFeeSat),
    operatingCostSat: Number(terms.operatingCostSat),
    tenorDays: terms.tenorDays,
    feeRatioBps: terms.feeRatioBps,
    parts,
    payerRisk: { probabilityOfDefaultBps: pd, lossGivenDefaultBps: lgd },
    uncertainty: { evidenceState },
  };
}
