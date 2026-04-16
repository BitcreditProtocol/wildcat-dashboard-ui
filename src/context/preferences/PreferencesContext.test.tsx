import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider, usePreferences } from "./PreferencesContext";

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

function Probe() {
  const { currency, decimalFormat, setCurrency, setDecimalFormat } = usePreferences();

  return (
    <div>
      <span data-testid="currency">{currency}</span>
      <span data-testid="decimal">{decimalFormat}</span>
      <button type="button" data-testid="set-currency" onClick={() => setCurrency("eur")} />
      <button type="button" data-testid="set-decimal" onClick={() => setDecimalFormat("space")} />
    </div>
  );
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
    },
  });
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("PreferencesProvider", () => {
  it("initializes currency and decimal format from storage", () => {
    storageData["display-currency"] = JSON.stringify("usd");
    storageData["decimal-format"] = JSON.stringify("point");

    const page = renderIntoDom(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>
    );

    expect(page.querySelector('[data-testid="currency"]')?.textContent).toBe("usd");
    expect(page.querySelector('[data-testid="decimal"]')?.textContent).toBe("point");
  });

  it("persists updates to storage", () => {
    const page = renderIntoDom(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>
    );

    act(() => {
      page.querySelector('[data-testid="set-currency"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      page.querySelector('[data-testid="set-decimal"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(storageData["display-currency"]).toBe(JSON.stringify("eur"));
    expect(storageData["decimal-format"]).toBe(JSON.stringify("space"));
  });
});
