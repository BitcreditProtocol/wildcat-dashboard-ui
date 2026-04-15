import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRates } from "./useRates";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function HookProbe() {
  const query = useRates();

  return (
    <div
      data-status={query.status}
      data-has-data={query.data ? "true" : "false"}
      data-data={query.data ? JSON.stringify(query.data) : ""}
    />
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function waitForSettled(
  getStatus: () => string | null,
  maxAttempts = 10,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await flush();
    if (getStatus() !== "pending") {
      return;
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("useRates", () => {
  it("returns parsed coinbase rates on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
          data: {
            rates: {
              USD: "100000",
              EUR: "90000",
            },
          },
        }),
      }),
    );

    const page = renderIntoDom(
      <QueryClientProvider client={new QueryClient()}>
        <HookProbe />
      </QueryClientProvider>,
    );

    await waitForSettled(
      () => page.firstElementChild?.getAttribute("data-status") ?? null,
    );

    const probe = page.firstElementChild;
    expect(probe?.getAttribute("data-status")).toBe("success");
    expect(probe?.getAttribute("data-has-data")).toBe("true");
    expect(probe?.getAttribute("data-data")).toContain('"usdPerBtc":100000');
    expect(probe?.getAttribute("data-data")).toContain('"eurPerUsd":0.9');
  });

  it("falls back to undefined when the request fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: () => Promise.resolve("Server Error"),
      }),
    );

    const page = renderIntoDom(
      <QueryClientProvider client={new QueryClient()}>
        <HookProbe />
      </QueryClientProvider>,
    );

    await waitForSettled(
      () => page.firstElementChild?.getAttribute("data-status") ?? null,
    );

    const probe = page.firstElementChild;
    expect(probe?.getAttribute("data-status")).toBe("success");
    expect(probe?.getAttribute("data-has-data")).toBe("false");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
