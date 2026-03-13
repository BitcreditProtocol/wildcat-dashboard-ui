import { useMemo } from "react";

const UTC_TIME_ZONE = "UTC";

interface UtcDateFormatters {
  formatMonthShort: (date: Date) => string;
  formatDay2Digit: (date: Date) => string;
  formatYearNumeric: (date: Date) => string;
  formatDateMmmDdYyyy: (date: Date) => string;
}

export const useUtcDateFormatters = (locale: string): UtcDateFormatters => {
  const formatters = useMemo(() => {
    return {
      monthShort: new Intl.DateTimeFormat(locale, {
        month: "short",
        timeZone: UTC_TIME_ZONE,
      }),
      day2Digit: new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        timeZone: UTC_TIME_ZONE,
      }),
      yearNumeric: new Intl.DateTimeFormat(locale, {
        year: "numeric",
        timeZone: UTC_TIME_ZONE,
      }),
      dateMmmDdYyyy: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: UTC_TIME_ZONE,
      }),
    };
  }, [locale]);

  return {
    formatMonthShort: (date) => formatters.monthShort.format(date),
    formatDay2Digit: (date) => formatters.day2Digit.format(date),
    formatYearNumeric: (date) => formatters.yearNumeric.format(date),
    formatDateMmmDdYyyy: (date) => formatters.dateMmmDdYyyy.format(date),
  };
};
