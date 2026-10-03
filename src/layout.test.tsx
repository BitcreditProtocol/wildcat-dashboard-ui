import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Layout from "./layout";

// The real sidebar carries the Theme control and its own providers; the layout is what is tested here.
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => <nav>Sidebar</nav> }));

let root: Root | undefined;
const originalWidth = window.innerWidth;
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");

function setViewport(width: number, prefersDark: boolean) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  const matchMedia = (query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") ? prefersDark : query.includes("max-width") ? width < 768 : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
}

function render() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      </IntlProvider>
    )
  );
}

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("theme");
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
});

describe("Layout theme", () => {
  it("applies a dark system theme on phones while the sidebar sheet is closed", () => {
    setViewport(390, true);
    render();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies a stored dark choice on phones", () => {
    setViewport(390, false);
    localStorage.setItem("theme", "dark");
    render();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("leaves the theme to the sidebar's control when the sidebar is shown", () => {
    setViewport(1440, true);
    render();

    // The stubbed sidebar applies nothing, so no second theme owner ran on desktop.
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
