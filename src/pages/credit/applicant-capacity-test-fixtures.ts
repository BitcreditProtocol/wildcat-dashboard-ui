import {
  applicantCapacitySchema,
  emptyFinancialAmount,
  financialStatementsSchema,
  financialPositionItems,
  comprehensiveIncomeItems,
  type FinancialAmount,
  type ApplicantCapacity,
  type ApplicantFinancialInformation,
} from "@bitcredit/ai-credit-shared";

export const financeDigest = `sha256:${"e".repeat(64)}`;
export const orientationFixture = {
  billFaceOrientation: { valueMinor: "6160000", currency: "GTQ", minorUnitScale: 2, isSynthetic: true, orientationOnly: true },
  fxRate: {
    currency: "GTQ",
    minorUnitScale: 2,
    minorUnitsPerBtc: "77000000",
    snapshotDigest: financeDigest,
    snapshotVersion: "synthetic-fx-v1",
    asOf: "2026-10-28",
    isSynthetic: true,
    orientationOnly: true,
  },
} as const;

export function statementInformation(): ApplicantFinancialInformation {
  const amount = (valueMinor: string | null): FinancialAmount =>
    valueMinor === null
      ? emptyFinancialAmount("GTQ", 2)
      : {
          valueMinor,
          currency: "GTQ",
          minorUnitScale: 2,
          source: "statement_pdf",
          state: "applicant_confirmed",
          citation: { page: 2, exactSnippet: "Synthetic statement line 123.45 GTQ" },
        };
  const statements = financialStatementsSchema.parse({
    schemaVersion: "financial-statements-v1",
    currency: "GTQ",
    minorUnitScale: 2,
    period: { startDate: "2025-01-01", endDate: "2025-12-31" },
    statementOfFinancialPosition: Object.fromEntries(financialPositionItems.map((key) => [key, amount("12345")])),
    statementOfComprehensiveIncome: Object.fromEntries(comprehensiveIncomeItems.map((key) => [key, amount("12345")])),
    evidence: {
      reference: "synthetic-finances.pdf",
      label: "Synthetic annual statements",
      contentDigest: financeDigest,
      origin: "applicant_upload",
    },
    extraction: {
      derivativeDigest: financeDigest,
      parserVersion: "pdf-parser-v1",
      promptVersion: "financial-statements-extraction-v1",
      modelId: "synthetic-model",
    },
  });
  statements.statementOfFinancialPosition.cashAndCashEquivalents = {
    ...emptyFinancialAmount("GTQ", 2),
    valueMinor: "0",
    state: "applicant_confirmed",
  };
  statements.statementOfFinancialPosition.inventories = amount(null);
  return { schemaVersion: "applicant-financial-information-v1", statements, farmCashFlow: null };
}

export function farmInformation(): ApplicantFinancialInformation {
  const amount = (valueMinor: string | null) =>
    ({ ...emptyFinancialAmount("GTQ", 2), valueMinor, state: valueMinor === null ? "unconfirmed" : "applicant_confirmed" }) as const;
  return {
    schemaVersion: "applicant-financial-information-v1",
    statements: null,
    farmCashFlow: {
      schemaVersion: "farm-cash-flow-v1",
      currency: "GTQ",
      minorUnitScale: 2,
      crop: "Synthetic coffee",
      season: { name: "Harvest 2026", period: { startDate: "2026-01-01", endDate: "2026-06-30" } },
      area: { value: "2.5", unit: "ha" },
      expectedHarvest: { value: "800", unit: "kg" },
      expectedPricePerUnit: amount("5000"),
      productionCosts: amount("1000000"),
      otherHouseholdIncome: amount("0"),
      householdExpenses: amount("200000"),
      existingDebtPayments: amount("30000"),
    },
  };
}

export function capacityFixture(information: ApplicantFinancialInformation | null = statementInformation()): ApplicantCapacity {
  const ratio = { valueBps: null, numeratorMinor: null, denominatorMinor: null, method: "synthetic-unavailable" };
  return applicantCapacitySchema.parse({
    axis: "applicant_capacity",
    calculationVersion: "applicant-capacity-v1",
    status: "review",
    reviewFlag: true,
    reviewReasons: [
      "current_ratio_assumes_all_borrowings_current",
      "accrual_profit_is_not_verified_cash_flow",
      "bill_share_exceeds_reference",
    ],
    information,
    cashFlowMethod: "annual_accrual_profit_proxy",
    ...orientationFixture,
    netAnnualCashFlow: {
      valueMinor: "12000000",
      currency: "GTQ",
      minorUnitScale: 2,
      source: "governed_calculation",
      state: "applicant_confirmed",
      citation: null,
    },
    billShareOfNetCashFlow: {
      valueBps: "5133",
      numeratorMinor: "6160000",
      denominatorMinor: "12000000",
      method: "bill_face_share_of_net_annual_cash_flow_orientation_only",
    },
    maximumRepaymentShareOfNetCashFlowBps: 3000,
    statementRatios: {
      currentRatio: {
        valueBps: "17500",
        numeratorMinor: "700000",
        denominatorMinor: "400000",
        method: "current_assets_over_payables_and_all_borrowings_conservative_proxy",
      },
      debtToEquity: ratio,
      grossMargin: { valueBps: "4000", numeratorMinor: "400", denominatorMinor: "1000", method: "gross_profit_over_revenue" },
    },
    arithmeticChecks: [
      { identity: "assets_equal_liabilities_plus_equity", status: "consistent" },
      { identity: "gross_profit_equals_revenue_minus_cost_of_sales", status: "unavailable" },
    ],
  });
}
