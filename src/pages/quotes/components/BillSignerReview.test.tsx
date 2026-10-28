import { directoryNetworkFixture, publicListingFixture, publicNodeId } from "@/pages/credit/network-controls-test-fixtures";
import { fireEvent, getByRole } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureQuoteId, signerReviewFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, flush, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { BillSignerReviewPanel, BillSignerReviewView } from "./BillSignerReview";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BillSignerReviewView", () => {
  it("explains each signal as a review signal, never a finding", async () => {
    const { page } = await renderWithProviders(<BillSignerReviewView review={signerReviewFixture()} />);
    expect(page.textContent).toContain("Signed in quick succession");
    expect(page.textContent).toContain("Two distinct parties signed consecutive blocks 12 seconds apart.");
    expect(page.textContent).toContain("Finca Verde and Carlos Ruiz · Blocks 0, 1");
    expect(page.textContent).toContain("Signed from a different address");
    // Two signals plus one party's directory matches each carry the label.
    expect(page.textContent?.match(/Review signal — not a finding/g)).toHaveLength(3);
    expect(page.textContent).not.toMatch(/fraud/i);
  });

  it("shows each party's master data, signatures and possible duplicates", async () => {
    const { page } = await renderWithProviders(<BillSignerReviewView review={signerReviewFixture()} />);
    expect(page.textContent).toContain("Master data complete");
    expect(page.textContent).toContain("Missing: Postal address and Email");
    expect(page.textContent).toContain("Applicant");
    expect(page.textContent).toContain("Person · Payee · Holder");
    expect(page.textContent).toContain("Issued the bill");
    expect(page.textContent).toContain("Signed by Ana López for Finca Verde");
    expect(page.textContent).toContain("Signed at: Ruta 9, Escuintla, Guatemala");
    expect(page.textContent).toContain("Differs from the party’s address");
    expect(page.textContent).toContain("No signature by this party in the history checked.");
    const duplicate = getByRole(page, "link", { name: "Look up Finca Verde S.A. in the directory" });
    expect(duplicate.getAttribute("href")).toBe("/directory?q=Finca+Verde+S.A.");
    expect(page.textContent).toContain("Same email");
    expect(page.textContent).toContain("Similar name");
    expect(getByRole(page, "link", { name: "Quote · Offered · Drawer" }).getAttribute("href")).toBe(
      "/quotes/87e45adf-fc86-4b30-9322-afae434c3288"
    );
  });

  it("states what the protocol records and what it does not", async () => {
    const { page } = await renderWithProviders(<BillSignerReviewView review={signerReviewFixture()} />);
    expect(page.textContent).toContain(
      "Recorded: signing time, stated signing address, signer key, and company signatory. Not recorded by the eBill protocol: device and geolocation."
    );
    expect(page.textContent).not.toContain("could not serve");
  });

  it("says when only bill data could be checked and the directory is incomplete", async () => {
    const review = signerReviewFixture({
      historyAvailable: false,
      directoryComplete: false,
      signals: [],
      fingerprint: { recorded: [], notRecorded: ["device", "geolocation"] },
    });
    const { page } = await renderWithProviders(<BillSignerReviewView review={review} />);
    expect(page.textContent).toContain("Only the bill’s party data was checked: signature checks are missing, not clear.");
    expect(page.textContent).toContain("A missing match here proves nothing.");
    expect(page.textContent).toContain("No review signals in the data checked.");
    expect(page.textContent).toContain("Recorded: nothing checked");
  });
});

describe("BillSignerReviewPanel", () => {
  it("shows a calm retryable message when the Mint cannot serve the quote", async () => {
    let status = 503;
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/bill-signer-review": () => (status === 200 ? json(signerReviewFixture()) : new Response(null, { status })),
      })
    );
    const { page } = await renderWithProviders(<BillSignerReviewPanel quoteId={fixtureQuoteId} />);
    expect(getByRole(page, "alert").textContent).toContain("The Mint cannot serve this data right now. Nothing about the case has changed");
    status = 200;
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Try again" }));
    });
    await flush();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.textContent).toContain("Signers on the bill");
    expect(page.textContent).toContain("Finca Verde");
  });
});

describe("signer public listing provenance", () => {
  it("shows only the exact node listing for each party, with optional absence and coverage", async () => {
    const review = signerReviewFixture();
    review.parties[0].ref = publicNodeId;
    review.parties[0].publicListing = publicListingFixture();
    review.parties[1].publicListing = null;
    review.publicCoverage = directoryNetworkFixture().publicCoverage;
    const { page } = await renderWithProviders(<BillSignerReviewView review={review} />);
    expect(page).toHaveTextContent(publicNodeId);
    expect(page).toHaveTextContent("Public listing · self-declared");
    expect(page).toHaveTextContent("BUYER-99");
    expect(page).toHaveTextContent("No public listing observed for this exact node ID");
    expect(page).toHaveTextContent("no adverse inference");
    expect(page).toHaveTextContent("unreachable · query incomplete · capped");
  });
  it("does not show a listing for a similar name or a different node ID", async () => {
    const review = signerReviewFixture();
    review.parties[0].publicListing = { ...publicListingFixture(), name: "Mismatched identity listing" };
    const { page } = await renderWithProviders(<BillSignerReviewView review={review} />);
    expect(page).not.toHaveTextContent("Mismatched identity listing");
    expect(page).toHaveTextContent("The returned public listing belongs to a different node ID");
  });
});
