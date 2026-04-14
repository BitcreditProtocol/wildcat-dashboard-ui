import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import Big from "big.js";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { GrossToNetDiscountForm } from "./GrossToNetDiscountForm";

vi.mock("./ui/drawer", () => ({
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

function renderWithProviders(
  element: ReactElement,
  locale = "en-US",
): HTMLDivElement {
  return renderIntoDom(
    <IntlProvider locale={locale}>
      <PreferencesProvider>{element}</PreferencesProvider>
    </IntlProvider>,
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

describe("GrossToNetDiscountForm", () => {
  it("formats non-sat summary values using the decimal separator preference", async () => {
    storageData["decimal-format"] = JSON.stringify("point");
    storageData["display-currency"] = JSON.stringify("eur");
    storageData["offer-form-quote-1"] = JSON.stringify({
      daysInput: "30",
      discountRateInput: "10",
      netInput: "",
    });

    const page = renderWithProviders(
      <GrossToNetDiscountForm
        endDate={new Date("2026-03-01")}
        gross={{ value: new Big("1000.00"), currency: "USD" }}
        quoteId="quote-1"
        onSubmit={() => undefined}
      />,
    );

    await flush();

    expect(page.textContent).toContain("9,00");
    expect(page.textContent).toContain("+1.000,00");
    expect(page.textContent).toContain("USD");
  });

  it("keeps sat formatting integer even when display currency preference is fiat", async () => {
    storageData["decimal-format"] = JSON.stringify("space");
    storageData["display-currency"] = JSON.stringify("usd");
    storageData["offer-form-quote-2"] = JSON.stringify({
      daysInput: "30",
      discountRateInput: "10",
      netInput: "",
    });

    const page = renderWithProviders(
      <GrossToNetDiscountForm
        endDate={new Date("2026-03-01")}
        gross={{ value: new Big("1000"), currency: "sat" }}
        quoteId="quote-2"
        onSubmit={() => undefined}
      />,
    );

    await flush();

    expect(
      (page.querySelector("#netInput") as HTMLInputElement | null)?.value,
    ).toBe("991");
    expect(page.textContent).toContain("9");
    expect(page.textContent).toContain("+1 000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("$");
    expect(page.textContent).not.toContain("usd");
  });
});
