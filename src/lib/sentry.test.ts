import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryConfig = vi.hoisted(() => ({
  enabled: false,
  dsn: undefined as string | undefined,
  environment: undefined as string | undefined,
  release: undefined as string | undefined,
}));
const sentryInit = vi.hoisted(() => vi.fn());
const reactErrorHandler = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock("@/lib/env", () => ({ env: { sentry: sentryConfig } }));
vi.mock("@sentry/react", () => ({ init: sentryInit, reactErrorHandler }));

async function loadSentry() {
  vi.resetModules();
  return import("./sentry");
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(sentryConfig, { enabled: false, dsn: undefined, environment: undefined, release: undefined });
});

describe("initSentry", () => {
  it("stays off by default", async () => {
    const { initSentry, sentryRootOptions } = await loadSentry();

    await initSentry();

    expect(sentryInit).not.toHaveBeenCalled();
    expect(sentryRootOptions()).toEqual({});
  });

  it("stays off when enabled without a DSN", async () => {
    sentryConfig.enabled = true;
    const { initSentry } = await loadSentry();

    await initSentry();

    expect(sentryInit).not.toHaveBeenCalled();
  });

  it("reports to the configured project and keeps request data out of the reports", async () => {
    Object.assign(sentryConfig, { enabled: true, dsn: "https://key@o1.ingest.sentry.io/1", environment: "dev", release: "abc123" });
    const { initSentry, sentryRootOptions } = await loadSentry();

    await initSentry();

    expect(sentryInit).toHaveBeenCalledWith({
      dsn: "https://key@o1.ingest.sentry.io/1",
      environment: "dev",
      release: "abc123",
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    });
    expect(Object.keys(sentryRootOptions()).sort()).toEqual(["onCaughtError", "onRecoverableError", "onUncaughtError"]);
  });

  it("lets the dashboard start when Sentry fails to load", async () => {
    Object.assign(sentryConfig, { enabled: true, dsn: "https://key@o1.ingest.sentry.io/1" });
    sentryInit.mockImplementationOnce(() => {
      throw new Error("blocked by an ad blocker");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { initSentry, sentryRootOptions } = await loadSentry();

    await expect(initSentry()).resolves.toBeUndefined();
    expect(sentryRootOptions()).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});
