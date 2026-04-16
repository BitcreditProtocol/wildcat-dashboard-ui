import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

vi.mock("@/components/Breadcrumbs", () => ({
  Breadcrumbs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/PageTitle", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ThemeSelector", () => ({
  ThemeSelector: () => <div>ThemeSelectorMock</div>,
}));

vi.mock("@/components/CurrencySelector", () => ({
  CurrencySelector: () => <div>CurrencySelectorMock</div>,
}));

vi.mock("@/components/DecimalFormatSelector", () => ({
  DecimalFormatSelector: () => <div>DecimalFormatSelectorMock</div>,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("SettingsPage", () => {
  it("renders theme, currency, and decimal selectors", () => {
    const page = renderIntoDom(
      <IntlProvider locale="en-US">
        <SettingsPage />
      </IntlProvider>
    );

    expect(page.textContent).toContain("Settings");
    expect(page.textContent).toContain("Appearance");
    expect(page.textContent).toContain("Currency");
    expect(page.textContent).toContain("Decimals");
    expect(page.textContent).toContain("ThemeSelectorMock");
    expect(page.textContent).toContain("CurrencySelectorMock");
    expect(page.textContent).toContain("DecimalFormatSelectorMock");
  });
});
