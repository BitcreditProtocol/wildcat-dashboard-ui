import type { RootOptions } from "react-dom/client";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

type SentryModule = typeof import("@sentry/react");

const logger = createLogger("sentry");

let sentry: SentryModule | null = null;

const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
} satisfies NonNullable<Parameters<SentryModule["init"]>[0]>["dataCollection"];

export async function initSentry(): Promise<void> {
  const { enabled, dsn, environment, release } = env.sentry;

  if (!enabled || !dsn) {
    return;
  }

  try {
    const Sentry = await import("@sentry/react");

    Sentry.init({ dsn, environment, release, dataCollection: DATA_COLLECTION });
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
