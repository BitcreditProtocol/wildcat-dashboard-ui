import type { DeniedMeltOp } from "@/generated/client/types.gen";
import { MS_PER_DAY, UTC_TIME_ZONE } from "./constants";
import type { MeltRequestsFilter } from "./types";

export function parseCreatedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getUtcDayStartTime(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function matchesRequestFilter(operation: DeniedMeltOp, filter: MeltRequestsFilter, now: Date): boolean {
  switch (filter) {
    case "today": {
      const createdTime = parseCreatedTime(operation.created);
      return createdTime >= getUtcDayStartTime(now) && createdTime < getUtcDayStartTime(now) + MS_PER_DAY;
    }
    case "last-7-days": {
      const createdTime = parseCreatedTime(operation.created);
      return createdTime >= now.getTime() - 7 * MS_PER_DAY;
    }
    case "zero-amount":
      return operation.amount === 0;
    case "non-zero-amount":
      return operation.amount !== 0;
    default:
      return true;
  }
}

export function formatCreatedAt(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: UTC_TIME_ZONE,
  }).format(date);
}

export function getSearchableContent(operation: DeniedMeltOp, locale: string): string {
  return [
    operation.id,
    operation.amount.toString(),
    `${operation.amount} sat`,
    operation.created,
    formatCreatedAt(operation.created, locale),
    UTC_TIME_ZONE,
  ]
    .join(" ")
    .toLowerCase();
}
