import { getByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BillInfo } from "@/generated/client/types.gen";
import { intelligenceFixture, policyFixture, signerReviewFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { DecisionBrief } from "./DecisionBrief";
import { fraudCaseFixture } from "@/pages/credit/fraud-controls-test-fixtures";
import { matchedBriefNotes, recordedGateStatus } from "./decision-brief-data";
vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("quote decision brief", () => {
  it("puts the amount, unavailable governed assessment, dated regional notes and directory look-alikes together", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()),
        "/api/ai-credit/credit-policy": () => json(policyFixture()),
        "/api/ai-credit/bill-signer-review": () => json(signerReviewFixture()),
      })
    );
    const bill = {
      id: "bill-one",
      sum: 10000000,
      maturity_date: "2026-12-01",
      drawer: { node_id: "drawer", country: "GT" },
      drawee: { node_id: "buyer" },
    } as BillInfo;
    const { page } = await renderWithProviders(<DecisionBrief quoteId="quote-one" bill={bill} />);
    const context = page.querySelector("details");
    if (context) context.open = true;
    expect(page.textContent).toContain("10,000,000 sat");
    expect(page.textContent).toContain("No governed price");
    expect(getByRole(page, "link", { name: /Harvest season shifts/ }).getAttribute("href")).toContain("/intelligence#note-");
    expect(getByRole(page, "link", { name: /Finca Verde/ }).getAttribute("href")).toContain("/directory?");
    expect(page.textContent).toContain("Authored");
  });
  it("links each fired gate to its exact published policy and keeps unresolved gates unknown", async () => {
    const one = fraudCaseFixture();
    const policy = policyFixture();
    const pack = policy.policyPacks[0];
    one.policyPack.policyPackDigest = pack.policyPackDigest;
    one.result.assessmentTrace = [
      {
        ruleId: "bill_not_accepted",
        subject: "instrument_eligibility",
        outcome: "fail",
        reasonCode: "bill_not_accepted",
        observed: {},
        policy: {},
      },
    ];
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/credit-policy": () => json(policy) }));
    const bill = {
      id: "bill-a",
      sum: 8000000,
      maturity_date: "2027-02-06",
      drawer: { node_id: "drawer", country: "GT" },
      drawee: { node_id: "buyer-node" },
    } as BillInfo;
    const { page } = await renderWithProviders(<DecisionBrief quoteId="quote-a" bill={bill} decisionCase={one} />);
    // A failed gate reads as what went wrong, in plain words, and still links to its exact rule.
    const gate = getByRole(page, "link", { name: "Buyer hasn’t accepted the bill" });
    expect(gate.getAttribute("href")).toBe(`/policy#policy-${pack.policyPackVersion}--bill_not_accepted`);
    expect(recordedGateStatus(one, "tenor_outside_policy")).toBe("unknown");
    expect(recordedGateStatus(one, "bill_not_accepted")).toBe("fail");
  });
  it("matches country/industry terms and macro context without pulling unrelated regions", () => {
    const notes = matchedBriefNotes(intelligenceFixture(), ["Guatemala", "coffee_production"]);
    expect(notes.some((n) => n.subject === "Guatemala")).toBe(true);
    expect(notes.some((n) => n.scope === "macro")).toBe(true);
    expect(notes.some((n) => n.subject === "Honduras")).toBe(false);
  });
});
