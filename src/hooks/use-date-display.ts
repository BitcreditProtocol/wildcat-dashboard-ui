import { useCallback, useContext, useMemo } from "react";
import { useIntl } from "react-intl";
import { PreferencesContext } from "@/context/preferences/PreferencesContext";
import { resolveTimeZone, TimeZoneContext } from "@/context/time-zone/TimeZoneContext";
import { formatIsoDateShort } from "@bitcredit/ui-library";
import { formatCalendarDate, formatDisplayDate, formatDisplayDateTime, timeZoneLabel } from "@/utils/date-display";

export function useDateDisplay() {
  const { locale } = useIntl();
  const pattern = useContext(PreferencesContext)?.dateFormat;
  const { setting } = useContext(TimeZoneContext);
  const timeZone = resolveTimeZone(setting);

  const options = useMemo(() => ({ locale, pattern, timeZone }), [locale, pattern, timeZone]);

  const formatDate = useCallback((date: Date) => formatDisplayDate(date, options), [options]);
  const formatDateTime = useCallback((date: Date) => formatDisplayDateTime(date, options), [options]);

  return {
    timeZone,
    formatDate,
    formatDateTime,
    formatDateFromSeconds: useCallback((seconds: number) => formatDate(new Date(seconds * 1000)), [formatDate]),
    formatDateTimeFromSeconds: useCallback((seconds: number) => formatDateTime(new Date(seconds * 1000)), [formatDateTime]),
    formatCalendarDate: useCallback((value: string) => formatCalendarDate(value, options), [options]),
    formatPickedDay: useCallback((date: Date) => formatIsoDateShort(date, locale, pattern), [locale, pattern]),
    zoneLabel: useCallback((date: Date = new Date()) => timeZoneLabel(date, options), [options]),
  };
}
