import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { ParticipantsOverviewCard } from "./ParticipantsOverview";

vi.mock("@/components/icons/UserAnonymous", () => ({
  UserAnonymousIcon: ({ className }: { className?: string }) => <span className={className}>AnonIcon</span>,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderWithIntl(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(<IntlProvider locale="en">{element}</IntlProvider>);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

async function hover(trigger: Element) {
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
}

async function click(trigger: Element) {
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("ParticipantsOverviewCard tooltips", () => {
  it("shows role, name, type and contact details when hovering an identified participant", async () => {
    const page = renderWithIntl(
      <ParticipantsOverviewCard
        drawee={{
          type: "Company",
          node_id: "drawee-node",
          name: "Drawee Corp",
          city: "Berlin",
          country: "DE",
          address: "Main Street 1",
          email: "drawee@example.com",
          nostr_relays: [],
        }}
      />
    );

    const trigger = page.querySelector("[data-state]");
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("tabindex")).toBe("0");
    expect(document.body.textContent).not.toContain("drawee@example.com");

    await hover(trigger!);

    const tooltipText = document.body.textContent ?? "";
    expect(tooltipText).toContain("Drawee");
    expect(tooltipText).toContain("Drawee Corp");
    expect(tooltipText).toContain("Company");
    expect(tooltipText).toContain("drawee@example.com");
    expect(tooltipText).toContain("Berlin, DE");
    expect(tooltipText).toContain("drawee-node");
  });

  it("shows bearer details when hovering an anonymous holder", async () => {
    const page = renderWithIntl(
      <ParticipantsOverviewCard
        holder={[
          {
            Anon: {
              node_id: "holder-anon-node",
              nostr_relays: [],
            },
          },
        ]}
      />
    );

    const trigger = page.querySelector("[data-state]");
    await hover(trigger!);

    const tooltipText = document.body.textContent ?? "";
    expect(tooltipText).toContain("Holder");
    expect(tooltipText).toContain("Bearer");
    expect(tooltipText).toContain("Anonymous");
    expect(tooltipText).toContain("holder-anon-node");
  });

  it("pins the details in a popover when clicking a participant", async () => {
    const page = renderWithIntl(
      <ParticipantsOverviewCard
        payee={{
          Ident: {
            type: "Person",
            node_id: "payee-node",
            name: "Payee Name",
            city: "Madrid",
            country: "ES",
            address: "Payee Plaza 3",
            email: "payee@example.com",
            nostr_relays: [],
          },
        }}
      />
    );

    const trigger = page.querySelector("[data-state]");
    expect(trigger).not.toBeNull();
    expect(document.querySelector("[data-radix-popper-content-wrapper]")).toBeNull();

    await click(trigger!);

    const popover = document.querySelector('[data-state="open"][data-side]');
    expect(popover).not.toBeNull();
    expect(popover?.textContent).toContain("Payee");
    expect(popover?.textContent).toContain("Payee Name");
    expect(popover?.textContent).toContain("Person");
    expect(popover?.textContent).toContain("payee@example.com");
    expect(popover?.textContent).toContain("Madrid, ES");
    expect(popover?.textContent).toContain("payee-node");
  });
});
