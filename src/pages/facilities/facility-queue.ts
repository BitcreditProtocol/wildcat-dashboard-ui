import type { FacilityApplication } from "@bitcredit/ai-credit-shared";
import { facilityStatusKey, facilityStatusMessages } from "./facility-copy";

export const FACILITY_PAGE_SIZE = 20;
export type FacilityQueueStatus = "all" | keyof typeof facilityStatusMessages;
export type FacilityQueueSort = "attention" | "recent" | "oldest" | "name";

function isStatus(value: string | null): value is keyof typeof facilityStatusMessages {
  return value !== null && Object.prototype.hasOwnProperty.call(facilityStatusMessages, value);
}

export function readFacilityQueueParams(params: URLSearchParams) {
  const rawStatus = params.get("status");
  const rawSort = params.get("sort");
  const rawPage = params.get("page") ?? "1";
  const status: FacilityQueueStatus = isStatus(rawStatus) ? rawStatus : "all";
  const sort: FacilityQueueSort = rawSort === "recent" || rawSort === "oldest" || rawSort === "name" ? rawSort : "attention";
  const page = /^\d{1,8}$/u.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  return { search: (params.get("q") ?? "").slice(0, 200), status, sort, page };
}

function searchable(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/** Presentation paging for the bounded demo API; this is not database pagination. */
export function selectFacilityQueue(
  applications: readonly FacilityApplication[],
  params: URLSearchParams,
  locale = "en",
  now = Date.now()
) {
  const options = readFacilityQueueParams(params);
  const words = searchable(options.search.trim()).split(/\s+/u).filter(Boolean);
  const filtered = applications.filter((app) => {
    if (options.status !== "all" && facilityStatusKey(app, now) !== options.status) return false;
    const text = searchable([app.applicantName, app.summary?.purpose, app.summary?.business, app.applicantRef, app.id].join(" "));
    return words.every((word) => text.includes(word));
  });
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const priority = (app: FacilityApplication) => {
    const status = facilityStatusKey(app, now);
    return status === "operator_review" ? 0 : status === "submitted" || status === "assessing" ? 1 : 2;
  };
  filtered.sort((a, b) => {
    if (options.sort === "attention") {
      const rank = priority(a) - priority(b);
      if (rank !== 0) return rank;
    }
    if (options.sort === "name") return collator.compare(a.applicantName, b.applicantName) || a.id.localeCompare(b.id);
    const byDate = a.updatedAt.localeCompare(b.updatedAt);
    return (options.sort === "oldest" ? byDate : -byDate) || a.id.localeCompare(b.id);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / FACILITY_PAGE_SIZE));
  const page = Math.min(options.page, pageCount);
  const offset = (page - 1) * FACILITY_PAGE_SIZE;
  return {
    ...options,
    page,
    pageCount,
    total: applications.length,
    filteredTotal: filtered.length,
    first: filtered.length === 0 ? 0 : offset + 1,
    last: Math.min(offset + FACILITY_PAGE_SIZE, filtered.length),
    items: filtered.slice(offset, offset + FACILITY_PAGE_SIZE),
  };
}

export function facilityQueueLocation(params: URLSearchParams, application?: string): string {
  const next = new URLSearchParams(params);
  next.delete("application");
  if (application !== undefined) next.set("application", application);
  const query = next.toString();
  return `/facilities${query ? `?${query}` : ""}`;
}
