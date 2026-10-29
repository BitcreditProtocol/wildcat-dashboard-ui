import { creditPolicyCatalogueSchema, fraudReasonCodes } from "@bitcredit/ai-credit-shared";
import { fireEvent, getByRole, getAllByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage, { PortfolioSnapshot } from "./HomePage";
import { parseCapacity, parseMintSummary, type MintSummary } from "./operator-api";
import { policyFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
import { exposureIdentities } from "./counterparty-exposure";
import { maturityBuckets } from "./portfolio-maturity";
import { cleanup, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesOptions: () => ({ queryKey: ["legacy-quotes"], queryFn: () => Promise.resolve({ data: [] }) }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function summary(): MintSummary {
  return {
    schema: "operator-mint-summary-v1",
    observedAt: "2026-10-28T00:00:00.000Z",
    coverage: { complete: true, listed: 1, scanned: 1, limit: 128, failures: 0 },
    queue: [
      { quoteId: "quote-one", caseId: "case-one", kind: "quote", since: "2026-10-01T00:00:00.000Z" },
      { quoteId: "quote-one", caseId: "case-one", kind: "buyer-confirmation", since: null },
    ],
    portfolio: {
      financedSat: "900000",
      committedSat: "900000",
      outstandingSat: "900000",
      counterparties: [{ role: "drawee", ref: "buyer", name: "Cooperativa Synthetic", usedSat: "900000", capSat: "1000000" }],
      quotes: [
        {
          quoteId: "quote-one",
          caseId: "case-one",
          billId: "bill",
          amountSat: "900000",
          currency: "SAT",
          maturity: "2026-11-01",
          drawer: { ref: "drawer", name: "Finca Synthetic" },
          drawee: { ref: "buyer", name: "Cooperativa Synthetic" },
          state: "Accepted",
          since: null,
          financed: true,
          exposure: true,
          paid: false,
        },
      ],
    },
  };
}
describe("Today cockpit", () => {
  it("groups only by identity, keeps role caps, and flags exact and look-alike names including pending buyers", async () => {
    const book = summary();
    book.portfolio.counterparties.push({ ...book.portfolio.counterparties[0], role: "drawer", usedSat: "20" });
    book.portfolio.quotes.push({
      ...book.portfolio.quotes[0],
      quoteId: "other",
      exposure: false,
      drawee: { ref: "different-buyer", name: "Cooperativa Synthetic" },
    });
    const groups = exposureIdentities(book);
    expect(groups).toHaveLength(1);
    expect(groups[0].roles.map((p) => p.usedSat)).toEqual(["900000", "20"]);
    expect(groups[0].sameName).toBe(true);
    book.portfolio.counterparties.push({ ...book.portfolio.counterparties[0], ref: "different-buyer", usedSat: "10" });
    expect(exposureIdentities(book)).toHaveLength(2);
    const { page } = await renderWithProviders(<PortfolioSnapshot summary={book} />);
    expect(getAllByRole(page, "link", { name: "Same name, different identity — check Directory" })).toHaveLength(2);
    expect(getByRole(page, "link", { name: "buyer" })).toHaveAttribute("href", "/directory?q=buyer");
    cleanup();
    book.portfolio.quotes[1].drawee.name += " R.L.";
    book.portfolio.counterparties.pop();
    expect(exposureIdentities(book)[0]).toMatchObject({ sameName: false, similarName: true });
  });
  it("links each identity's conservative cap to matching published policy sources, keeping missing provenance explicit", async () => {
    const catalogue = policyFixture();
    const base = catalogue.policyPacks[0];
    const pack = {
      ...base,
      schemaVersion: "synthetic-credit-policy-pack-v13",
      calculationVersion: "deterministic-credit-core-v11",
      policyPackVersion: "synthetic-coffee-cap-v13",
      reasonCodes: [...new Set([...base.reasonCodes, ...fraudReasonCodes])],
      maximumRepaymentShareOfNetCashFlowBps: 8000,
      maximumDraweeExposureSat: "1000000",
      maximumDrawerExposureSat: "2000000",
      buyerConfirmationRequiredAboveSat: "100",
      invoiceToBillToleranceBps: 100,
      maximumBillSumWithoutTaxDocumentSat: "1000000",
      hardGatePrecedence: [
        "bill_already_financed",
        "finance_lock_held_elsewhere",
        "bill_not_accepted",
        "tenor_outside_policy",
        "bill_sum_above_policy_cap",
        "invoice_commercially_implausible",
        "invoice_cancelled_at_tax_authority",
        "counterparty_exposure_above_policy_cap",
        "buyer_denied_obligation",
        "bill_sum_without_tax_document_above_policy_cap",
      ],
    };
    vi.stubGlobal(
      "fetch",
      routeFetch({ "/api/ai-credit/credit-policy": () => json(creditPolicyCatalogueSchema.parse({ ...catalogue, policyPacks: [pack] })) })
    );
    const book = summary();
    book.portfolio.counterparties.push({ ...book.portfolio.counterparties[0], role: "drawer", ref: "unmatched", capSat: "3000000" });
    const { page } = await renderWithProviders(<PortfolioSnapshot summary={book} />);
    expect(getByRole(page, "link", { name: "synthetic-coffee-cap-v13" })).toHaveAttribute(
      "href",
      "/policy#policy-synthetic-coffee-cap-v13"
    );
    expect(page).toHaveTextContent("not reported; check Policy");
  });
  it("links action cards to the action, shows ages, and renders generic capacity warnings", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/operator-mint-summary": () => json(summary()),
        "/api/ai-credit/operator-capacity": () =>
          json({
            schema: "operator-capacity-v1",
            observedAt: "2026-10-28T00:00:00Z",
            items: [{ id: "new-kind", label: "Synthetic storage", used: 90, limit: 100, unit: "bytes", status: "warning" }],
          }),
      })
    );
    const { page } = await renderWithProviders(<HomePage />);
    expect(getByRole(getByRole(page, "region", { name: "Action queue" }), "link", { name: /Quotes to review/ }).getAttribute("href")).toBe(
      "/quotes/quote-one"
    );
    expect(
      getByRole(getByRole(page, "region", { name: "Action queue" }), "link", { name: /Buyer confirmations due/ }).getAttribute("href")
    ).toBe("/quotes/quote-one#fraud-controls");
    expect(page.textContent).toContain("Oldest");
    expect(page.textContent).toContain("Capacity needs attention");
    expect(getByRole(page, "meter", { name: "Synthetic storage" }).getAttribute("aria-valuenow")).toBe("90");
    expect(page.textContent).toContain("Cooperativa Synthetic");
    const actions = getByRole(page, "heading", { name: /Needs you/ }).closest("section");
    expect(actions).toHaveTextContent("Decision needed");
    expect(getByRole(page, "link", { name: /Buyer confirmations due/ })).toHaveAttribute("href", "/quotes/quote-one#fraud-controls");
    expect(actions).toHaveTextContent("Cooperativa Synthetic");
    expect(actions).toHaveTextContent("900,000");
    expect(actions).toHaveTextContent("Nov 1, 2026");
  });
  it("omits capacity on 404 and never interprets unavailable queues as empty", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/operator-mint-summary": () => json(summary()) }));
    const { page } = await renderWithProviders(<HomePage />);
    expect(page.querySelector("#capacity")).toBeNull();
    expect(getAllByRole(page, "link", { name: /Unavailable/ })).toHaveLength(2);
  });
  it("keeps missing payment and partial portfolio coverage visibly unknown", async () => {
    const book = summary();
    book.coverage.complete = false;
    book.portfolio.outstandingSat = null;
    book.portfolio.quotes[0].paid = null;
    const { page } = await renderWithProviders(<PortfolioSnapshot summary={book} />);
    expect(page.textContent).toContain("Partial coverage");
    expect(page.textContent).toContain("Not reported");
    expect(page.textContent).toContain("ladder is unavailable");
  });
  it("lets operators inspect seasonal maturities beyond 90 days without counting paid or pending bills", async () => {
    const book = summary();
    const base = book.portfolio.quotes[0];
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    book.portfolio.quotes = [90, 91, 180, 181, 365, 366].map((days) => ({
      ...base,
      maturity: new Date(today + days * 86400000).toISOString().slice(0, 10),
      amountSat: "1",
    }));
    book.portfolio.quotes.push({ ...base, paid: true }, { ...base, financed: false });
    expect(maturityBuckets(book, today, 365)).toEqual([1n, 2n, 2n]);
    expect(maturityBuckets(book, today, 90)).toEqual([0n, 0n, 1n]);
    const { page } = await renderWithProviders(<PortfolioSnapshot summary={book} />);
    const selector = getByRole(page, "combobox", { name: "Maturity horizon" });
    expect(selector).toHaveValue("365");
    expect(page.textContent).toContain("Maturity ladder · next 365 days");
    fireEvent.change(selector, { target: { value: "90" } });
    expect(page.textContent).toContain("Maturity ladder · next 90 days");
  });
  it("buckets only unpaid accepted maturities, including exact UTC day boundaries", () => {
    const book = summary();
    const base = book.portfolio.quotes[0];
    book.portfolio.quotes = [0, 30, 31, 60, 61, 90, 91, -1].map((days) => ({
      ...base,
      maturity: new Date(Date.UTC(2026, 9, 28 + days)).toISOString().slice(0, 10),
      amountSat: "1",
    }));
    book.portfolio.quotes.push({ ...base, paid: true }, { ...base, financed: false });
    expect(maturityBuckets(book, Date.UTC(2026, 9, 28))).toEqual([2n, 2n, 2n]);
    expect(parseMintSummary(summary()).portfolio.quotes[0].currency).toBe("SAT");
    expect(() => parseMintSummary({ ...summary(), portfolio: { ...summary().portfolio, financedSat: "-1" } })).toThrow();
    expect(
      parseCapacity({
        schema: "operator-capacity-v1",
        observedAt: "now",
        items: [{ id: "off", label: "Unavailable", used: 0, limit: 0, status: "full", unit: "count" }],
      }).items[0].limit
    ).toBe(0);
  });
});
