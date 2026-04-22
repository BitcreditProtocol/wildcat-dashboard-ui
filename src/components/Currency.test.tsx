import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { Currency } from "./Currency";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let storageData: Record<string, string> = {};

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

function renderWithProviders(element: ReactElement): HTMLDivElement {
  return renderIntoDom(
    <QueryClientProvider client={new QueryClient()}>
      <IntlProvider locale="en-US">
        <PreferencesProvider>{element}</PreferencesProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  storageData = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageData[key] ?? null,
      setItem: (key: string, value: string) => {
        storageData[key] = value;
      },
      removeItem: (key: string) => {
        delete storageData[key];
      },
      clear: () => {
        storageData = {};
      },
    },
  });
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

describe("Currency", () => {
  it("renders original amount and secondary converted amount when preference differs", async () => {
    window.localStorage.setItem(
      "user-preferences",
      JSON.stringify({
        theme: "system",
        currency: "btc",
        decimalFormat: "comma",
      })
    );
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
      })
    );

    const page = renderWithProviders(<Currency value={100_000_000} sourceCurrency="sat" />);

    await flush();

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("1.00000000");
    expect(page.textContent).toContain("btc");
  });

  it("renders only the primary amount when preferred currency matches source", async () => {
    window.localStorage.setItem(
      "user-preferences",
      JSON.stringify({
        theme: "system",
        currency: "sat",
        decimalFormat: "comma",
      })
    );
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
      })
    );

    const page = renderWithProviders(<Currency value={12345} sourceCurrency="sat" />);

    await flush();

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("btc");
    expect(page.textContent).not.toContain("USD");
    expect(page.textContent).not.toContain("EUR");
  });

  it("falls back to primary-only output when fiat conversion rates are unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.localStorage.setItem(
      "user-preferences",
      JSON.stringify({
        theme: "system",
        currency: "eur",
        decimalFormat: "comma",
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: () => Promise.resolve("Server Error"),
      })
    );

    const page = renderWithProviders(<Currency value={12345} sourceCurrency="sat" />);

    await flush();

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("EUR");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
