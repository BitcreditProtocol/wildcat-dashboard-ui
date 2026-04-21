import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { ParticipantDetail, ParticipantsOverviewCard } from "./ParticipantsOverview";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@bitcredit/ui-library", () => ({
  TruncatedTextPopover: ({ text }: { text: React.ReactNode }) => <span>{text}</span>,
}));

vi.mock("@/components/icons/UserAnonymous", () => ({
  UserAnonymousIcon: ({ className }: { className?: string }) => <span className={className}>AnonIcon</span>,
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

function renderWithIntl(element: ReactElement): HTMLDivElement {
  return renderIntoDom(<IntlProvider locale="en">{element}</IntlProvider>);
}

beforeEach(() => {
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("ParticipantsOverview", () => {
  it("renders participants overview with ident and anon entries", () => {
    const page = renderWithIntl(
      <ParticipantsOverviewCard
        drawee={{
          type: "Person",
          node_id: "drawee-node",
          name: "Drawee User",
          city: "Berlin",
          country: "DE",
          address: "Main Street 1",
          email: "drawee@example.com",
          nostr_relays: [],
        }}
        drawer={{
          type: "Company",
          node_id: "drawer-node",
          name: "Drawer Corp",
          city: "Vienna",
          country: "AT",
          address: "Business Road 2",
          email: "drawer@example.com",
          nostr_relays: [],
        }}
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

    expect(page.textContent).toContain("Drawee");
    expect(page.textContent).toContain("Drawer");
    expect(page.textContent).toContain("Payee");
    expect(page.textContent).toContain("Holder");
    expect(page.textContent).toContain("payee@example.com");
    expect(page.textContent).toContain("holder-anon-node");
    expect(page.textContent).toContain("Bearer");
  });

  it("renders anonymous participant detail", () => {
    const page = renderWithIntl(
      <ParticipantDetail
        participant={{
          Anon: {
            node_id: "anon-node-123",
            nostr_relays: [],
          },
        }}
      />
    );

    expect(page.textContent).toContain("AnonIcon");
    expect(page.textContent).toContain("Bearer");
    expect(page.textContent).toContain("anon-node-123");
  });

  it("renders identified participant detail with contact data", () => {
    const page = renderWithIntl(
      <ParticipantDetail
        participant={{
          type: "Person",
          node_id: "ident-node-123",
          name: "Ident Name",
          city: "Paris",
          country: "FR",
          address: "Rue 4",
          email: "ident@example.com",
          nostr_relays: [],
        }}
      />
    );

    expect(page.textContent).toContain("Ident Name");
    expect(page.textContent).toContain("Paris, FR");
    expect(page.textContent).toContain("ident-node-123");
    expect(page.querySelector('a[href="mailto:ident@example.com"]')).not.toBeNull();
  });

  it("returns nothing when participant detail input is missing", () => {
    const page = renderWithIntl(<ParticipantDetail participant={undefined} />);
    expect(page.textContent).toBe("");
  });
});
