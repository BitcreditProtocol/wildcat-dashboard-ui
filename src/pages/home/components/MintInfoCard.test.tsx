import { act } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return { ...actual, useQuery: () => ({ data: { network: "regtest" }, isLoading: false, isError: false }) };
});

const { MintInfoCard } = await import("./MintInfoCard");

describe("MintInfoCard", () => {
  it("contains malformed Mint info instead of crashing the dashboard", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(
        <IntlProvider locale="en">
          <MintInfoCard />
        </IntlProvider>
      );
    });

    expect(container.textContent).toContain("Failed to load mint information");
    act(() => root.unmount());
  });
});
