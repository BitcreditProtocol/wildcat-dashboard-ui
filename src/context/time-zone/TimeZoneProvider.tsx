import { type PropsWithChildren, useMemo, useState } from "react";
import { TIME_ZONE_KEY } from "@/constants/storageKeys";
import { isTimeZoneSetting, TimeZoneContext, type TimeZoneSetting } from "./TimeZoneContext";

function readStoredSetting(): TimeZoneSetting {
  try {
    const stored = window.localStorage.getItem(TIME_ZONE_KEY);
    return isTimeZoneSetting(stored) ? stored : "utc";
  } catch {
    return "utc";
  }
}

export function TimeZoneProvider({ children }: PropsWithChildren) {
  const [setting, setStoredSetting] = useState<TimeZoneSetting>(readStoredSetting);

  const value = useMemo(
    () => ({
      setting,
      setSetting: (next: TimeZoneSetting) => {
        try {
          window.localStorage.setItem(TIME_ZONE_KEY, next);
        } catch {
          // Storage can be unavailable (private mode); the choice then lasts for this visit only.
        }
        setStoredSetting(next);
      },
    }),
    [setting]
  );

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}
