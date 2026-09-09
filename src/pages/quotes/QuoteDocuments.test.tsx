import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import type { EvidenceCaseSummary } from "@/pages/credit/EvidenceCaseBrief";
import { EvidenceCaseBrief } from "@/pages/credit/EvidenceCaseBrief";
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

const evidenceCaseSummary = {
  snapshot: {
    confirmedClaims: {
      useOfFunds: "Coffee harvest",
      acceptorRef: "acceptor-1",
      repaymentSource: "Coffee sale proceeds",
      wholeFaceRecourseAcknowledged: true,
      evidenceState: "applicant_confirmed",
    },
    contradictions: [],
    bill: {
      billId: "bill-1",
      billStateDigest: `sha256:${"1".repeat(64)}`,
      acceptanceState: "accepted",
      holderRef: "holder-1",
      acceptorRef: "acceptor-1",
      faceValueSat: "8100000",
      acceptedDate: "2026-08-22",
      maturityDate: "2027-02-22",
      alreadyFinanced: false,
    },
    invoice: null,
  },
  assessmentStatus: "blocked_pending_verification",
  recommendation: null,
} satisfies EvidenceCaseSummary;

describe("QuoteDocuments", () => {
  it("keeps answer-review concerns separate from deterministic checks with no recorded conflict", () => {
    const page = renderWithIntl(
      <EvidenceCaseBrief
        summary={{ ...evidenceCaseSummary, answerReviewFollowUpCount: 2 }}
        submittedEvidence={[]}
        verificationRequests={[]}
        assessmentCurrency="current"
      />
    );
    expect(page.textContent).toContain("No conflict recorded by deterministic checks");
    expect(page.textContent).toContain("2 targeted follow-ups");
    expect(page.textContent).toContain("Resolution not independently checked");
    expect(page.textContent).not.toContain("No internal conflicts");
  });
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
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
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

    expect(page.textContent).toContain("Evidence");
    expect(page.querySelector("#documents-and-evidence")).not.toBeNull();
    expect(page.textContent).toContain("0 documents · no open applicant request");
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

  it("keeps technical request-to-mint digests out of the operator-facing file list", () => {
    const digest = "a".repeat(64);
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[
          {
            name: digest,
            hash: `https://example.com/${digest}`,
            source: "requestToMint",
            fileUrl: `https://example.com/${digest}`,
          },
        ]}
        creditEvidence={{ status: "absent" }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.textContent).toContain("Submitted file 1");
    expect(page.textContent).not.toContain(digest);
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

    expect(page.textContent).toContain("Credit evidence unavailable");
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
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
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
    expect(page.textContent).toContain("1 submitted document");
    expect(page.textContent).toContain("invoice.pdf");
    expect(page.textContent).toContain("Applicant");
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
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
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
    expect(page.textContent).toContain("No extracted facts");
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
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
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
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
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

    expect(page.textContent).toContain("Fields match eBill");
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
    expect(technical?.textContent).not.toContain(evidence.contentDigest);
    expect(technical?.textContent).not.toContain("sha256:derivative");
  });

  it("keeps resolved applicant evidence requests out of the current decision view", () => {
    const evidence = {
      reference: "corrected-invoice-ref",
      label: "corrected-commercial-invoice.pdf",
      contentDigest: `sha256:${"e".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          assessmentCurrency: "historical",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: {
            ...evidenceCaseSummary,
            snapshot: {
              ...evidenceCaseSummary.snapshot,
              invoice: {
                reference: evidence.reference,
                invoiceNumber: "DEMO-43",
                goodsDescription: "Coffee crop inputs",
                sellerRef: "holder-1",
                buyerRef: "acceptor-1",
                issueDate: "2026-08-22",
                totalSat: "8000000",
                plausibility: "plausible",
                billAndClaimsConsistency: "mismatch",
                evidenceState: "unconfirmed",
                methodologyVersion: "invoice-v1",
                assessedBy: "credit_evidence_gateway",
                validThrough: "2026-11-20",
              },
              contradictions: [{ code: "invoice_amount_mismatch", state: "unresolved", evidenceState: "contradicted" }],
            },
          },
          submittedEvidence: [evidence],
          evidencePackets: [{ evidence, status: "quarantined", byteLength: 920 }],
          invoiceAssessment: null,
          verificationRequests: [
            {
              code: "invoice_consistency",
              axis: "transaction_integrity",
              requiredItem: "Clarify the invoice and eBill amount difference",
              reasonCode: "verification_invoice_consistency_required",
              owner: "applicant",
              resolutionAction: "request_applicant_information",
            },
          ],
        }}
        openingDocumentHash={null}
        openingEvidenceReference={null}
        onOpenDocument={() => undefined}
        onOpenEvidence={() => undefined}
      />
    );

    expect(page.textContent).toContain("Archived assessment · view only");
    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(page.textContent).toContain("Claim coverage");
    expect(page.textContent).toContain("Underlying tradeCoffee crop inputs · 8,000,000 satcorrected-commercial-invoice.pdfConflict");
    expect(page.textContent).toContain("Next evidence requestHistorical assessment · read-only");
    expect(page.textContent).toContain("Correct answers · upload supporting document");
    expect(page.textContent).toContain("eBill notification and application");
    expect(page.textContent).not.toContain("Previous assessment");
    expect(page.textContent).not.toContain("Current assessment");
    expect(page.textContent).not.toContain(evidence.contentDigest);
  });

  it("retains a compact completed applicant evidence loop after the request is resolved", () => {
    const originalEvidence = {
      reference: "original-invoice-ref",
      label: "commercial-invoice.pdf",
      contentDigest: `sha256:${"a".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const correctedEvidence = {
      reference: "corrected-invoice-ref",
      label: "corrected-commercial-invoice.pdf",
      contentDigest: `sha256:${"b".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const mismatchSnapshot = {
      ...evidenceCaseSummary.snapshot,
      invoice: {
        reference: originalEvidence.reference,
        invoiceNumber: "DEMO-43",
        goodsDescription: "Coffee crop inputs",
        sellerRef: "holder-1",
        buyerRef: "acceptor-1",
        issueDate: "2026-08-22",
        totalSat: "7800000",
        plausibility: "plausible" as const,
        billAndClaimsConsistency: "mismatch" as const,
        evidenceState: "unconfirmed",
        methodologyVersion: "invoice-v1",
        assessedBy: "credit_evidence_gateway",
        validThrough: "2026-11-20",
      },
    };
    const currentSnapshot = {
      ...evidenceCaseSummary.snapshot,
      invoice: {
        ...mismatchSnapshot.invoice,
        reference: correctedEvidence.reference,
        totalSat: "8100000",
        billAndClaimsConsistency: "match" as const,
        evidenceState: "corroborated",
      },
    };
    const blockedResult = {
      assessmentStatus: "blocked_pending_verification" as const,
      recommendation: null,
      axes: [],
      terms: null,
      verificationRequests: [
        {
          code: "invoice_consistency" as const,
          axis: "transaction_integrity" as const,
          requiredItem: "Clarify the invoice and eBill amount difference",
          reasonCode: "verification_invoice_consistency_required",
          owner: "applicant" as const,
          resolutionAction: "request_applicant_information" as const,
        },
      ],
      reasonCodes: [],
      assessmentTrace: [],
      calculationTrace: [],
    };
    const readyResult = {
      ...blockedResult,
      assessmentStatus: "ready_for_decision" as const,
      recommendation: "offer_available" as const,
      verificationRequests: [],
    };
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: {
            ...evidenceCaseSummary,
            snapshot: currentSnapshot,
            assessmentStatus: "ready_for_decision",
            recommendation: "offer_available",
            assessmentHistory: [
              { snapshot: mismatchSnapshot, result: blockedResult, submittedEvidence: [originalEvidence] },
              { snapshot: currentSnapshot, result: readyResult, submittedEvidence: [correctedEvidence] },
            ],
          },
          submittedEvidence: [correctedEvidence],
          evidencePackets: [{ evidence: correctedEvidence, status: "quarantined", byteLength: 920 }],
          invoiceAssessment: currentSnapshot.invoice,
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
    expect(page.textContent).not.toContain("Applicant evidence loop");
    expect(page.textContent).not.toContain("Invoice and eBill do not align");
    expect(page.textContent).toContain("Fields match eBill");
    expect(page.textContent).toContain("corrected-commercial-invoice.pdf");
  });

  it("shows the exact applicant interview and distinguishes each review authority", () => {
    const preparedInputId = "2798c386-935b-4f5e-a2ea-a5323454de0a";
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          assessmentCurrency: "current",
          caseId: "case-1",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
          submittedEvidence: [],
          evidencePackets: [],
          invoiceAssessment: null,
          verificationRequests: [],
          applicantConfirmation: {
            schemaVersion: "applicant-confirmation-summary-v1",
            preparedInputId,
            useOfFunds: "Fertilizer and harvest labour",
            acceptor: "Buyer cooperative",
            repaymentSource: "Accepted invoice at maturity",
            answersAffirmed: true,
            recourseAcknowledged: true,
          },
          interviewTranscript: {
            schemaVersion: "interview-transcript-v1",
            caseId: "case-1",
            preparedInputId,
            language: "en",
            questionGraphVersion: "question-graph-v1",
            promptVersion: "prompt-v1",
            modelId: "scripted-interviewer-v1",
            messages: [
              {
                messageId: "message-1",
                role: "assistant",
                templateId: "aiCredit.interview.welcome",
                text: "What will you use the money for?",
              },
              { messageId: "message-2", role: "applicant", text: "Fertilizer and harvest labour" },
              {
                messageId: "message-3",
                role: "assistant",
                templateId: "aiCredit.interview.repayment",
                text: "What funds will repay the bill at maturity?",
              },
              { messageId: "message-4", role: "applicant", text: "Accepted invoice at maturity" },
              {
                messageId: "message-5",
                role: "assistant",
                templateId: "aiCredit.interview.review",
                text: "Review the extracted answers.",
              },
            ],
          },
          axes: [
            { axis: "instrument_eligibility", status: "pass", reasonCodes: [] },
            { axis: "evidence_sufficiency", status: "blocked", reasonCodes: ["verification_invoice_required"] },
          ],
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
    const caseRecord = Array.from(page.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("Case record")
    );
    expect(caseRecord).not.toBeUndefined();
    expect(caseRecord?.querySelector("summary")?.textContent).toContain("Interview and review record");
    act(() => {
      caseRecord?.querySelector("summary")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(caseRecord?.textContent).toContain("What will you use the money for?");
    expect(caseRecord?.textContent).toContain("Fertilizer and harvest labour");
    expect(caseRecord?.textContent).toContain("What funds will repay the bill at maturity?");
    expect(caseRecord?.textContent).toContain("Accepted invoice at maturity");
    expect(caseRecord?.textContent).toContain("Policy checks1/2 passedDeterministic");
    expect(caseRecord?.textContent).toContain("Document analysis0 documents · 0 cited claimsEvidence-bound");
    expect(caseRecord?.textContent).toContain("Public researchNot runSupplemental AI");
    expect(caseRecord?.textContent).not.toContain("reasoning");
  });

  it("does not describe confirmed legacy fields as a conversation that was never stored", () => {
    const page = renderWithIntl(
      <QuoteDocuments
        billAttachments={[]}
        requestToMintFiles={[]}
        creditEvidence={{
          status: "available",
          assessmentCurrency: "current",
          caseId: "legacy-case",
          resultDigest: "sha256:result",
          caseSummary: evidenceCaseSummary,
          submittedEvidence: [],
          evidencePackets: [],
          invoiceAssessment: null,
          verificationRequests: [],
          applicantConfirmation: {
            schemaVersion: "applicant-confirmation-summary-v1",
            preparedInputId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
            useOfFunds: "Fertilizer",
            acceptor: "Buyer cooperative",
            repaymentSource: "Coffee sales",
            answersAffirmed: true,
            recourseAcknowledged: true,
          },
          claimInvestigation: {
            status: "running",
            modelId: "codex:gpt-5.6-luna",
            inputDigest: `sha256:${"c".repeat(64)}`,
          },
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
    const caseRecord = Array.from(page.querySelectorAll("details")).find((details) =>
      details.querySelector("summary")?.textContent?.includes("Case record")
    );
    expect(caseRecord?.querySelector("summary")?.textContent).toContain("Confirmed answers only · transcript unavailable");
    expect(caseRecord?.querySelector("summary")?.textContent).not.toContain("reviews");
    act(() => {
      caseRecord?.querySelector("summary")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(caseRecord?.textContent).toContain("Public researchIn progressSupplemental AI");
  });
});
