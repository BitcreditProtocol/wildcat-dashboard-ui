import { differenceInCalendarYears, differenceInMinutes, subDays, addDays } from "date-fns";
import { differenceInCalendarDays, differenceInCalendarMonths, differenceInHours, differenceInSeconds } from "date-fns";

const UTC_TIME_ZONE = "UTC";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

/**
 * Calculate a smart default deadline based on maturity date.
 * maturityDate is in YYYY-MM-DD format, parsed as midnight UTC (00:00:00).
 * Returns end of day UTC (23:59:59.999) for 2 days before maturity if maturity is in the future,
 * or if maturity is in the past or no maturity date provided, returns end of day UTC for today + 2 days.
 */
export const getDefaultDeadline = (maturityDate?: string | null): Date => {
  let deadline: Date;
  const now = new Date();

  if (maturityDate) {
    const maturity = new Date(maturityDate);
    if (maturity > now) {
      deadline = subDays(maturity, 2);
    } else {
      deadline = addDays(now, 2);
    }
  } else {
    deadline = addDays(now, 2);
  }

  return toUtcEndOfDay(deadline);
};
