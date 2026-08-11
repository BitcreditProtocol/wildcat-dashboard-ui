import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { DenyConfirmDrawer } from "./DenyConfirmDrawer";

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe("DenyConfirmDrawer", () => {
  it("shows the exact verification items that will be returned", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <IntlProvider locale="en">
          <DenyConfirmDrawer
            title="Return for information"
            mode="return_for_information"
            requiredItems={["Signed delivery receipt", "Current acceptor financials"]}
            open
            onOpenChange={vi.fn()}
            onSubmit={vi.fn()}
          >
            <button type="button">Return</button>
          </DenyConfirmDrawer>
        </IntlProvider>
      );
    });

    expect(container.textContent).toContain("Required information");
    expect(container.textContent).toContain("Signed delivery receipt");
    expect(container.textContent).toContain("Current acceptor financials");
    act(() => root.unmount());
  });
});
