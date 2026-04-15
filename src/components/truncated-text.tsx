import * as React from "react";

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2329 && codePoint <= 0x232a) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

export function visualWidth(value: string): number {
  return Array.from(value).reduce((total, char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      return total;
    }

    return total + (isWideCodePoint(codePoint) ? 2 : 1);
  }, 0);
}

export function containsRtl(value: string): boolean {
  return /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(value);
}

export function isLikelyNodeId(value: string): boolean {
  const trimmed = value.trim();
  return /^bitcr[a-z0-9][0-9a-f]{20,}$/i.test(trimmed);
}

type SegmentPart = { segment: string };
type SegmenterInstance = {
  segment: (input: string) => Iterable<SegmentPart>;
};
type SegmenterCtor = new (locales?: string | string[], options?: { granularity: "grapheme" }) => SegmenterInstance;

function splitIntoGraphemes(value: string): string[] {
  const maybeSegmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;

  if (typeof maybeSegmenter === "function") {
    const segmenter = new maybeSegmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  }

  return Array.from(value);
}

function truncateEnd(value: string, maxLength: number): string {
  const graphemes = splitIntoGraphemes(value);

  if (graphemes.length <= maxLength) {
    return value;
  }

  const keep = Math.max(maxLength - 1, 1);
  return `${graphemes.slice(0, keep).join("")}…`;
}

function truncateMiddle(value: string, maxLength: number): string {
  const graphemes = splitIntoGraphemes(value);

  if (graphemes.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return "…";
  }

  if (maxLength <= 3) {
    return `${graphemes.slice(0, maxLength - 1).join("")}…`;
  }

  const keepCount = maxLength - 1;
  const headCount = Math.ceil(keepCount / 2);
  const tailCount = Math.floor(keepCount / 2);

  return `${graphemes.slice(0, headCount).join("")}…${graphemes.slice(graphemes.length - tailCount).join("")}`;
}

function truncateWithSafeguard(line: string, maxLength: number, truncationMode: "end" | "middle"): string {
  if (line.length <= maxLength && visualWidth(line) <= maxLength) {
    return line;
  }

  const useEndTruncation = truncationMode === "end" || containsRtl(line);
  let effectiveLength = maxLength;
  let candidate = useEndTruncation ? truncateEnd(line, effectiveLength) : truncateMiddle(line, effectiveLength);

  while (visualWidth(candidate) > maxLength && effectiveLength > 1) {
    effectiveLength -= 1;
    candidate = useEndTruncation ? truncateEnd(line, effectiveLength) : truncateMiddle(line, effectiveLength);
  }

  return candidate;
}

export function extractTextFromNode(node: unknown): string {
  if (node == null) {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((value) => extractTextFromNode(value)).join("");
  }

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextFromNode(el.props.children);
  }

  return "";
}

export type TruncatedTextState = {
  flatLabel: string;
  hasComputedTruncation: boolean;
  hasLengthFallbackOverflow: boolean;
  lines: string[];
  shouldShowPopover: boolean;
  visibleLines: string[];
};

export function getTruncatedTextState(text: React.ReactNode, maxLength?: number): TruncatedTextState {
  const effectiveMaxLength = maxLength ?? 24;
  const hasExplicitMaxLength = maxLength !== undefined;
  const textStr = extractTextFromNode(text);
  const rawLines = textStr.split(/\r?\n/);
  const lines = rawLines.map((line) => line.replace(/\s+$/g, ""));
  const computedVisibleLines = lines.map((line) => {
    if (isLikelyNodeId(line)) {
      return truncateWithSafeguard(line, effectiveMaxLength, "middle");
    }

    if (
      hasExplicitMaxLength &&
      !containsRtl(line) &&
      visualWidth(line) === line.length &&
      (line.length > effectiveMaxLength || visualWidth(line) > effectiveMaxLength)
    ) {
      return truncateWithSafeguard(line, effectiveMaxLength, "end");
    }

    return line;
  });
  const hasComputedTruncation = computedVisibleLines.some((line, index) => line !== lines[index]);
  const hasLengthFallbackOverflow = lines.some((line) => {
    if (isLikelyNodeId(line)) {
      return false;
    }

    if (hasExplicitMaxLength) {
      const hasExceededLimit = line.length > effectiveMaxLength || visualWidth(line) > effectiveMaxLength;
      const canUseExplicitEndTruncation = !containsRtl(line) && visualWidth(line) === line.length;

      return hasExceededLimit && !canUseExplicitEndTruncation;
    }

    return line.length > effectiveMaxLength || visualWidth(line) > effectiveMaxLength;
  });

  return {
    flatLabel: lines.join(", "),
    hasComputedTruncation,
    hasLengthFallbackOverflow,
    lines,
    shouldShowPopover: hasComputedTruncation || hasLengthFallbackOverflow,
    visibleLines: hasComputedTruncation ? computedVisibleLines : lines,
  };
}
