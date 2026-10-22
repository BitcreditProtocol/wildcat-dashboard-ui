import { createContext } from "react";

/**
 * Which clock the dashboard shows times on. The mint stores and reports everything in UTC, so
 * that is the default; "local" follows the operator's browser instead.
 */
export type TimeZoneSetting = "utc" | "local";

export interface TimeZoneContextType {
  setting: TimeZoneSetting;
  setSetting: (setting: TimeZoneSetting) => void;
}

export const TimeZoneContext = createContext<TimeZoneContextType>({
  setting: "utc",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSetting: () => {},
});

export function isTimeZoneSetting(value: unknown): value is TimeZoneSetting {
  return value === "utc" || value === "local";
}

/** The browser's own IANA zone, e.g. "Europe/Vienna". */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The IANA zone a setting resolves to. */
export function resolveTimeZone(setting: TimeZoneSetting): string {
  return setting === "utc" ? "UTC" : browserTimeZone();
}
