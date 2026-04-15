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
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

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
        documents={[
          {
            name: "invoice.pdf",
            hash: "hash-1",
          },
        ]}
        openingDocumentName={null}
        onOpenDocument={() => undefined}
      />
    );

    expect(page.textContent).toContain("Documents");
    expect(page.textContent).toContain("(1 document)");
    expect(page.textContent).toContain("Show documents");
    expect(page.textContent).not.toContain("invoice.pdf");
  });

  it("shows documents and calls onOpenDocument when expanded", () => {
    const onOpenDocument = vi.fn<(fileName: string) => void>();
    const page = renderWithIntl(
      <QuoteDocuments
        documents={[
          {
            name: "contact-qrcode.png",
            hash: "hash-1",
          },
          {
            name: "invoice.pdf",
            hash: "hash-2",
          },
        ]}
        openingDocumentName={null}
        onOpenDocument={onOpenDocument}
      />
    );

    const toggleButton = page.querySelector('button[aria-expanded="false"]');
    expect(toggleButton).not.toBeNull();

    act(() => {
      toggleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.textContent).toContain("Hide documents");
    expect(page.textContent).toContain("contact-qrcode.png");
    expect(page.textContent).toContain("invoice.pdf");

    const buttons = Array.from(page.querySelectorAll("button"));
    const viewButton = buttons.find((button) => button.textContent === "View");

    expect(viewButton).not.toBeUndefined();

    act(() => {
      viewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenDocument).toHaveBeenCalledWith("contact-qrcode.png");
  });
});
