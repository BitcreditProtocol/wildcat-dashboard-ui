import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addUtcDays,
  calendarDayToUtc,
  daysBetween,
  formatDate,
  getDefaultDeadline,
  getUtcStartOfDate,
  humanReadableDuration,
  humanReadableDurationDays,
  isBeforeUtcStartOfDate,
  toUtcEndOfDay,
  utcToCalendarDay,
} from "./dates";

describe("dates utils", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("runs in a non-UTC time zone", () => {
    expect(new Date("2026-09-13T00:00:00.000Z").getTimezoneOffset()).not.toBe(0);
  });

  it("calculates day differences in UTC calendar days", () => {
    const start = new Date("2026-02-18T23:59:59.000Z");
    const end = new Date("2026-02-20T00:00:01.000Z");
    expect(daysBetween(start, end)).toBe(2);
  });

  it("formats date in day-month-year (UTC)", () => {
    const date = new Date("2026-02-20T10:11:12.000Z");
    expect(formatDate("en-US", date)).toBe("20-Feb-26");
  });

  it("returns relative day label", () => {
    const from = new Date("2026-02-20T00:00:00.000Z");
    const until = new Date("2026-02-18T00:00:00.000Z");
    expect(humanReadableDurationDays("en", from, until)).toBe("in 2 days");
  });

  it("returns relative hours label for hour-scale differences", () => {
    const from = new Date("2026-02-20T12:00:00.000Z");
    const until = new Date("2026-02-20T09:00:00.000Z");
    expect(humanReadableDuration("en", from, until)).toBe("in 3 hours");
  });

  it("normalizes a date to the end of its UTC day", () => {
    const date = new Date("2026-02-20T08:15:00.000Z");
    expect(toUtcEndOfDay(date).toISOString()).toBe("2026-02-20T23:59:59.999Z");
  });

  it("normalizes an ISO date string to the start of its UTC day", () => {
    expect(getUtcStartOfDate("2026-03-01")?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("detects times before the UTC start of a date", () => {
    expect(isBeforeUtcStartOfDate("2026-03-01", new Date("2026-02-28T23:59:59.999Z"))).toBe(true);
    expect(isBeforeUtcStartOfDate("2026-03-01", new Date("2026-03-01T00:00:00.000Z"))).toBe(false);
  });

  it("adds days without drifting across the local day boundary", () => {
    expect(addUtcDays(new Date("2026-09-13T00:30:00.000Z"), 2).toISOString()).toBe("2026-09-15T00:30:00.000Z");
    expect(addUtcDays(new Date("2026-09-13T23:30:00.000Z"), 2).toISOString()).toBe("2026-09-15T23:30:00.000Z");
  });

  it("maps a calendar cell to the same day in UTC", () => {
    // What the calendar hands back when the user clicks Sep 13: local midnight.
    const clickedCell = new Date(2026, 8, 13);
    expect(calendarDayToUtc(clickedCell).toISOString()).toBe("2026-09-13T00:00:00.000Z");
  });

  it("maps a UTC date back to the matching calendar cell", () => {
    const cell = utcToCalendarDay(new Date("2026-09-13T23:59:59.999Z"));
    expect([cell.getFullYear(), cell.getMonth(), cell.getDate()]).toEqual([2026, 8, 13]);
    expect([cell.getHours(), cell.getMinutes()]).toEqual([0, 0]);
  });

  it("round-trips a calendar cell through UTC", () => {
    const cell = new Date(2026, 8, 13);
    expect(utcToCalendarDay(calendarDayToUtc(cell)).getTime()).toBe(cell.getTime());
  });

  it("uses maturity +2 days when maturity is in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));

    const deadline = getDefaultDeadline("2026-02-25");
    expect(deadline.toISOString()).toBe("2026-02-27T23:59:59.999Z");
  });

  it("uses now +2 days when maturity is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));

    const deadline = getDefaultDeadline("2026-02-10");
    expect(deadline.toISOString()).toBe("2026-02-20T23:59:59.999Z");
  });

  it("uses now +2 days when maturity is missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));

    const deadline = getDefaultDeadline();
    expect(deadline.toISOString()).toBe("2026-02-20T23:59:59.999Z");
  });

  it("keeps now +2 days on the UTC day when the local day differs", () => {
    vi.useFakeTimers();
    // 2026-02-18 UTC, but still 2026-02-17 in a negative-offset zone.
    vi.setSystemTime(new Date("2026-02-18T02:00:00.000Z"));

    expect(getDefaultDeadline().toISOString()).toBe("2026-02-20T23:59:59.999Z");
  });
});
