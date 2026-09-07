import { differenceInCalendarYears, differenceInMinutes } from "date-fns";
import { differenceInCalendarDays, differenceInCalendarMonths, differenceInHours, differenceInSeconds } from "date-fns";

const UTC_TIME_ZONE = "UTC";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PART_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export const daysBetween = (startDate: Date, endDate: Date): number => {
  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.floor((endUtc - startUtc) / MS_PER_DAY);
};

export function humanReadableDuration(locale: string, from: Date, until = new Date(Date.now())) {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });

  const diffYears = differenceInCalendarYears(from, until);
  if (Math.abs(diffYears) >= 1) {
    return relativeTimeFormatter.format(diffYears, "years");
  }
  const diffMonths = differenceInCalendarMonths(from, until);
  if (Math.abs(diffMonths) >= 1) {
    return relativeTimeFormatter.format(diffMonths, "months");
  }
  const diffDays = differenceInCalendarDays(from, until);
  if (Math.abs(diffDays) >= 1) {
    return relativeTimeFormatter.format(diffDays, "days");
  }
  const diffHours = differenceInHours(from, until);
  if (Math.abs(diffHours) > 1) {
    return relativeTimeFormatter.format(diffHours, "hours");
  }
  const diffMinutes = differenceInMinutes(from, until);
  if (Math.abs(diffMinutes) > 1) {
    return relativeTimeFormatter.format(diffMinutes, "minutes");
  }
  const diffSeconds = differenceInSeconds(from, until);
  return relativeTimeFormatter.format(diffSeconds, "seconds");
}

export function humanReadableDurationDays(locale: string, from: Date, until = new Date(Date.now())) {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });

  const diffDays = differenceInCalendarDays(from, until);
  return relativeTimeFormatter.format(diffDays, "day");
}

export const formatDate = (locale: string, date: Date): string => {
  const year = new Intl.DateTimeFormat(locale, {
    year: "2-digit",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
  return `${day}-${month}-${year}`;
};

export const formatDateLong = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
};

export const formatDateShort = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
};

export const formatMonthLong = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
};

export const formatMonthYear = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
};

export const formatYearNumeric = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
};

export const toUtcEndOfDay = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

export const addUtcDays = (date: Date, days: number): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
};

/**
 * The calendar library builds its grid from local-time dates (one local midnight per cell),
 * while dates are stored, submitted and displayed in UTC everywhere else. These two helpers
 * are the only bridge between the two: convert at the calendar boundary so the day a user
 * clicks in the grid is that same day in UTC.
 */

/** Local-midnight date coming out of the calendar grid -> start of that day in UTC. */
export const calendarDayToUtc = (date: Date): Date => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

/** UTC date -> the local-midnight date of the matching calendar grid cell. */
export const utcToCalendarDay = (date: Date): Date => {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const getUtcStartOfDate = (dateValue?: string | null): Date | null => {
  if (!dateValue) {
    return null;
  }

  const isoDatePart = ISO_DATE_PART_PATTERN.exec(dateValue);
  if (isoDatePart) {
    const year = Number(isoDatePart[1]);
    const monthIndex = Number(isoDatePart[2]) - 1;
    const day = Number(isoDatePart[3]);
    const utcStart = new Date(Date.UTC(year, monthIndex, day));

    if (utcStart.getUTCFullYear() === year && utcStart.getUTCMonth() === monthIndex && utcStart.getUTCDate() === day) {
      return utcStart;
    }

    return null;
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
};

export const isBeforeUtcStartOfDate = (dateValue?: string | null, now = new Date()): boolean => {
  const utcStart = getUtcStartOfDate(dateValue);
  return Boolean(utcStart && now.getTime() < utcStart.getTime());
};

/**
 * Calculate a smart default deadline based on maturity date.
 * maturityDate is in YYYY-MM-DD format, parsed as midnight UTC (00:00:00).
 * Returns end of day UTC (23:59:59.999) for maturity + 2 days if maturity is in the future,
 * or if maturity is in the past or no maturity date provided, returns end of day UTC for today + 2 days.
 * The day arithmetic runs in UTC, so the result does not shift for viewers whose local day
 * differs from the UTC day.
 */
export const getDefaultDeadline = (maturityDate?: string | null): Date => {
  const now = new Date();
  const maturityUtcStart = getUtcStartOfDate(maturityDate);
  const base = maturityUtcStart && maturityUtcStart.getTime() > now.getTime() ? maturityUtcStart : now;

  return toUtcEndOfDay(addUtcDays(base, 2));
};
