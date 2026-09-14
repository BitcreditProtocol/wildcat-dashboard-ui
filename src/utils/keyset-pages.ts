import type { PaginatedResponseKeySetInfo } from "@/generated/client/types.gen";

export type KeysetListPage = PaginatedResponseKeySetInfo;

export function getPageKeysets(page: KeysetListPage | undefined): KeysetListPage["data"] {
  return page?.data ?? [];
}

/**
 * Offset of the next keyset page, or undefined once every keyset has been loaded.
 * An empty page also ends the pagination, so a `total` that runs ahead of what the
 * mint actually returns cannot keep requesting pages forever.
 */
export function getNextKeysetPageOffset(lastPage: KeysetListPage, allPages: KeysetListPage[]): number | undefined {
  const loadedCount = allPages.reduce((sum, page) => sum + getPageKeysets(page).length, 0);
  const total = lastPage.total ?? loadedCount;

  if (getPageKeysets(lastPage).length === 0 || loadedCount >= total) {
    return undefined;
  }

  return loadedCount;
}
