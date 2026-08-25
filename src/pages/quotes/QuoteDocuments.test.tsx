import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { QuoteDocuments } from "./QuoteDocuments";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderWithIntl(element: ReactElement): HTMLDivElement {
  return renderIntoDom(<IntlProvider locale="en">{element}</IntlProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 1200,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: 0,
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });

  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("QuoteDocuments", () => {
  it("renders collapsed by default", () => {
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[
          {
            name: "invoice.pdf",
            hash: "hash-1",
            source: "billAttachment",
          },
        ]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          caseId: "case-1",
          resultDigest: "sha256:result",
          submittedEvidence: [],
          evidencePackets: [],
          invoiceAssessment: null,
          verificationRequests: [],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    expect(page.textContent).toContain("Documents & evidence");
    expect(page.querySelector("#documents-and-evidence")).not.toBeNull();
    expect(page.textContent).toContain("1 bill file · No submitted credit evidence");
    expect(page.textContent).toContain("Show details");
    expect(page.textContent).not.toContain("invoice.pdf");
  });

  it("shows both bill-file sources without collapsing one into the other", () => {
    const onOpenDocument = vi.fn();
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[
          {
            name: "contact-qrcode.png",
            hash: "hash-1",
            source: "billAttachment",
          },
        ]}
        requestToMintFiles={[
          {
            name: "invoice.pdf",
            hash: "hash-2",
            source: "requestToMint",
            fileUrl: "https://example.com/invoice.pdf",
          },
        ]}
        creditEvidence={{ status: "absent" }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={onOpenDocument}
        onOpenEvidence={() => undefined}
      />
    );

    const toggleButton = page.querySelector('button[aria-expanded="false"]');
    expect(toggleButton).not.toBeNull();

    act(() => {
      toggleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.textContent).toContain("Hide details");
    expect(page.textContent).toContain("Attached to the bill");
    expect(page.textContent).toContain("contact-qrcode.png");
    expect(page.textContent).toContain("Submitted with the mint request");
    expect(page.textContent).toContain("invoice.pdf");
    expect(page.textContent).toContain("No AI Credit assessment exists for this bill.");

    const buttons = Array.from(page.querySelectorAll("button"));
    const viewButtons = buttons.filter((button) => button.textContent === "View");

    expect(viewButtons).toHaveLength(2);

    act(() => {
      viewButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      viewButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenDocument).toHaveBeenCalledWith({
      name: "contact-qrcode.png",
      hash: "hash-1",
      source: "billAttachment",
    });
    expect(onOpenDocument).toHaveBeenCalledWith({
      name: "invoice.pdf",
      hash: "hash-2",
      source: "requestToMint",
      fileUrl: "https://example.com/invoice.pdf",
    });
  });

  it("distinguishes unavailable credit evidence from an empty evidence set", () => {
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{ status: "unavailable" }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    expect(page.textContent).toContain("No bill files · Credit evidence unavailable");
    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(page.textContent).toContain("Credit evidence is unavailable. Do not treat this as an absence of evidence.");
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("shows submitted evidence as provenance, without inventing a file action", () => {
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          caseId: "case-1",
          resultDigest: "sha256:result",
          submittedEvidence: [
            {
              reference: "invoice-ref",
              label: "invoice.pdf",
              contentDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              origin: "applicant_upload",
            },
          ],
          evidencePackets: [],
          invoiceAssessment: null,
          verificationRequests: [],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(page.textContent).toContain("Evidence review");
    expect(page.textContent).toContain("invoice.pdf");
    expect(page.textContent).toContain("Applicant upload");
    expect(page.textContent).toContain("No current server receipt");
    expect(Array.from(page.querySelectorAll("button")).some((button) => button.textContent === "View")).toBe(false);
  });

  it("opens only evidence with a current server receipt", async () => {
    const onOpenEvidence = vi.fn();
    const evidence = {
      reference: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      label: "invoice.pdf",
      contentDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      origin: "applicant_upload" as const,
    };
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          caseId: "case-1",
          resultDigest: "sha256:result",
          submittedEvidence: [evidence],
          evidencePackets: [{ evidence, status: "quarantined", byteLength: 42 }],
          invoiceAssessment: null,
          verificationRequests: [],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={onOpenEvidence}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const view = Array.from(page.querySelectorAll("button")).find((button) => button.textContent === "View PDF");
    expect(view).not.toBeUndefined();
    await act(async () => {
      view?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(onOpenEvidence).toHaveBeenCalledWith(evidence);
    expect(page.textContent).toContain("Supporting document");
    expect(page.textContent).toContain("Not analyzed for this decision");
    expect(page.textContent).not.toContain("Human review is required");
  });

  it("renders arbitrary source-backed document claims without invoice-specific layout", () => {
    const evidence = {
      reference: `sha256:${"a".repeat(64)}`,
      label: "shipping-confirmation.pdf",
      contentDigest: `sha256:${"a".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          caseId: "case-1",
          resultDigest: "sha256:result",
          submittedEvidence: [evidence],
          evidencePackets: [
            {
              evidence,
              status: "quarantined",
              byteLength: 2_048,
              analysisStatus: "available",
              analysis: {
                schemaVersion: "evidence-document-analysis-v1",
                evidence,
                derivativeDigest: `sha256:${"b".repeat(64)}`,
                parserVersion: "poppler-text-v1",
                promptVersion: "evidence-document-analysis-v1",
                modelId: "gpt-5.6-luna",
                extractedAt: "2026-08-22T12:00:00.000Z",
                analysis: {
                  documentType: {
                    value: "Shipping confirmation",
                    citation: { page: 1, exactSnippet: "Shipping confirmation" },
                  },
                  claims: [
                    {
                      kind: "status",
                      label: "Shipment status",
                      value: "Loaded for export",
                      citation: { page: 1, exactSnippet: "Status: Loaded for export" },
                    },
                    {
                      kind: "identifier",
                      label: "Container",
                      value: "GT-COFFEE-42",
                      citation: { page: 2, exactSnippet: "Container GT-COFFEE-42" },
                    },
                  ],
                },
              },
            },
          ],
          invoiceAssessment: null,
          verificationRequests: [],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(page.textContent).toContain("Shipping confirmation");
    expect(page.textContent).toContain("Analyzed");
    expect(page.textContent).toContain("Shipment statusLoaded for export");
    expect(page.textContent).toContain("ContainerGT-COFFEE-42");
    expect(page.textContent).toContain("Show source · page 2");
    expect(page.textContent).not.toContain("How it is used");
    expect(page.textContent).not.toContain("Invoice matched to eBill");
  });

  it("puts governed matches and extracted values ahead of technical provenance", () => {
    const evidence = {
      reference: "sha256:invoice",
      label: "commercial-invoice.pdf",
      contentDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      origin: "bill_attachment" as const,
    };
    const citation = { page: 1, exactSnippet: "Invoice: DEMO-42" };
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          caseId: "case-1",
          resultDigest: "sha256:result",
          submittedEvidence: [evidence],
          evidencePackets: [
            {
              evidence,
              status: "quarantined",
              byteLength: 831,
              extraction: {
                schemaVersion: "invoice-extraction-proposal-v1",
                derivativeDigest: "sha256:derivative",
                parserVersion: "parser-v1",
                promptVersion: "prompt-v1",
                modelId: "model-route",
                extractedAt: "2026-08-22T10:00:00.000Z",
                proposal: {
                  invoiceNumber: { value: "DEMO-42", citation },
                  seller: null,
                  buyer: null,
                  issueDate: null,
                  goodsDescription: { value: "Coffee crop inputs", citation },
                  transactionReference: null,
                  currency: { value: "SAT", citation },
                  totalSat: { value: "8100000", citation },
                  lineItems: [
                    { description: "Coffee crop inputs", amountSat: "8000000", citation },
                    { description: "Harvest labour", amountSat: "100000", citation },
                  ],
                },
              },
            },
          ],
          invoiceAssessment: {
            reference: evidence.reference,
            invoiceNumber: "DEMO-42",
            goodsDescription: "Coffee crop inputs",
            sellerRef: "seller",
            buyerRef: "buyer",
            issueDate: "2026-08-22",
            totalSat: "8100000",
            plausibility: "plausible",
            billAndClaimsConsistency: "match",
            evidenceState: "corroborated",
            methodologyVersion: "invoice-review-v1",
            assessedBy: "credit_evidence_gateway",
            validThrough: "2026-11-20",
          },
          verificationRequests: [],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.textContent).toContain("Invoice matched to eBill");
    expect(page.textContent).toContain("6 cited claims");
    expect(page.textContent).toContain("InvoiceDEMO-42");
    expect(page.textContent).toContain("Total8,100,000 sat");
    expect(page.textContent).toContain("PlausibilityPlausible");
    expect(page.textContent).toContain("Invoice and eBill consistencyMatch");
    const lineItems = Array.from(page.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("2 line items")
    );
    expect(lineItems?.open).toBe(false);
    expect(lineItems?.textContent).toContain("Coffee crop inputs · 8,000,000 sat");
    const technical = Array.from(page.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("Audit details")
    );
    expect(technical?.open).toBe(false);
  });
});
