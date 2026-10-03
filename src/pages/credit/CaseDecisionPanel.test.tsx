import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { ProposedTerms } from "./CaseDecisionPanel";
import type { DecisionCase, DecisionTerms } from "./decision-types";
import type { FeeBreakdown } from "./fee-breakdown";

const terms: DecisionTerms = {
  billSumSat: "8000000",
  discountedSat: "7734000",
  appliedDiscountSat: "216000",
  operatingCostSat: "50000",
  effectiveFeeSat: "266000",
  tenorDays: 180,
  annualDiscountBps: 540,
  effectiveAnnualBps: 688,
  feeRatioBps: 333,
  offerExpiresOn: "2026-10-04",
  maturityDate: "2027-02-06",
  endorsementExposureSat: "8000000",
};
const policy = { maximumFeeRatioBps: 3000, maximumEffectiveAnnualBps: 1500 } as DecisionCase["policyPack"];
const breakdown: FeeBreakdown = {
  billSat: 8_000_000,
  holderReceivesSat: 7_734_000,
  feeSat: 266_000,
  operatingCostSat: 50_000,
  tenorDays: 180,
  feeRatioBps: 333,
  parts: [
    { key: "payerRisk", sat: 96_000, bps: 240 },
    { key: "uncertainty", sat: 40_000, bps: 100 },
    { key: "funding", sat: 40_000, bps: 100 },
    { key: "mintReturn", sat: 40_000, bps: 100 },
  ],
  payerRisk: { probabilityOfDefaultBps: 600, lossGivenDefaultBps: 4000 },
  uncertainty: { evidenceState: "corroborated" },
};

let root: Root | undefined;
function render(withBreakdown: boolean, parts = breakdown.parts) {
  act(() => root?.unmount());
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <PreferencesProvider>
          <ProposedTerms terms={terms} policy={policy} breakdown={withBreakdown ? { ...breakdown, parts } : undefined} mayAdjust={false} />
        </PreferencesProvider>
      </IntlProvider>
    )
  );
  return container;
}

const rows = (page: HTMLElement) => [...page.querySelectorAll("dl > div")].map((row) => row.textContent);

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("ProposedTerms", () => {
  it("leads with what the holder can mint and lists what the fee pays for, in sat", () => {
    const page = render(true);

    expect(page.textContent).toContain("Holder would receive7,734,000sat");
    expect(page.textContent).toContain("for a 8,000,000 sat bill due Feb 6, 2027");
    expect(rows(page)).toEqual([
      "Discount for 180 days216,000sat",
      "Payer risk6.00% non-payment × 40.00% loss96,000sat",
      "UncertaintyPayer record Mint-signed, corroborated40,000sat",
      "Funding costUntil maturity40,000sat",
      "Mint margin40,000sat",
      "Operating costFixed per case50,000sat",
      "Minting fee3.33% of the bill266,000sat",
      // The PRD discloses what the payer owes at maturity and the applicant's contingent recourse with the fee.
      "Payer pays at maturity8,000,000sat",
      "Applicant liable if unpaid8,000,000sat",
    ]);
  });

  it("does not lead with a yearly rate; the policy caps are explained on demand", () => {
    const page = render(true);
    const limits = page.querySelector("details");

    expect([...page.querySelectorAll("dl")].map((list) => list.textContent).join("")).not.toMatch(
      /a year|per year|annual|interest|credit/i
    );
    expect(limits?.open).toBe(false);
    expect(limits?.querySelector("summary")?.textContent).toBe("Within the Mint's fee limits");
    expect(limits?.textContent).toContain("caps a fee at 30.00% of the bill, and at 15.00% a year measured on the amount paid out");
    expect(limits?.textContent).toContain("This fee is 3.33% of the bill, or 6.88% a year on the amount paid out.");
  });

  it("shows a subsidy as a signed reduction", () => {
    const page = render(true, [...breakdown.parts.slice(0, 3), { key: "subsidy", sat: -16_000, bps: 40 }]);

    expect(rows(page).find((row) => row?.startsWith("Subsidy"))).toBe("Subsidy-16,000sat");
  });

  it("keeps the discount as one line when no verified breakdown exists", () => {
    const page = render(false);

    expect(rows(page)).toEqual([
      "Discount for 180 days216,000sat",
      "Operating costFixed per case50,000sat",
      "Minting fee3.33% of the bill266,000sat",
      "Payer pays at maturity8,000,000sat",
      "Applicant liable if unpaid8,000,000sat",
    ]);
    expect(page.textContent).toContain("Within the Mint's fee limits");
  });
});
