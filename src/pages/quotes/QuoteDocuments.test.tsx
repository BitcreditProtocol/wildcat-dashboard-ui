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
        creditEvidence={{ status: "available", submittedEvidence: [], evidencePackets: [] }}
        openingDocumentHash={null}
        onOpenDocument={() => undefined}
      />
    );

    expect(page.textContent).toContain("Documents & evidence");
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
        onOpenDocument={onOpenDocument}
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
        onOpenDocument={() => undefined}
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
          submittedEvidence: [
            {
              reference: "invoice-ref",
              label: "invoice.pdf",
              contentDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              origin: "applicant_upload",
            },
          ],
          evidencePackets: [],
        }}
        openingDocumentHash={null}
        onOpenDocument={() => undefined}
      />
    );

    act(() => {
      page.querySelector('button[aria-expanded="false"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(page.textContent).toContain("Credit evidence");
    expect(page.textContent).toContain("invoice.pdf");
    expect(page.textContent).toContain("Applicant upload");
    expect(page.textContent).toContain("No current server receipt");
    expect(Array.from(page.querySelectorAll("button")).some((button) => button.textContent === "View")).toBe(false);
  });
});
