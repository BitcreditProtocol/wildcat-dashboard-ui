import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { expect, it } from "vitest";
import { EvidenceCaseBrief, type EvidenceCaseSummary } from "./EvidenceCaseBrief";
import type { VerificationRequest } from "./decision-types";

const invoiceSummary: EvidenceCaseSummary = {
  snapshot: {
    bill: {
      billId: "synthetic-bill",
      billStateDigest: `sha256:${"1".repeat(64)}`,
      acceptanceState: "accepted",
      holderRef: "synthetic-seller",
      acceptorRef: "synthetic-buyer",
      faceValueSat: "8600000",
      acceptedDate: "2026-09-10",
      maturityDate: "2027-03-01",
      alreadyFinanced: false,
    },
    invoice: {
      reference: "synthetic-invoice",
      invoiceNumber: "SYNTHETIC-1",
      goodsDescription: "Synthetic coffee",
      sellerRef: "synthetic-seller",
      buyerRef: "synthetic-buyer",
      issueDate: "2026-09-09",
      totalSat: "8000000",
      plausibility: "plausible",
      billAndClaimsConsistency: "mismatch",
      evidenceState: "corroborated",
      methodologyVersion: "synthetic-invoice-review-v1",
      assessedBy: "synthetic-reviewer",
      validThrough: "2027-03-01",
    },
    contradictions: [],
    confirmedClaims: {
      useOfFunds: "Synthetic crops",
      acceptorRef: "synthetic-buyer",
      repaymentSource: "Synthetic sales",
      wholeFaceRecourseAcknowledged: true,
      evidenceState: "applicant_confirmed",
    },
  },
  assessmentStatus: "blocked_pending_verification",
  recommendation: null,
};

function renderBrief(summary: EvidenceCaseSummary, verificationRequests: VerificationRequest[] = []) {
  const page = document.createElement("div");
  page.innerHTML = renderToStaticMarkup(
    <IntlProvider locale="en">
      <EvidenceCaseBrief
        summary={summary}
        submittedEvidence={[]}
        verificationRequests={verificationRequests}
        assessmentCurrency="current"
      />
    </IntlProvider>
  );
  return page;
}

const invoiceRequest: VerificationRequest = {
  code: "invoice_consistency",
  axis: "transaction_integrity",
  reasonCode: "verification_invoice_consistency_required",
  owner: "applicant",
  resolutionAction: "request_applicant_information",
  requiredItem: "Correct the invoice and eBill discrepancy.",
};

it("includes the governed invoice mismatch in deterministic conflicts even without a contradiction record", () => {
  const page = renderBrief(invoiceSummary, [invoiceRequest]);
  const rows = [...page.querySelectorAll("div")];
  const trade = rows.find((row) => row.firstElementChild?.textContent === "Underlying trade");
  const conflicts = rows.find((row) => row.firstElementChild?.textContent === "Deterministic conflicts");
  expect(trade?.textContent).toContain("8,000,000 sat");
  expect(trade?.textContent).toContain("Conflict");
  expect(conflicts?.textContent).toContain("Invoice and eBill do not align");
  expect(conflicts?.textContent).toContain("Open");
  expect(conflicts?.textContent).not.toContain("None recorded");
  expect(page.textContent).not.toContain("No conflict recorded by deterministic checks");
});

it("preserves recorded case conflicts alongside the separate invoice consistency check", () => {
  const snapshot = structuredClone(invoiceSummary.snapshot);
  snapshot.contradictions.push({ code: "acceptor_claim_bill_mismatch", state: "unresolved", evidenceState: "contradicted" });
  const page = renderBrief({ ...invoiceSummary, snapshot });
  const conflicts = [...page.querySelectorAll("div")].find((row) => row.firstElementChild?.textContent === "Deterministic conflicts");
  expect(conflicts?.textContent).toContain("Acceptor claim bill mismatch · Invoice and eBill do not align");
  expect(conflicts?.textContent).toContain("Open");
});

it.each(["match", "unknown"])("does not invent a conflict for %s consistency, historical mismatches or AI follow-ups", (consistency) => {
  const snapshot = structuredClone(invoiceSummary.snapshot);
  if (snapshot.invoice === null || snapshot.bill === null) throw new Error("Missing invoice fixture");
  snapshot.invoice.totalSat = snapshot.bill.faceValueSat;
  snapshot.invoice.billAndClaimsConsistency = consistency;
  snapshot.invoice.plausibility = consistency === "match" ? "plausible" : "unknown";
  const page = renderBrief(
    {
      ...invoiceSummary,
      snapshot,
      answerReviewFollowUpCount: 2,
      assessmentHistory: [{ snapshot: { invoice: invoiceSummary.snapshot.invoice }, result: { verificationRequests: [invoiceRequest] } }],
    },
    consistency === "unknown" ? [invoiceRequest] : []
  );
  const conflicts = [...page.querySelectorAll("div")].find((row) => row.firstElementChild?.textContent === "Deterministic conflicts");
  expect(conflicts?.textContent).toContain("No conflict recorded by deterministic checks");
  expect(conflicts?.textContent).toContain("None recorded");
  expect(conflicts?.textContent).not.toContain("Invoice and eBill do not align");
  expect(page.textContent).toContain("2 targeted follow-ups");
  expect(page.textContent).toContain("Resolution not independently checked");
});

it("enables four-column coverage only when its own container has at least 40rem", () => {
  const summary: EvidenceCaseSummary = {
    snapshot: {
      bill: null,
      invoice: null,
      contradictions: [],
      confirmedClaims: {
        useOfFunds: "Synthetic crops",
        acceptorRef: "synthetic-buyer",
        repaymentSource: "Synthetic sales",
        wholeFaceRecourseAcknowledged: false,
        evidenceState: "applicant_confirmed",
      },
    },
    assessmentStatus: "blocked_pending_verification",
    recommendation: null,
  };
  const page = document.createElement("div");
  page.innerHTML = renderToStaticMarkup(
    <IntlProvider locale="en">
      <EvidenceCaseBrief summary={summary} submittedEvidence={[]} verificationRequests={[]} assessmentCurrency="current" />
    </IntlProvider>
  );
  expect(page.querySelector('[data-testid="evidence-case-brief"]')?.classList.contains("@container/evidence")).toBe(true);
  const grids = Array.from(page.querySelectorAll("[class]"), (node) => node.getAttribute("class") ?? "").filter((classes) =>
    classes.includes("grid-cols-[")
  );
  expect(grids.length).toBeGreaterThan(1);
  for (const grid of grids) {
    expect(grid).toContain("@min-[40rem]/evidence:");
    expect(grid).not.toMatch(/\bmd:(?:grid|items-center|gap-4)/u);
  }
  // This guards the responsive selector, not layout: jsdom has no computed CSS geometry.
  // Browser verification must include 768–900px viewports with the expanded host sidebar.
});
