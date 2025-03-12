import { differenceInCalendarDays } from "date-fns"

export const daysBetween = (startDate: Date, endDate: Date): number => {
  return differenceInCalendarDays(endDate, startDate)
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
