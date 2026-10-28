import { fireEvent, screen, within } from "@testing-library/dom";
import { useQuery } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuyerConfirmationPanel } from "./BuyerConfirmationPanel";
import { CounterpartyExposurePanel, FraudControlsPanel, InvoiceTaxAuthorityPanel } from "./FraudControlsPanel";
import { cleanup, flush, json, renderWithProviders, requestBody, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { confirmationFixture, documentId, fraudCaseFixture, fraudFixture, operator } from "./fraud-controls-test-fixtures";
import { assessmentChanges } from "./assessment-diff";
import { fraudReasonMessages } from "./fraud-controls-copy";
import { requestReason } from "./verification-reasons";
import { createIntl } from "react-intl";
import type { BuyerConfirmation, TaxAuthorityCheck } from "@bitcredit/ai-credit-shared";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
async function fillForm(outcome: BuyerConfirmation["outcome"] = "confirmed_obligation") {
  act(() => {
    setValue("Method", "email");
    setValue("Contact source", "public_directory");
    setValue("Contact reference", "Independent directory entry 42");
    setValue("Outcome", outcome);
    setValue("Performed at (local time)", "2026-10-27T10:00");
    setValue("Operator note", "Independently contacted the buyer.");
    fireEvent.submit(screen.getByRole("button", { name: "Record buyer confirmation" }).closest("form") ?? document.body);
  });
  await flush();
}

describe("invoice and tax authority panel", () => {
  it("shows original currency amounts, register provenance and per-field evidence without inventing FX money", async () => {
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={fraudCaseFixture()} />);
    const panel = screen.getByRole("region", { name: "Invoice and tax authority" });
    expect(panel).toHaveTextContent("Synthetic register · test data only");
    expect(panel).toHaveTextContent(documentId);
    expect(panel).toHaveTextContent("sat-gt-synthetic");
    expect(panel).toHaveTextContent("ISSUER-42");
    expect(panel).toHaveTextContent("BUYER-99");
    expect(panel).toHaveTextContent("Synthetic coffee farm");
    expect(panel).toHaveTextContent("Synthetic buyer");
    expect(panel).toHaveTextContent("2026-10-28");
    expect(panel).toHaveTextContent("61600.00 GTQ");
    expect(panel).toHaveTextContent("6600.00 GTQ");
    expect(panel).toHaveTextContent("8000000 sat");
    expect(panel).toHaveTextContent("policy 100 bps");
    expect(panel).toHaveTextContent("Within tolerance");
    expect(panel).toHaveTextContent("Model extraction");
    expect(panel).toHaveTextContent("Unconfirmed");
    expect(panel).toHaveTextContent("Independently verified");
    expect(panel).toHaveTextContent("FX-converted orientation value unavailable");
    expect(panel).toHaveTextContent("Register facts verify the document, not delivery");
    for (const row of panel.querySelectorAll("dl:first-of-type > div")) {
      if (
        row.querySelector("dt")?.textContent === "This bill" ||
        ["Register", "Register status"].includes(row.querySelector("dt")?.textContent ?? "")
      )
        continue;
      expect(row.querySelectorAll("dd span.rounded")).toHaveLength(2);
    }
  });

  it.each<[TaxAuthorityCheck["status"], string]>([
    ["cancelled", "Cancelled invoice · hard gate; cannot be waived"],
    ["not_found", "Document not found in register · verification required"],
    ["document_id_not_found", "Document ID missing or ambiguous · verification required"],
    ["source_unavailable", "Source unavailable · verification required"],
  ])("presents %s with its scoped gate meaning", async (status, expected) => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.taxAuthority.status = status;
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={one} />);
    expect(screen.getByRole("region")).toHaveTextContent(expected);
  });

  it("shows FX amount and PDF mismatches as verification", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.taxAuthority.amountConsistency = "mismatch";
    fraud.taxAuthority.pdfConsistency = "mismatch";
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={one} />);
    expect(screen.getByRole("region")).toHaveTextContent("Invoice / bill tolerance: Mismatch · verification required");
    expect(screen.getByRole("region")).toHaveTextContent("PDF / register consistency: Mismatch · verification required");
  });

  it("shows the permitted alternative path and lower cap", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.taxAuthority.status = "not_applicable";
    fraud.taxAuthority.record = null;
    fraud.taxAuthority.signedDocument = null;
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={one} />);
    expect(screen.getByRole("region")).toHaveTextContent("No electronic invoice: alternative path, lower cap 2000000 sat");
    expect(screen.getByRole("region")).toHaveTextContent("Synthetic register");
  });

  it("keeps an allowed legacy SAT alternative free of invented register verification holds", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.taxAuthority = {
      ...fraud.taxAuthority,
      status: "not_applicable",
      documentId: null,
      signedDocument: null,
      record: null,
      amountConsistency: "unknown",
      pdfConsistency: "unknown",
      fxSnapshotDigest: null,
    };
    one.snapshot.fraudControls = fraud;
    if (one.snapshot.invoice) {
      one.snapshot.invoice.currency = "SAT";
      one.snapshot.invoice.totalSat = "1600000";
    }
    if (one.snapshot.bill) one.snapshot.bill.faceValueSat = "1600000";
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={one} />);
    const panel = screen.getByRole("region");
    expect(panel).toHaveTextContent("1600000 SAT");
    expect(panel).toHaveTextContent("SAT invoice · FX conversion does not apply");
    expect(panel).not.toHaveTextContent("verification required");
    expect(panel).not.toHaveTextContent("PDF / register consistency");
  });

  it("preserves applicant and model field provenance without promoting either to register evidence", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    if (fraud.taxAuthority.record) {
      fraud.taxAuthority.record.sellerName = { value: "Applicant's farm name", source: "applicant", state: "applicant_confirmed" };
    }
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<InvoiceTaxAuthorityPanel decisionCase={one} />);
    const row = screen.getByText("Issuer name").closest("div");
    expect(row).toHaveTextContent("Applicant's farm name");
    expect(row).toHaveTextContent("Applicant confirmed");
    expect(row).not.toHaveTextContent("Independently verified");
  });

  it("displays El Salvador USD and reception stamp under the pinned v2 pack", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    one.policyPack.policyPackVersion = "synthetic-el-salvador-v2";
    one.snapshot.country = "SV";
    if (fraud.taxAuthority.record) {
      fraud.taxAuthority.record.currency.value = "USD";
      fraud.taxAuthority.record.totalWithTaxMinor.value = "800000";
    }
    fraud.taxAuthority.authorityStamp = "1234567890ABCDEF1234567890ABCDEF12345678";
    if (fraud.taxAuthority.signedDocument) fraud.taxAuthority.signedDocument.document.register = "mh-sv-synthetic";
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<FraudControlsPanel decisionCase={one} />);
    expect(screen.getByRole("region", { name: "Invoice and tax authority" })).toHaveTextContent("8000.00 USD");
    expect(screen.getByRole("region", { name: "Invoice and tax authority" })).toHaveTextContent(fraud.taxAuthority.authorityStamp);
    expect(screen.getByText(/synthetic-el-salvador-v2/)).toBeInTheDocument();
  });

  it("compares local-currency invoices using governed consistency rather than null sat totals", () => {
    const previous = fraudCaseFixture();
    const current = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.taxAuthority.amountConsistency = "mismatch";
    current.snapshot.fraudControls = fraud;
    expect(assessmentChanges(previous, current)).toContainEqual({ field: "invoice_amount_vs_bill", before: "match", after: "mismatch" });
  });
});

describe("counterparty exposure panel", () => {
  it("separates existing and current exposure for both parties and counts this bill once", async () => {
    await renderWithProviders(<CounterpartyExposurePanel decisionCase={fraudCaseFixture()} />);
    const drawee = screen.getByRole("region", { name: "Drawee / buyer" });
    const drawer = screen.getByRole("region", { name: "Drawer / issuer" });
    expect(drawee).toHaveTextContent("6000000 sat");
    expect(drawee).toHaveTextContent("14000000 sat");
    expect(drawee).toHaveTextContent("16000000 sat");
    expect(drawer).toHaveTextContent("9000000 sat");
    expect(drawer).toHaveTextContent("17000000 sat");
    expect(drawer).toHaveTextContent("13000000 sat");
    for (const actor of [drawee, drawer]) {
      expect(actor).toHaveTextContent("8000000 sat");
      expect(actor).toHaveTextContent("30000000 sat");
    }
    expect(screen.getByText(/scanned 3\/3/)).toHaveTextContent("scan limit 128 · failures 0");
  });

  it("never clears an incomplete scan even with positive headroom", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.exposure.coverage = { complete: false, scannedQuotes: 2, listedQuotes: 5, limit: 128, failures: 1 };
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<CounterpartyExposurePanel decisionCase={one} />);
    expect(screen.getByText(/Incomplete scan/)).toHaveTextContent("verification required");
    expect(screen.queryByText("Complete Mint-local scan")).not.toBeInTheDocument();
    expect(screen.getByText(/scanned 2\/5/)).toHaveTextContent("failures 1");
  });

  it("shows a cap breach and signed negative headroom without clamping it", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.exposure.drawer.exposureSat = "31000000";
    one.snapshot.fraudControls = fraud;
    one.result.reasonCodes = ["counterparty_exposure_above_policy_cap"];
    await renderWithProviders(<FraudControlsPanel decisionCase={one} />);
    expect(screen.getByRole("region", { name: "Drawer / issuer" })).toHaveTextContent("-1000000 sat");
    expect(screen.getByText(/Counterparty exposure exceeds/)).toHaveTextContent("hard gate; operators cannot waive it");
  });

  it("treats missing fraud observations as unverified and preserves the original pinned version", async () => {
    const one = fraudCaseFixture();
    delete one.snapshot.fraudControls;
    one.policyPack.policyPackVersion = "synthetic-guatemala-v12";
    await renderWithProviders(<FraudControlsPanel decisionCase={one} capability={operator} />);
    expect(screen.getByText(/Fraud controls are not recorded/)).toBeInTheDocument();
    expect(screen.getByText(/synthetic-guatemala-v12/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record buyer confirmation" })).not.toBeInTheDocument();
  });
});

describe("buyer confirmation", () => {
  it("requires an independent source and displays complete attributed history including retained denials", async () => {
    const one = fraudCaseFixture();
    const fraud = fraudFixture();
    fraud.buyerConfirmations = [confirmationFixture("denied_obligation"), confirmationFixture()];
    one.snapshot.fraudControls = fraud;
    await renderWithProviders(<BuyerConfirmationPanel decisionCase={one} capability={operator} />);
    expect(screen.getByText("Required by policy above 5000000 sat")).toBeInTheDocument();
    expect(screen.getByText(/An applicant-supplied contact is not allowed/)).toBeInTheDocument();
    const source = screen.getByLabelText("Contact source");
    expect(
      within(source)
        .getAllByRole("option")
        .map((option) => option.getAttribute("value"))
    ).toEqual(["public_registry", "public_directory", "prior_relationship"]);
    const history = screen.getByRole("list");
    expect(history).toHaveTextContent("Denied obligation");
    expect(history).toHaveTextContent("Confirmed obligation");
    expect(history).toHaveTextContent("Public register entry 42");
    expect(history).toHaveTextContent("operator-a");
    expect(history).toHaveTextContent("2026-10-27T12:00:00.000Z");
    expect(history).toHaveTextContent("Phone · Public registry");
  });

  it("does not require confirmation at the exact threshold", async () => {
    const one = fraudCaseFixture();
    if (one.snapshot.bill) one.snapshot.bill.faceValueSat = "5000000";
    await renderWithProviders(<BuyerConfirmationPanel decisionCase={one} />);
    expect(screen.getByText(/Not required by policy for this bill/)).toBeInTheDocument();
  });

  it.each(["historical", "no-capability"])("keeps %s assessment read only", async (state) => {
    const one = fraudCaseFixture();
    if (state === "historical") one.assessmentCurrency = "historical";
    await renderWithProviders(<BuyerConfirmationPanel decisionCase={one} capability={state === "no-capability" ? undefined : operator} />);
    expect(screen.queryByRole("button", { name: "Record buyer confirmation" })).not.toBeInTheDocument();
  });

  it.each<BuyerConfirmation["outcome"]>(["confirmed_obligation", "denied_obligation", "unreachable"])(
    "records %s bound to the snapshot and refreshes the case",
    async (outcome) => {
      let current = fraudCaseFixture();
      const next = fraudCaseFixture();
      next.resultDigest = `sha256:${"b".repeat(64)}`;
      next.snapshot.snapshotDigest = next.resultDigest;
      const fraud = fraudFixture();
      fraud.buyerConfirmations = [confirmationFixture(outcome)];
      next.snapshot.fraudControls = fraud;
      const read = vi.fn(() => Promise.resolve(current));
      const post = vi.fn(
        routeFetch({
          "/api/ai-credit/operator-buyer-confirmations": () => {
            current = next;
            return json({ schemaVersion: "ai-credit-buyer-confirmation-response-v1", case: next });
          },
        })
      );
      vi.stubGlobal("fetch", post);
      function Case() {
        const query = useQuery({ queryKey: ["ai-credit", "decisions"], queryFn: read });
        return query.data ? <FraudControlsPanel key={query.data.resultDigest} decisionCase={query.data} capability={operator} /> : null;
      }
      await renderWithProviders(<Case />);
      await fillForm(outcome);
      expect(post).toHaveBeenCalledTimes(1);
      expect(post.mock.calls[0]?.[0]).toBe("/api/ai-credit/operator-buyer-confirmations");
      expect(requestBody(post.mock.calls[0]?.[1])).toEqual({
        action: "record_buyer_confirmation",
        billId: "bill-a",
        caseId: "case-a",
        decisionResultDigest: fraudCaseFixture().resultDigest,
        draweeNodeId: "buyer-node",
        method: "email",
        contactSource: "public_directory",
        contactReference: "Independent directory entry 42",
        outcome,
        note: "Independently contacted the buyer.",
        performedAt: new Date("2026-10-27T10:00").toISOString(),
      });
      expect(read).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/synthetic-guatemala-v13/)).toHaveTextContent(next.snapshot.snapshotDigest);
      expect(within(screen.getByRole("region", { name: "Buyer confirmation" })).getByRole("list")).toHaveTextContent("operator-a");
    }
  );

  it.each([400, 401, 409, 503])("displays the server error plainly (%s) and preserves the form", async (status) => {
    const post = vi.fn(
      routeFetch({
        "/api/ai-credit/operator-buyer-confirmations": () => json({ error: "Buyer confirmation belongs to a stale assessment" }, status),
      })
    );
    vi.stubGlobal("fetch", post);
    await renderWithProviders(<BuyerConfirmationPanel decisionCase={fraudCaseFixture()} capability={operator} />);
    await fillForm();
    expect(screen.getByRole("alert")).toHaveTextContent(`Buyer confirmation belongs to a stale assessment (${status})`);
    expect(screen.getByLabelText("Operator note")).toHaveValue("Independently contacted the buyer.");
  });

  it("validates empty fields and future times before posting", async () => {
    const post = vi.fn();
    vi.stubGlobal("fetch", post);
    await renderWithProviders(<BuyerConfirmationPanel decisionCase={fraudCaseFixture()} capability={operator} />);
    act(() => {
      fireEvent.submit(screen.getByRole("button", { name: "Record buyer confirmation" }).closest("form") ?? document.body);
    });
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("Complete every field");
    expect(post).not.toHaveBeenCalled();
    act(() => {
      setValue("Contact reference", "Public registry 42");
      setValue("Operator note", "Checked independently");
      setValue("Performed at (local time)", "2099-01-01T12:00");
      fireEvent.submit(screen.getByRole("button", { name: "Record buyer confirmation" }).closest("form") ?? document.body);
    });
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("not in the future");
    expect(post).not.toHaveBeenCalled();
  });
});

describe("fraud gate wording", () => {
  it.each(Object.keys(fraudReasonMessages))("maps %s in existing verification reasons", (reasonCode) => {
    const intl = createIntl({ locale: "en" });
    const reason = requestReason({ reasonCode, axis: "transaction_integrity" }, intl);
    expect(reason).not.toBe("Transaction integrity");
    expect(reason).not.toContain("_");
  });
});
