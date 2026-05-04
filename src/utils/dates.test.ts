import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  daysBetween,
  formatDate,
  getDefaultDeadline,
  getUtcStartOfDate,
  humanReadableDuration,
  humanReadableDurationDays,
  isBeforeUtcStartOfDate,
  toUtcEndOfDay,
} from "./dates";

describe("dates utils", () => {
  beforeEach(() => {
    vi.useRealTimers();
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

  it("uses maturity -2 days when maturity is in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));

    const deadline = getDefaultDeadline("2026-02-25");
    expect(deadline.toISOString()).toBe("2026-02-23T23:59:59.999Z");
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
});
