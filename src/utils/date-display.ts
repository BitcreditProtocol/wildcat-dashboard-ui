import { type DateFormatPattern, formatIsoDateShort } from "@bitcredit/ui-library";

export interface DateDisplayOptions {
  locale: string;
  pattern?: DateFormatPattern;
  timeZone: string;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatters.set(timeZone, formatter);
  }

  return formatter;
}

export function toZonedWallClock(date: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}

export function timeZoneLabel(date: Date, { locale, timeZone }: Pick<DateDisplayOptions, "locale" | "timeZone">): string {
  if (timeZone === "UTC") {
    return "UTC";
  }

  return (
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")
      ?.value ?? timeZone
  );
}

export function formatDisplayDate(date: Date, { locale, pattern, timeZone }: DateDisplayOptions): string {
  return formatIsoDateShort(toZonedWallClock(date, timeZone), locale, pattern);
}

export function formatDisplayDateTime(date: Date, options: DateDisplayOptions): string {
  const wallClock = toZonedWallClock(date, options.timeZone);
  const time = `${String(wallClock.getHours()).padStart(2, "0")}:${String(wallClock.getMinutes()).padStart(2, "0")}`;

  return `${formatIsoDateShort(wallClock, options.locale, options.pattern)}, ${time} ${timeZoneLabel(date, options)}`;
}

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatCalendarDate(value: string, { locale, pattern }: Omit<DateDisplayOptions, "timeZone">): string {
  const match = CALENDAR_DATE_PATTERN.exec(value);

  if (!match) {
    return value;
  }

  return formatIsoDateShort(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), locale, pattern);
}
