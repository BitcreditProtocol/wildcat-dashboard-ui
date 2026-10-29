import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

const html = readFileSync("index.html", "utf8");
const boot = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];

afterEach(() => {
  localStorage.removeItem("theme");
  document.documentElement.classList.remove("dark");
  vi.unstubAllGlobals();
});

describe("theme before the first app paint", () => {
  it.each([
    ["dark", false, true],
    ["light", true, false],
    ["system", true, true],
    ["system", false, false],
  ])("honors %s with system dark=%s", (theme, systemDark, expectedDark) => {
    localStorage.setItem("theme", theme);
    vi.stubGlobal("matchMedia", () => ({ matches: systemDark }));
    expect(boot).toBeDefined();
    // Execute the actual HTML bootstrap, before mounting React.
    runInNewContext(boot ?? "", { document, localStorage, matchMedia: () => ({ matches: systemDark }) });
    expect(document.documentElement.classList.contains("dark")).toBe(expectedDark);
    expect(html.indexOf(boot ?? "")).toBeLessThan(html.indexOf("/src/main.tsx"));
  });
});
