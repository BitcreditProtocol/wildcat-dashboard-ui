import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { expect, it } from "vitest";
import { EvidenceCaseBrief, type EvidenceCaseSummary } from "./EvidenceCaseBrief";

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
