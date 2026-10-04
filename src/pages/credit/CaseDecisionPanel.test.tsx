import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { CaseDecisionPanel, ProposedTerms } from "./CaseDecisionPanel";
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
};

let root: Root | undefined;
function render(withBreakdown: boolean, parts = breakdown.parts, synthetic = false) {
  act(() => root?.unmount());
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <PreferencesProvider>
          <ProposedTerms
            terms={terms}
            policy={policy}
            breakdown={withBreakdown ? { ...breakdown, parts } : undefined}
            synthetic={synthetic}
            mayAdjust={false}
          />
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
      // The payer's figures and the record behind them are stated once, in "How sure we are".
      "Payer risk96,000sat",
      "Uncertainty40,000sat",
      "Funding cost40,000sat",
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

  it("says when the fee was calculated from synthetic test values, and only then", () => {
    const notice = (page: HTMLElement) => page.querySelector("[data-synthetic-notice]")?.textContent;

    expect(notice(render(true, breakdown.parts, true))).toBe(
      "Test values: the fee policy and the payer risk are synthetic, not calibrated."
    );
    expect(notice(render(true))).toBeUndefined();
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

describe("CaseDecisionPanel", () => {
  function renderPanel(props: Parameters<typeof CaseDecisionPanel>[0]) {
    act(() => root?.unmount());
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root?.render(
        <IntlProvider locale="en">
          <PreferencesProvider>
            <CaseDecisionPanel {...props} />
          </PreferencesProvider>
        </IntlProvider>
      )
    );
    return container;
  }

  it("shows a recorded offer's terms instead of repeating the quote status beside the case", () => {
    const page = renderPanel({
      statusLabel: "Offered",
      recordedOffer: { billSat: 1_900_000, availableToMintSat: 1_830_745, expiresAt: "2026-10-05T18:00:00Z" },
    });

    expect(page.querySelector("#case-decision-offer")?.textContent).toBe("Offer terms");
    expect(page.textContent).toContain("Expires Oct 5");
    expect(page.textContent).toContain("Available to mint1,830,745sat");
    expect(rows(page)).toEqual(["Minting fee3.65% of the bill69,255sat"]);
    expect(page.textContent).not.toContain("Offered");
  });

  it("states the quote status only when it has nothing else to show", () => {
    expect(renderPanel({ statusLabel: "Denied" }).querySelector("header")?.textContent).toBe("DecisionDenied");
  });

  it("lets proposed terms replace a recorded offer", () => {
    const page = renderPanel({
      statusLabel: "Pending",
      recordedOffer: { billSat: 8_000_000, availableToMintSat: 7_000_000 },
      actionableTerms: { terms, policy, synthetic: false, mayAdjust: false },
    });

    expect(page.querySelector("#case-decision-offer")).toBeNull();
    expect(page.querySelector("#case-decision-terms")?.textContent).toBe("Proposed minting fee");
  });
});
