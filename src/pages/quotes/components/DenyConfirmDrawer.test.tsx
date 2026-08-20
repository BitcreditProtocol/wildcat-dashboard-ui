import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { DenyConfirmDrawer } from "./DenyConfirmDrawer";

const confirmDrawerProps = vi.hoisted(() => ({
  current: undefined as { cancelButtonDisabled?: boolean; onOpenChange: (open: boolean) => void } | undefined,
}));

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    cancelButtonDisabled?: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    confirmDrawerProps.current = props;
    return <div>{children}</div>;
  },
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

  it("cannot be dismissed while the governed action is pending", () => {
    const onOpenChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <IntlProvider locale="en">
          <DenyConfirmDrawer title="Deny quote" open isPending onOpenChange={onOpenChange} onSubmit={vi.fn()}>
            <button type="button">Deny</button>
          </DenyConfirmDrawer>
        </IntlProvider>
      );
    });

    expect(confirmDrawerProps.current?.cancelButtonDisabled).toBe(true);
    act(() => confirmDrawerProps.current?.onOpenChange(false));
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
