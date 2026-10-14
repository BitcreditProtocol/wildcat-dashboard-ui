import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatDisplayDate, formatDisplayDateTime, timeZoneLabel, toZonedWallClock } from "./date-display";

// 21 Jan 2026, 23:30 UTC: already the 22nd in Vienna, so the day itself depends on the zone.
const LATE_EVENING_UTC = new Date(Date.UTC(2026, 0, 21, 23, 30));

describe("toZonedWallClock", () => {
  it("reads the clock of the chosen zone, not the machine's", () => {
    const utc = toZonedWallClock(LATE_EVENING_UTC, "UTC");
    const vienna = toZonedWallClock(LATE_EVENING_UTC, "Europe/Vienna");

    expect([utc.getDate(), utc.getHours(), utc.getMinutes()]).toEqual([21, 23, 30]);
    expect([vienna.getDate(), vienna.getHours(), vienna.getMinutes()]).toEqual([22, 0, 30]);
  });
});

describe("formatDisplayDate", () => {
  it("applies the operator's date format", () => {
    expect(formatDisplayDate(LATE_EVENING_UTC, { locale: "en-US", pattern: "dd.MM.yyyy", timeZone: "UTC" })).toBe("21.01.2026");
    expect(formatDisplayDate(LATE_EVENING_UTC, { locale: "en-US", pattern: "yyyy-MM-dd", timeZone: "UTC" })).toBe("2026-01-21");
  });

  it("puts the moment on the day it falls on in the chosen zone", () => {
    expect(formatDisplayDate(LATE_EVENING_UTC, { locale: "en-US", pattern: "dd.MM.yyyy", timeZone: "Europe/Vienna" })).toBe("22.01.2026");
  });
});

describe("formatDisplayDateTime", () => {
  it("adds a 24-hour time and names the zone", () => {
    expect(formatDisplayDateTime(LATE_EVENING_UTC, { locale: "en-US", pattern: "dd.MM.yyyy", timeZone: "UTC" })).toBe(
      "21.01.2026, 23:30 UTC"
    );
    expect(formatDisplayDateTime(LATE_EVENING_UTC, { locale: "en-US", pattern: "dd.MM.yyyy", timeZone: "Europe/Vienna" })).toBe(
      `22.01.2026, 00:30 ${timeZoneLabel(LATE_EVENING_UTC, { locale: "en-US", timeZone: "Europe/Vienna" })}`
    );
  });
});

describe("formatCalendarDate", () => {
  it("formats a maturity date without moving it to another day", () => {
    expect(formatCalendarDate("2026-01-21", { locale: "en-US", pattern: "dd.MM.yyyy" })).toBe("21.01.2026");
    expect(formatCalendarDate("2026-01-21", { locale: "en-US", pattern: "MM/dd/yyyy" })).toBe("01/21/2026");
  });

  it("leaves a value that is not a calendar date alone", () => {
    expect(formatCalendarDate("soon", { locale: "en-US", pattern: "dd.MM.yyyy" })).toBe("soon");
  });
});
