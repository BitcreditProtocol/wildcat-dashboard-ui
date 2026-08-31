function safePdfFilename(label: string): string {
  const normalized = Array.from(label.normalize("NFC"), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 || character === "/" || character === "\\" ? "-" : character;
  })
    .join("")
    .trim();
  const bounded = normalized.slice(0, 180) || "evidence.pdf";
  return bounded.toLowerCase().endsWith(".pdf") ? bounded : `${bounded}.pdf`;
}

/** Download authenticated PDF bytes without rendering them in the dashboard origin. */
export function beginPdfDownload(blob: Blob, label: string): string {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = safePdfFilename(label);
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  return blobUrl;
}
