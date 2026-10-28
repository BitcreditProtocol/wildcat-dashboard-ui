import { screen, within } from "@testing-library/dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
import { ApplicantCapacityPanel } from "./ApplicantCapacityPanel";
import { capacityFixture, farmInformation, financeDigest } from "./applicant-capacity-test-fixtures";
import { fraudCaseFixture } from "./fraud-controls-test-fixtures";
import { financialMoney } from "./financial-display";

afterEach(cleanup);

describe("applicant capacity", () => {
  it("shows both IFRS tables, field provenance, exact amounts, arithmetic and advisory policy ratios", async () => {
    const one = fraudCaseFixture();
    one.snapshot.applicantCapacity = capacityFixture();
    await renderWithProviders(<ApplicantCapacityPanel decisionCase={one} />);
    const panel = screen.getByRole("region", { name: "Applicant capacity · advisory" });
    const position = within(panel).getByRole("table", { name: "Statement of financial position" });
    const income = within(panel).getByRole("table", { name: "Statement of comprehensive income" });
    expect(within(position).getAllByRole("row")).toHaveLength(10);
    expect(within(income).getAllByRole("row")).toHaveLength(7);
    expect(within(position).getByRole("row", { name: /Cash and cash equivalents/ })).toHaveTextContent("0.00 GTQ");
    expect(within(position).getByRole("row", { name: /Cash and cash equivalents/ })).toHaveTextContent(
      "ApplicantApplicant-confirmed claimNo page citation"
    );
    expect(within(position).getByRole("row", { name: /Inventories/ })).toHaveTextContent(
      "Not providedGTQ · 2ApplicantUnconfirmedNo page citation"
    );
    expect(within(position).getByRole("row", { name: /Borrowings/ })).toHaveTextContent(
      "123.45 GTQGTQ · 2Statement PDFApplicant-confirmed claimPage 2: Synthetic statement line"
    );
    for (const text of [
      "Statements · annual accrual profit proxy",
      "2025-01-01 to 2025-12-31",
      "Synthetic annual statements",
      "pdf-parser-v1",
      financeDigest,
      "Assets = liabilities + equity · Consistent",
      "Gross profit = revenue − cost of sales · Unavailable",
      "120000.00 GTQ",
      "Governed calculation · Applicant-confirmed claim",
      "not independently verified",
      "51.33%",
      "30.00%",
      "maximumRepaymentShareOfNetCashFlowBps",
      one.policyPack.policyPackDigest,
      "1.7500×",
      "40.00%",
      "numerator 700000 / denominator 400000",
      "missing or nonpositive denominator",
      "all borrowings are assumed current",
      "Annual accrual profit is a proxy",
      "exceeds the advisory repayment-share reference",
      "never a gate or price input",
      "acceptor remains the primary risk axis",
      "absence is neutral",
    ])
      expect(panel).toHaveTextContent(text);
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows seasonal farm quantities and expenses, explicit zero income, and labels annualization", async () => {
    const one = fraudCaseFixture();
    const capacity = capacityFixture(farmInformation());
    capacity.cashFlowMethod = "seasonal_projection_annualized";
    capacity.reviewReasons = ["projected_season_repetition_requires_human_review"];
    one.snapshot.applicantCapacity = capacity;
    await renderWithProviders(<ApplicantCapacityPanel decisionCase={one} />);
    const table = screen.getByRole("table", { name: "Seasonal farm and household cash flow" });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getByRole("row", { name: /Other household income/ })).toHaveTextContent("0.00 GTQ");
    expect(within(table).getByRole("row", { name: /Existing debt payments/ })).toHaveTextContent(
      "300.00 GTQGTQ · 2ApplicantApplicant-confirmed claim"
    );
    const panel = screen.getByRole("region");
    for (const text of [
      "Farm cash flow · annualized seasonal projection",
      "Synthetic coffee",
      "Harvest 2026",
      "2.5 ha",
      "800 kg",
      "2026-01-01 to 2026-06-30",
      "Projection assumes repeated seasons; human review required",
    ])
      expect(panel).toHaveTextContent(text);
    expect(screen.queryByRole("table", { name: "Statement of financial position" })).not.toBeInTheDocument();
  });

  it("keeps an incomplete farm budget empty with unavailable cash flow and ratios", async () => {
    const one = fraudCaseFixture();
    const information = farmInformation();
    if (!information.farmCashFlow) throw new Error("Missing farm fixture");
    information.farmCashFlow.existingDebtPayments = {
      ...information.farmCashFlow.existingDebtPayments,
      valueMinor: null,
      state: "unconfirmed",
    };
    const capacity = capacityFixture(information);
    capacity.cashFlowMethod = "unavailable";
    capacity.netAnnualCashFlow = null;
    capacity.billShareOfNetCashFlow = { ...capacity.billShareOfNetCashFlow, valueBps: null, denominatorMinor: null };
    capacity.reviewFlag = false;
    capacity.reviewReasons = [];
    capacity.status = "not_assessed";
    one.snapshot.applicantCapacity = capacity;
    await renderWithProviders(<ApplicantCapacityPanel decisionCase={one} />);
    const table = screen.getByRole("table", { name: "Seasonal farm and household cash flow" });
    const debt = within(table).getByRole("row", { name: /Existing debt payments/ });
    expect(debt).toHaveTextContent("Not providedGTQ · 2ApplicantUnconfirmed");
    expect(debt).not.toHaveTextContent("0.00 GTQ");
    expect(screen.getByRole("region")).toHaveTextContent("Net annual cash flow / proxy: Not provided");
    expect(screen.getByRole("region")).toHaveTextContent("Unavailable · missing or nonpositive denominator");
  });

  it.each([false, true])("keeps absent optional finances neutral (capacity object present: %s)", async (present) => {
    const one = fraudCaseFixture();
    if (present) {
      const capacity = capacityFixture(null);
      Object.assign(capacity, {
        status: "not_assessed",
        reviewFlag: false,
        reviewReasons: [],
        cashFlowMethod: "unavailable",
        netAnnualCashFlow: null,
        billFaceOrientation: null,
        fxRate: null,
      });
      capacity.billShareOfNetCashFlow = { valueBps: null, numeratorMinor: null, denominatorMinor: null, method: "synthetic-unavailable" };
      capacity.statementRatios = {
        currentRatio: capacity.billShareOfNetCashFlow,
        debtToEquity: capacity.billShareOfNetCashFlow,
        grossMargin: capacity.billShareOfNetCashFlow,
      };
      capacity.arithmeticChecks = [];
      one.snapshot.applicantCapacity = capacity;
    }
    await renderWithProviders(<ApplicantCapacityPanel decisionCase={one} />);
    const panel = screen.getByRole("region");
    expect(panel).toHaveTextContent("Cash-flow method: None · unavailable");
    expect(panel).toHaveTextContent("Absence is neutral");
    expect(panel).not.toHaveTextContent("Human review flagged");
    expect(within(panel).queryByRole("table")).not.toBeInTheDocument();
  });

  it("retains inconsistent arithmetic and unknown review reasons without recomputing the governed snapshot", async () => {
    const one = fraudCaseFixture();
    const capacity = capacityFixture();
    capacity.arithmeticChecks[0].status = "inconsistent";
    capacity.reviewReasons = ["statement_arithmetic_inconsistent", "future_reason"];
    capacity.netAnnualCashFlow = null;
    capacity.cashFlowMethod = "unavailable";
    one.snapshot.applicantCapacity = capacity;
    await renderWithProviders(<ApplicantCapacityPanel decisionCase={one} />);
    expect(screen.getByRole("region")).toHaveTextContent("Assets = liabilities + equity · Inconsistent");
    expect(screen.getByRole("region")).toHaveTextContent("excluded from the cash-flow proxy");
    expect(screen.getByRole("region")).toHaveTextContent("Additional review reason: future_reason");
    expect(screen.getByRole("region")).toHaveTextContent("Net annual cash flow / proxy: Not provided");
  });

  it("formats large and negative decimal money without floating point rounding", () => {
    expect(financialMoney("900719925474099312345", "GTQ", 2)).toBe("9007199254740993123.45 GTQ");
    expect(financialMoney("-1", "USD", 2)).toBe("-0.01 USD");
    expect(financialMoney("0", "SAT", 0)).toBe("0 SAT");
  });
});
