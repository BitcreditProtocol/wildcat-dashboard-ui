import { describe, expect, it } from "vitest";
import { getDocumentPreviewMode, resolveDocumentMimeType } from "./document-preview";

describe("resolveDocumentMimeType", () => {
  it("keeps a specific content type from the server", () => {
    expect(resolveDocumentMimeType("application/pdf", "invoice.pdf")).toBe("application/pdf");
  });

  it("strips charset parameters and normalises case", () => {
    expect(resolveDocumentMimeType("IMAGE/PNG; charset=binary", "scan.png")).toBe("image/png");
  });

  it("falls back to the extension when the server sends a placeholder type", () => {
    expect(resolveDocumentMimeType("application/octet-stream", "invoice.pdf")).toBe("application/pdf");
    expect(resolveDocumentMimeType("", "scan.JPG")).toBe("image/jpeg");
  });

  it("keeps the placeholder type when the extension is unknown or missing", () => {
    expect(resolveDocumentMimeType("application/octet-stream", "contract.xyz")).toBe("application/octet-stream");
    expect(resolveDocumentMimeType("application/octet-stream", "contract")).toBe("application/octet-stream");
  });
});

describe("getDocumentPreviewMode", () => {
  it("renders PDFs and images inline", () => {
    expect(getDocumentPreviewMode("application/pdf")).toBe("pdf");
    expect(getDocumentPreviewMode("image/png")).toBe("image");
    expect(getDocumentPreviewMode("image/svg+xml")).toBe("image");
  });

  it("never renders executable document types inline", () => {
    expect(getDocumentPreviewMode("text/html")).toBe("download");
    expect(getDocumentPreviewMode("application/xhtml+xml")).toBe("download");
    expect(getDocumentPreviewMode("application/octet-stream")).toBe("download");
  });
});
