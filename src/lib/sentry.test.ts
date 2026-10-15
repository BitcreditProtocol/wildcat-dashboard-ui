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
    const { initSentry, sentryRootOptions, beforeBreadcrumb, beforeSend } = await loadSentry();

    await initSentry();

    expect(sentryInit).toHaveBeenCalledWith({
      dsn: "https://key@o1.ingest.sentry.io/1",
      environment: "dev",
      release: "abc123",
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      beforeBreadcrumb,
      beforeSend,
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

const CALLBACK_URL = "https://dashboard.example/quotes#state=abc&session_state=def&code=ghi";

describe("beforeBreadcrumb", () => {
  it("drops the Keycloak callback fragment from navigation breadcrumbs", async () => {
    const { beforeBreadcrumb } = await loadSentry();

    const breadcrumb = beforeBreadcrumb({ category: "navigation", data: { from: CALLBACK_URL, to: "/quotes#code=ghi" } });

    expect(breadcrumb?.data).toEqual({ from: "https://dashboard.example/quotes", to: "/quotes" });
  });

  it("keeps navigation URLs without a fragment and breadcrumbs without URLs", async () => {
    const { beforeBreadcrumb } = await loadSentry();

    expect(beforeBreadcrumb({ category: "navigation", data: { from: "/", to: "/quotes" } })?.data).toEqual({ from: "/", to: "/quotes" });
    expect(beforeBreadcrumb({ category: "navigation" })).toEqual({ category: "navigation" });
    expect(beforeBreadcrumb({ category: "navigation", data: { from: 1 } })?.data).toEqual({ from: 1 });
    expect(beforeBreadcrumb({ category: "ui.click", message: "button#login" })).toEqual({ category: "ui.click", message: "button#login" });
  });
});

describe("beforeSend", () => {
  it("drops the Keycloak callback fragment from the event's request URL", async () => {
    const { beforeSend } = await loadSentry();

    const event = await beforeSend({ type: undefined, request: { url: CALLBACK_URL } }, {});

    expect(event?.request?.url).toBe("https://dashboard.example/quotes");
  });

  it("keeps events without a fragment or request", async () => {
    const { beforeSend } = await loadSentry();

    expect((await beforeSend({ type: undefined, request: { url: "https://dashboard.example/quotes" } }, {}))?.request?.url).toBe(
      "https://dashboard.example/quotes"
    );
    expect(await beforeSend({ type: undefined, message: "boom" }, {})).toEqual({ type: undefined, message: "boom" });
  });
});
