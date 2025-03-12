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

  const diffMillis = from.getTime() - until.getTime()
  return relativeTimeFormatter.format(Math.round(diffMillis / (1000 * 60 * 60 * 24)), "day")
}

export const formatDate = (locale: string, date: Date): string => {
  const year = new Intl.DateTimeFormat(locale, { year: "2-digit" }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date)
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date)
  return `${day}-${month}-${year}`
}
