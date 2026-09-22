import { describe, expect, it } from "vitest";
import { RANGES_BY_DIRECTION, customBounds, isWithinBounds, rangeBounds } from "./chart-range";

const NOW = new Date("2026-09-18T12:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const DAY = 24 * 60 * 60;

describe("rangeBounds", () => {
  it("clips nothing for the whole history", () => {
    expect(rangeBounds("all", NOW)).toBeNull();
  });

  it("runs a past window backwards from today", () => {
    expect(rangeBounds("past30d", NOW)).toEqual({ from: NOW_SECONDS - 30 * DAY, to: NOW_SECONDS });
  });

  it("runs a future window forwards from today", () => {
    expect(rangeBounds("next30d", NOW)).toEqual({ from: NOW_SECONDS, to: NOW_SECONDS + 30 * DAY });
  });

  it("widens with the preset", () => {
    const thirty = rangeBounds("past30d", NOW);
    const ninety = rangeBounds("past90d", NOW);

    expect(NOW_SECONDS - thirty!.from).toBe(30 * DAY);
    expect(NOW_SECONDS - ninety!.from).toBe(90 * DAY);
  });

  it("meets today from both sides, so the two windows share an edge", () => {
    expect(rangeBounds("past90d", NOW)?.to).toBe(rangeBounds("next90d", NOW)?.from);
  });

  it("derives no bounds for a custom range, which carries its own", () => {
    expect(rangeBounds("custom", NOW)).toBeNull();
  });
});

describe("RANGES_BY_DIRECTION", () => {
  it("offers a chart only the side of today it plots", () => {
    expect(RANGES_BY_DIRECTION.past).toEqual(["all", "past30d", "past90d"]);
    expect(RANGES_BY_DIRECTION.future).toEqual(["all", "next30d", "next90d"]);
  });

  it("offers both sides to a ladder that straddles today", () => {
    expect(RANGES_BY_DIRECTION.both).toEqual(["all", "past30d", "past90d", "next30d", "next90d"]);
  });
});

describe("customBounds", () => {
  it("covers the whole of both end days in UTC", () => {
    const bounds = customBounds(new Date(2026, 8, 17), new Date(2026, 9, 17));

    expect(bounds.from).toBe(Math.floor(Date.UTC(2026, 8, 17, 0, 0, 0, 0) / 1000));
    expect(bounds.to).toBe(Math.floor(Date.UTC(2026, 9, 17, 23, 59, 59, 999) / 1000));
  });

  it("keeps a bill maturing on the last day picked inside the window", () => {
    const bounds = customBounds(new Date(2026, 8, 17), new Date(2026, 9, 17));
    const maturesOnLastDay = Math.floor(Date.UTC(2026, 9, 17) / 1000);

    expect(isWithinBounds(maturesOnLastDay, bounds)).toBe(true);
  });

  it("orders the ends, so picking backwards still yields a usable window", () => {
    const forwards = customBounds(new Date(2026, 8, 17), new Date(2026, 9, 17));
    const backwards = customBounds(new Date(2026, 9, 17), new Date(2026, 8, 17));

    expect(backwards).toEqual(forwards);
  });

  it("covers a single day picked at both ends", () => {
    const bounds = customBounds(new Date(2026, 8, 17), new Date(2026, 8, 17));

    expect(bounds.to - bounds.from).toBe(DAY - 1);
  });
});

describe("isWithinBounds", () => {
  it("accepts everything when nothing is clipped", () => {
    expect(isWithinBounds(0, null)).toBe(true);
    expect(isWithinBounds(Number.MAX_SAFE_INTEGER, null)).toBe(true);
  });

  it("includes both edges", () => {
    const bounds = { from: 100, to: 200 };

    expect(isWithinBounds(100, bounds)).toBe(true);
    expect(isWithinBounds(200, bounds)).toBe(true);
  });

  it("excludes either side", () => {
    const bounds = { from: 100, to: 200 };

    expect(isWithinBounds(99, bounds)).toBe(false);
    expect(isWithinBounds(201, bounds)).toBe(false);
  });
});
