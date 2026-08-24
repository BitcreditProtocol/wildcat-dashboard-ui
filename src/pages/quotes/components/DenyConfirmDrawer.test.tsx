import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { DenyConfirmDrawer } from "./DenyConfirmDrawer";

const confirmDrawerProps = vi.hoisted(() => ({
  current: undefined as
    | {
        cancelButtonDisabled?: boolean;
        onOpenChange: (open: boolean) => void;
        onSubmit: () => void;
        submitButtonDisabled?: boolean;
      }
    | undefined,
}));

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    cancelButtonDisabled?: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    submitButtonDisabled?: boolean;
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

  it("requires an explicit server-listed evidence selection and submits no label or internal display data", () => {
    const onSubmit = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <IntlProvider locale="en">
          <DenyConfirmDrawer
            title="Deny quote"
            materialEvidenceOptions={[
              { kind: "bill_state", reference: `sha256:${"a".repeat(64)}` },
              { kind: "submitted_document", reference: "invoice-a", label: "commercial-invoice.pdf" },
            ]}
            open
            requireMaterialEvidence
            onOpenChange={vi.fn()}
            onSubmit={onSubmit}
          >
            <button type="button">Deny</button>
          </DenyConfirmDrawer>
        </IntlProvider>
      );
    });

    expect(container.textContent).toContain("Accepted bill record");
    expect(container.textContent).toContain("Submitted document: commercial-invoice.pdf");
    expect(container.textContent).not.toContain("sha256:");
    expect(container.textContent).not.toContain("invoice-a");
    expect(confirmDrawerProps.current?.submitButtonDisabled).toBe(true);

    const textarea = container.querySelector("textarea");
    const documentCheckbox = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1];
    if (textarea === null || documentCheckbox === undefined) throw new Error("Expected decision form fields");
    // Bound immediately below; extracting the native setter is the only way React sees a controlled-input change in this dependency-free test.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (nativeSetter === undefined) throw new Error("Textarea value setter is unavailable");
    const setValue = nativeSetter.bind(textarea);
    act(() => {
      setValue("Reviewed the submitted invoice and declined this application.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      documentCheckbox.click();
    });
    expect(confirmDrawerProps.current?.submitButtonDisabled).toBe(false);
    act(() => confirmDrawerProps.current?.onSubmit());
    expect(onSubmit).toHaveBeenCalledWith("Reviewed the submitted invoice and declined this application.", [
      { kind: "submitted_document", reference: "invoice-a" },
    ]);
    act(() => root.unmount());
  });
});
