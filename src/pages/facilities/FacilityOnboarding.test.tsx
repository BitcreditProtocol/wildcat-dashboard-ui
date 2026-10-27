import { fireEvent, getByRole, queryByRole } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  intelligenceFixture,
  masterDataFixture,
  onboardingChecksFixture,
  otherApplicationId,
} from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, json, renderWithProviders, requestBody, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { FacilityCase } from "./FacilityCase";
import { FacilityQueue } from "./FacilityQueue";
import { facilityFixture } from "./facility-test-fixture";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
vi.mock("@/keycloak", () => ({ default: { authenticated: true, subject: "operator-a", tokenParsed: { iss: "https://issuer.test" } } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const application = facilityFixture({
  profile: { country: "Guatemala", industry: "Coffee" },
  request: {
    schemaVersion: "facility-request-v1",
    product: "minting",
    amountSat: "2500000",
    tenorDays: 90,
    purpose: "Pay pickers before the cooperative settles",
  },
  masterData: masterDataFixture,
});

function stubChecks(checks = onboardingChecksFixture()) {
  const request = vi.fn(
    routeFetch({
      "/api/ai-credit/facility-onboarding-checks": () => json(checks),
      "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()),
    })
  );
  vi.stubGlobal("fetch", request);
  return request;
}

async function renderCase(app = application) {
  return renderWithProviders(<FacilityCase application={app} live busy={false} onCommand={() => Promise.resolve()} />);
}

describe("facility onboarding", () => {
  it("shows the reference and the request as the applicant's statement", async () => {
    stubChecks();
    const { page } = await renderCase();
    expect(page.querySelector("header")?.textContent).toContain("Reference MOB-11111111");
    expect(page.textContent).toContain("The applicant’s statement, not terms.");
    expect(page.textContent).toContain("Minting");
    expect(page.textContent).toContain("2,500,000 sat");
    expect(page.textContent).toContain("90 days");
    expect(page.textContent).toContain("Pay pickers before the cooperative settles");
  });

  it("masks the identification number until the operator reveals it", async () => {
    const request = stubChecks();
    const { page } = await renderCase();
    expect(requestBody(request.mock.calls.find(([path]) => path.endsWith("onboarding-checks"))?.[1])).toEqual({
      applicationId: application.id,
    });
    expect(page.textContent).not.toContain("DPI-1234-5678");
    expect(page.textContent).toContain("••••••••");
    const toggle = getByRole(page, "button", { name: "Show identification number" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    act(() => {
      fireEvent.click(toggle);
    });
    expect(page.textContent).toContain("DPI-1234-5678");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    act(() => {
      fireEvent.click(toggle);
    });
    expect(page.textContent).not.toContain("DPI-1234-5678");
  });

  it("reports completeness, email verification and possible duplicates without deciding", async () => {
    stubChecks();
    const { page } = await renderCase();
    expect(page.textContent).toContain("Signature (person)");
    expect(page.textContent).toContain("Email confirmed by this Mint");
    expect(page.textContent).toContain("Seal (company)");
    expect(page.textContent).toContain("Missing: Email, Registration date, and Proof of registration");
    expect(page.textContent).toContain("Email not confirmed");
    expect(page.textContent).toContain("FN-2020/17");
    expect(page.textContent).toContain("1 recorded signatory");
    expect(getByRole(page, "link", { name: "Look up Finca Verde S.A. in the directory" }).getAttribute("href")).toBe(
      "/directory?q=Finca+Verde+S.A."
    );
    expect(page.textContent).toContain("Informational only: nothing here changes the application or its decision.");
  });

  it("links the history at this Mint to quotes and other applications, not to itself", async () => {
    stubChecks();
    const { page } = await renderCase();
    expect(getByRole(page, "link", { name: "Quote · Accepted · Drawer, Payee" }).getAttribute("href")).toBe(
      "/quotes/97e45adf-fc86-4b30-9322-afae434c3287"
    );
    const other = getByRole(page, "link", { name: "Onboarding application MOB-22222222 · Application declined · Seal (company)" });
    expect(other.getAttribute("href")).toBe(`/facilities?application=${otherApplicationId}`);
    expect(queryByRole(page, "link", { name: /MOB-11111111/u })).toBeNull();
  });

  it("says when the applicant shared no master data and nothing is known at this Mint", async () => {
    stubChecks(onboardingChecksFixture({ masterData: null, directory: { complete: false, size: 0, matches: [] }, historyAtMint: [] }));
    const { page } = await renderCase(facilityFixture());
    expect(page.textContent).toContain("The applicant shared no master data with this application.");
    expect(page.textContent).toContain("A missing match here proves nothing.");
    expect(page.textContent).toContain("No other quotes or applications at this Mint name these identities.");
    expect(page.textContent).not.toContain("The applicant’s statement, not terms.");
  });

  it("shows the Mint's current notes on the case's country, industry and the macro economy as context", async () => {
    stubChecks();
    const { page } = await renderCase();
    expect(page.textContent).toContain("Mint Intelligence · context");
    expect(page.textContent).toContain("Context for people. Not used by pricing, gates or the AI interview.");
    expect(page.textContent).toContain("Harvest season shifts");
    expect(page.textContent).toContain("Prices fell this quarter");
    expect(page.textContent).toContain("Policy rate unchanged");
    expect(page.textContent).not.toContain("Port strike");
  });

  it("shows the reference in the queue", async () => {
    const { page } = await renderWithProviders(
      <FacilityQueue applications={[application]} params={new URLSearchParams()} onParamsChange={() => undefined} />,
      "/facilities"
    );
    expect(page.querySelector("tbody th")?.textContent).toContain("MOB-11111111");
  });
});
