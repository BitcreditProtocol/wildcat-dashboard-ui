import { describe, expect, it } from "vitest";
import { facilityFixture } from "./facility-test-fixture";
import { FACILITY_PAGE_SIZE, facilityQueueLocation, readFacilityQueueParams, selectFacilityQueue } from "./facility-queue";

const applications = Array.from({ length: 300 }, (_, index) =>
  facilityFixture({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    applicantName: `Farm ${String(index + 1)}`,
    updatedAt: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
  })
);

describe("facility queue selection", () => {
  it("pages 300 applications without duplication or mutating the source order", () => {
    const initialOrder = applications.map((app) => app.id);
    const pages = Array.from({ length: 15 }, (_, index) =>
      selectFacilityQueue(applications, new URLSearchParams({ page: String(index + 1), sort: "recent" }))
    );
    expect(pages.every((page) => page.items.length === FACILITY_PAGE_SIZE)).toBe(true);
    expect(pages[0]?.items[0]?.applicantName).toBe("Farm 300");
    expect(pages[14]?.last).toBe(300);
    expect(new Set(pages.flatMap((page) => page.items.map((app) => app.id))).size).toBe(300);
    expect(applications.map((app) => app.id)).toEqual(initialOrder);
  });

  it("searches the whole dataset before paging, ignoring accents and case", () => {
    const items = [
      ...applications,
      facilityFixture({
        applicantName: "Café Álvarez",
        summary: {
          ...applications[0]?.summary,
          business: "Coffee",
          purpose: "Seasonal harvest costs",
          buyers: "Cooperative",
          timing: "Weekly",
          openQuestions: [],
        },
      }),
    ];
    const page = selectFacilityQueue(items, new URLSearchParams("q=CAFE+harvest&page=15"));
    expect(page.filteredTotal).toBe(1);
    expect(page.items[0]?.applicantName).toBe("Café Álvarez");
    expect(page.page).toBe(1);
    expect(page.total).toBe(301);
  });

  it("separates applicant permission from operator-ready review", () => {
    const waiting = facilityFixture({ applicantName: "Permission needed" });
    if (!waiting.assessment) throw new Error("Assessment fixture missing");
    waiting.assessment.stopReason = "consent_required";
    const items = [waiting, applications[0] ?? facilityFixture()];
    const ready = selectFacilityQueue(items, new URLSearchParams("status=operator_review"));
    expect(ready.items.map((app) => app.applicantName)).toEqual(["Farm 1"]);
    expect(selectFacilityQueue(items, new URLSearchParams("status=consent_required")).items).toEqual([waiting]);
  });

  it("prioritizes operator review, then preparation, not accepted records", () => {
    const ready = facilityFixture({ applicantName: "Review me", status: "operator_review", updatedAt: "2026-01-01T00:00:00.000Z" });
    const accepted = facilityFixture({ status: "agreement_accepted", applicantName: "Accepted" });
    const processing = facilityFixture({ status: "assessing", applicantName: "Processing" });
    expect(selectFacilityQueue([accepted, processing, ready], new URLSearchParams()).items.map((app) => app.applicantName)).toEqual([
      "Review me",
      "Processing",
      "Accepted",
    ]);
  });

  it("uses a stable id tie break and supports oldest and natural name order", () => {
    const first = applications[0];
    const second = applications[1];
    if (!first || !second) throw new Error("Fixtures missing");
    const sameDate = [second, { ...first, updatedAt: second.updatedAt }];
    expect(selectFacilityQueue(sameDate, new URLSearchParams("sort=recent")).items[0]?.id).toBe(first.id);
    expect(selectFacilityQueue(applications, new URLSearchParams("sort=oldest")).items[0]?.applicantName).toBe("Farm 1");
    expect(selectFacilityQueue(applications, new URLSearchParams("sort=name")).items[1]?.applicantName).toBe("Farm 2");
  });

  it("clamps stale pages after records change and handles empty results", () => {
    const stale = selectFacilityQueue(applications.slice(0, 21), new URLSearchParams("page=15"));
    expect(stale.page).toBe(2);
    expect(stale.items).toHaveLength(1);
    const empty = selectFacilityQueue(applications, new URLSearchParams("q=no-matching-business&page=99"));
    expect([empty.first, empty.last, empty.filteredTotal]).toEqual([0, 0, 0]);
    expect(empty.page).toBe(1);
  });

  it("rejects invalid status, sort and page parameters", () => {
    expect(readFacilityQueueParams(new URLSearchParams("status=__proto__&sort=bogus&page=Infinity"))).toEqual({
      search: "",
      status: "all",
      sort: "attention",
      page: 1,
    });
    expect(readFacilityQueueParams(new URLSearchParams("page=-2")).page).toBe(1);
  });

  it("keeps queue context in exact detail and back links", () => {
    const params = new URLSearchParams("q=milk&status=operator_review&sort=oldest&page=3");
    expect(facilityQueueLocation(params, "app/id")).toBe(
      "/facilities?q=milk&status=operator_review&sort=oldest&page=3&application=app%2Fid"
    );
    params.set("application", "app/id");
    expect(facilityQueueLocation(params)).toBe("/facilities?q=milk&status=operator_review&sort=oldest&page=3");
    expect(params.get("application")).toBe("app/id");
  });
});
