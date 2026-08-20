import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { BaseDrawer } from "./Drawers";

vi.mock("@bitcredit/ui-library", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
  buttonVariants: () => "",
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: ReactNode }) => <>{children}</>,
  DrawerContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className} data-testid="drawer-content">
      <div className="pt-6">{children}</div>
    </div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

let mount: HTMLDivElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;

afterEach(() => {
  act(() => root?.unmount());
  mount?.remove();
  mount = undefined;
  root = undefined;
});

describe("BaseDrawer", () => {
  it("keeps the Vaul root static and scrolls the inner content surface", () => {
    mount = document.createElement("div");
    document.body.appendChild(mount);
    root = createRoot(mount);
    act(() => {
      root?.render(
        <IntlProvider locale="en">
          <BaseDrawer title="Long drawer">
            <div>Long content</div>
          </BaseDrawer>
        </IntlProvider>
      );
    });

    const content = mount.querySelector<HTMLElement>('[data-testid="drawer-content"]');
    const scrollSurface = content?.querySelector<HTMLElement>(".mx-auto");

    expect(content?.className).toContain("overflow-hidden");
    expect(content?.className).not.toContain("overflow-y-auto");
    expect(content?.className).toContain("[&>div]:overflow-hidden");
    expect(scrollSurface?.className).toContain("overflow-y-auto");
    expect(scrollSurface?.className).toContain("min-h-0");
  });
});
