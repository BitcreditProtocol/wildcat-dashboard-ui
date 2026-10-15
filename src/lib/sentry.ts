import type { RootOptions } from "react-dom/client";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

type SentryModule = typeof import("@sentry/react");
type SentryOptions = NonNullable<Parameters<SentryModule["init"]>[0]>;

const logger = createLogger("sentry");

let sentry: SentryModule | null = null;

const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
} satisfies SentryOptions["dataCollection"];

function stripFragment(url: string): string {
  return url.split("#", 1)[0];
}

export const beforeBreadcrumb: NonNullable<SentryOptions["beforeBreadcrumb"]> = (breadcrumb) => {
  if (breadcrumb.category === "navigation" && breadcrumb.data) {
    for (const key of ["from", "to"]) {
      const url: unknown = breadcrumb.data[key];
      if (typeof url === "string") {
        breadcrumb.data[key] = stripFragment(url);
      }
    }
  }
  return breadcrumb;
};

export const beforeSend: NonNullable<SentryOptions["beforeSend"]> = (event) => {
  if (event.request?.url) {
    event.request.url = stripFragment(event.request.url);
  }
  return event;
};

export async function initSentry(): Promise<void> {
  const { enabled, dsn, environment, release } = env.sentry;

  if (!enabled || !dsn) {
    return;
  }

  try {
    const Sentry = await import("@sentry/react");

    Sentry.init({ dsn, environment, release, dataCollection: DATA_COLLECTION, beforeBreadcrumb, beforeSend });
    sentry = Sentry;
  } catch (error) {
    logger.warn("Sentry could not be started", error);
  }
}

export function sentryRootOptions(): Pick<RootOptions, "onUncaughtError" | "onCaughtError" | "onRecoverableError"> {
  if (!sentry) {
    return {};
  }

  return {
    onUncaughtError: sentry.reactErrorHandler(),
    onCaughtError: sentry.reactErrorHandler(),
    onRecoverableError: sentry.reactErrorHandler(),
  };
}
