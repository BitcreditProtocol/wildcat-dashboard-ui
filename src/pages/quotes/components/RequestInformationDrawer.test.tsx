import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { RequestInformationDrawer } from "./RequestInformationDrawer";

const drawer = vi.hoisted(() => ({
  props: undefined as
    | undefined
    | {
        onSubmit: () => void;
        onOpenChange: (open: boolean) => void;
        submitButtonDisabled: boolean;
        cancelButtonDisabled: boolean;
      },
}));
vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({ children, ...props }: NonNullable<typeof drawer.props> & { children: ReactNode }) => {
    drawer.props = props;
    return <div>{children}</div>;
  },
}));

function setQuestion(container: HTMLElement, value: string) {
  const input = container.querySelector("textarea");
  if (input === null) throw new Error("Question field missing");
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter === undefined) throw new Error("Textarea setter missing");
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("RequestInformationDrawer", () => {
  it("clears a sent question on a parent-controlled close but preserves it after a failed delivery", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const show = (open: boolean, isPending = false) => {
      act(() =>
        root.render(
          <IntlProvider locale="en">
            <RequestInformationDrawer open={open} isPending={isPending} onOpenChange={vi.fn()} onSubmit={vi.fn()}>
              <button>Ask</button>
            </RequestInformationDrawer>
          </IntlProvider>
        )
      );
    };
    show(true);
    setQuestion(container, "Which buyer?");
    show(true, true);
    show(true);
    expect(container.querySelector("textarea")?.value).toBe("Which buyer?");
    show(false);
    show(true);
    expect(container.querySelector("textarea")?.value).toBe("");
    act(() => root.unmount());
  });

  it("asks only for a question, not a decision basis or a predefined checklist", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onSubmit = vi.fn();
    act(() =>
      root.render(
        <IntlProvider locale="en">
          <RequestInformationDrawer open onOpenChange={vi.fn()} onSubmit={onSubmit}>
            <button>Ask</button>
          </RequestInformationDrawer>
        </IntlProvider>
      )
    );
    expect(container.textContent).toContain("Your question");
    expect(container.textContent).not.toContain("Decision basis");
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
    expect(drawer.props?.submitButtonDisabled).toBe(true);
    setQuestion(container, "   ");
    act(() => drawer.props?.onSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    setQuestion(container, "When?");
    expect(drawer.props?.submitButtonDisabled).toBe(false);
    setQuestion(container, "  Which buyer?  ");
    expect(drawer.props?.submitButtonDisabled).toBe(false);
    act(() => drawer.props?.onSubmit());
    expect(onSubmit).toHaveBeenCalledWith("Which buyer?");
    act(() => drawer.props?.onOpenChange(false));
    expect(container.querySelector("textarea")?.value).toBe("");
    act(() => root.unmount());
  });

  it("prevents editing, resubmitting or dismissing while delivery is pending", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    act(() =>
      root.render(
        <IntlProvider locale="en">
          <RequestInformationDrawer open isPending onOpenChange={onOpenChange} onSubmit={onSubmit}>
            <button>Ask</button>
          </RequestInformationDrawer>
        </IntlProvider>
      )
    );
    expect(drawer.props?.submitButtonDisabled).toBe(true);
    expect(drawer.props?.cancelButtonDisabled).toBe(true);
    expect(container.querySelector("textarea")?.disabled).toBe(true);
    act(() => {
      drawer.props?.onSubmit();
      drawer.props?.onOpenChange(false);
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
