export type DocumentPreviewMode = "image" | "pdf" | "download";

const EXTENSION_MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const INLINE_IMAGE_MIME_TYPES = new Set(["image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);

function getMimeTypeFromFileName(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || extension === fileName.toLowerCase()) {
    return null;
  }

  return EXTENSION_MIME_TYPES[extension] ?? null;
}

/**
 * Picks the type to render a downloaded attachment as, trusting the server's Content-Type
 * and falling back to the file extension when that type says nothing useful.
 */
export function resolveDocumentMimeType(blobType: string, fileName: string): string {
  const normalized = blobType.split(";")[0].trim().toLowerCase();
  if (!GENERIC_MIME_TYPES.has(normalized)) {
    return normalized;
  }

  return getMimeTypeFromFileName(fileName) ?? normalized;
}

export function getDocumentPreviewMode(mimeType: string): DocumentPreviewMode {
  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (INLINE_IMAGE_MIME_TYPES.has(mimeType)) {
    return "image";
  }

  return "download";
}
