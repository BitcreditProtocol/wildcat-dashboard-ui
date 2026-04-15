import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { CurrencySelector } from "./CurrencySelector";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="currency-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

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
    <IntlProvider locale="en-US">
      <PreferencesProvider>{element}</PreferencesProvider>
    </IntlProvider>,
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

describe("CurrencySelector", () => {
  it("renders all available currency options", () => {
    const page = renderWithProviders(<CurrencySelector />);

    expect(page.textContent).toContain("Bitcoin (sat)");
    expect(page.textContent).toContain("Bitcoin (BTC)");
    expect(page.textContent).toContain("Euro (EUR)");
    expect(page.textContent).toContain("US Dollar (USD)");
  });

  it("persists the selected currency preference", () => {
    const page = renderWithProviders(<CurrencySelector />);
    const select = page.querySelector<HTMLSelectElement>(
      '[data-testid="currency-select"]',
    );

    expect(select?.value).toBe("sat");

    act(() => {
      select?.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );
    });

    if (select) {
      select.value = "eur";
      act(() => {
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    expect(storageData["display-currency"]).toBe(JSON.stringify("eur"));
  });
});
