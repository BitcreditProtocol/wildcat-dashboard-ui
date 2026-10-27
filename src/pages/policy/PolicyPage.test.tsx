import { getByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { policyFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import PolicyPage from "./PolicyPage";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PolicyPage", () => {
  it("lists each programme with its pack's parameters, read-only", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/credit-policy": () => json(policyFixture()) }));
    const { page } = await renderWithProviders(<PolicyPage />, "/policy");
    expect(page.textContent).toContain("Change the policy by publishing a new reviewed release");
    expect(page.textContent).toContain("seasonal_coffee_accepted_ebill_discount · Guatemala · coffee_production");
    expect(page.textContent).toContain("Programme gt_coffee_seasonal_accepted_bill · version synthetic-guatemala-coffee-program-v2");
    expect(page.textContent).toContain("Policy pack synthetic-guatemala-coffee-v12");
    expect(page.textContent).toContain("Time to maturity30–240 days");
    expect(page.textContent).toContain("Maximum bill sum20,000,000 sat");
    expect(page.textContent).toContain("Minimum useful amount offered500,000 sat");
    expect(page.textContent).toContain("Operating cost per case50,000 sat");
    expect(page.textContent).toContain("Maximum effective annual rate15% (1500 bps)");
    expect(page.textContent).toContain("Maximum fee ratio30% (3000 bps)");
    expect(page.textContent).toContain("Uncertainty margin · corroborated evidence2% (200 bps)");
    expect(page.textContent).toContain("Offer validity2 days");
    expect(page.textContent).toContain("Adjust the price and requote within the ceilingsNot allowed");
    expect(page.textContent).toContain("Waive a hard gateNever");
    expect(page.textContent).toContain("bill_already_financed");
    expect(page.querySelector("dd.font-mono")?.textContent).toBe(`sha256:${"9".repeat(64)}`);
    expect(page.querySelector("input, textarea, select, form")).toBeNull();
    expect(page.textContent).not.toContain("Policy packs without a programme");
  });

  it("shows a calm retryable message when the policy cannot be read", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/credit-policy": () => new Response(null, { status: 500 }) }));
    const { page } = await renderWithProviders(<PolicyPage />, "/policy");
    expect(getByRole(page, "alert").textContent).toContain("This check could not be loaded.");
    expect(getByRole(page, "button", { name: "Try again" })).toBeEnabled();
  });
});
