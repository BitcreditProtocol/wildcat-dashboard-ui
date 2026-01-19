import { differenceInCalendarYears, differenceInMinutes } from "date-fns"
import { differenceInCalendarDays, differenceInCalendarMonths, differenceInHours, differenceInSeconds } from "date-fns"

export const daysBetween = (startDate: Date, endDate: Date): number => {
  return differenceInCalendarDays(endDate, startDate)
}

export function humanReadableDuration(locale: string, from: Date, until = new Date(Date.now())) {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  const diffYears = differenceInCalendarYears(from, until)
  if (Math.abs(diffYears) >= 1) {
    return relativeTimeFormatter.format(diffYears, "years")
  }
  const diffMonths = differenceInCalendarMonths(from, until)
  if (Math.abs(diffMonths) >= 1) {
    return relativeTimeFormatter.format(diffMonths, "months")
  }
  const diffDays = differenceInCalendarDays(from, until)
  if (Math.abs(diffDays) >= 1) {
    return relativeTimeFormatter.format(diffDays, "days")
  }
  const diffHours = differenceInHours(from, until)
  if (Math.abs(diffHours) > 1) {
    return relativeTimeFormatter.format(diffHours, "hours")
  }
  const diffMinutes = differenceInMinutes(from, until)
  if (Math.abs(diffMinutes) > 1) {
    return relativeTimeFormatter.format(diffMinutes, "minutes")
  }
  const diffSeconds = differenceInSeconds(from, until)
  return relativeTimeFormatter.format(diffSeconds, "seconds")
}

export function humanReadableDurationDays(locale: string, from: Date, until = new Date(Date.now())) {
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  const diffDays = differenceInCalendarDays(from, until)
  return relativeTimeFormatter.format(diffDays, "day")
}

export const formatDate = (locale: string, date: Date): string => {
  const year = new Intl.DateTimeFormat(locale, { year: "2-digit" }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date)
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date)
  return `${day}-${month}-${year}`
}

export const formatDateLong = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export const formatDateShort = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export const formatMonthLong = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(date)
}

export const formatMonthYear = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(date)
}

export const formatYearNumeric = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, { year: "numeric" }).format(date)
}

/**
 * Calculate a smart default deadline based on maturity date.
 * Returns end of day UTC (23:59:59.999) for maturity + 2 days if maturity is in the future,
 * otherwise end of day UTC for today + 2 days.
 */
export const getDefaultDeadline = (maturityDate?: string | null): Date => {
  const twoDays = 2 * 24 * 60 * 60 * 1000
  const now = new Date()

  let deadline: Date

  if (maturityDate) {
    const maturity = new Date(maturityDate)
    if (maturity > now) {
      deadline = new Date(maturity.getTime() + twoDays)
    } else {
      deadline = new Date(Date.now() + twoDays)
    }
  } else {
    deadline = new Date(Date.now() + twoDays)
  }

  deadline.setUTCHours(23, 59, 59, 999)
  return deadline
}

