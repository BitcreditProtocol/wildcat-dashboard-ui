import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { expect, it } from "vitest";
import { NextEvidenceRequest } from "./NextEvidenceRequest";
import type { VerificationRequest } from "./decision-types";

function renderRequest(verificationRequests: VerificationRequest[], assessmentCurrency: "current" | "historical" = "current") {
  const page = document.createElement("div");
  page.innerHTML = renderToStaticMarkup(
    <IntlProvider locale="en">
      <NextEvidenceRequest verificationRequests={verificationRequests} assessmentCurrency={assessmentCurrency} />
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

const mintCheck: VerificationRequest = {
  code: "acceptor_risk_record",
  axis: "acceptor_risk",
  reasonCode: "verification_acceptor_risk_required",
  owner: "mint_risk",
  resolutionAction: "record_acceptor_risk_assessment",
  requiredItem: "A signed payer risk record.",
};

it("shows nothing while no evidence request is open", () => {
  expect(renderRequest([]).textContent).toBe("");
});

it("leads with the applicant's request, which goes out through eBill", () => {
  const page = renderRequest([mintCheck, invoiceRequest]);

  expect(page.textContent).toContain("Next evidence requestReady for operator");
  expect(page.textContent).toContain("Correct the invoice and eBill discrepancy.");
  expect(page.textContent).toContain("Correct answers · upload supporting document");
  expect(page.textContent).toContain("eBill notification and application");
  expect(page.textContent).toContain("+1 more");
  expect(page.textContent).not.toContain("A signed payer risk record.");
});

it("names a check the Mint owns as Mint work, with nothing for the applicant to do", () => {
  const page = renderRequest([mintCheck]);

  expect(page.textContent).toContain("Mint-side check pending");
  expect(page.textContent).toContain("A signed payer risk record.");
  expect(page.textContent).toContain("No applicant action");
  expect(page.textContent).toContain("Mint operations");
  expect(page.textContent).not.toContain("more");
});

it("keeps a historical assessment's request read-only", () => {
  expect(renderRequest([invoiceRequest], "historical").textContent).toContain("Historical assessment · read-only");
});
