import type { LightInfo } from "@/generated/client/types.gen";

/**
 * A page of the quote list. Current mints answer with `{ data, total }`; older ones
 * answer with a bare `{ quotes }` array and no total, so both shapes are tolerated.
 */
export interface QuoteListPage {
  data?: unknown[];
  quotes?: unknown[];
  total?: number;
}

function isLightInfo(value: unknown): value is LightInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "sum" in value &&
    typeof value.sum === "number"
  );
}

export function getPageQuotes(page: QuoteListPage | undefined): LightInfo[] {
  if (!page) {
    return [];
  }

  return (page.data ?? page.quotes ?? []).filter(isLightInfo);
}

export function isPaginatedPage(page: QuoteListPage | undefined): boolean {
  return Array.isArray(page?.data) && typeof page?.total === "number";
}

/**
 * Offset of the next page, or undefined once every quote has been loaded.
 * Legacy pages carry no `total`, so they stop after the first page.
 */
export function getNextQuotePageOffset(lastPage: QuoteListPage, allPages: QuoteListPage[]): number | undefined {
  const loadedCount = allPages.reduce((sum, page) => sum + getPageQuotes(page).length, 0);
  const total = lastPage.total ?? getPageQuotes(lastPage).length;

  return loadedCount < total ? loadedCount : undefined;
}
