import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import type { BillIdentParticipant, BillInfo } from "@/generated/client/types.gen";
import { BillParties } from "./BillParties";

const ident = (name: string, nodeId: string, address: Partial<BillIdentParticipant> = {}): BillIdentParticipant => ({
  type: "Company",
  name,
  node_id: nodeId,
  nostr_relays: [],
  address: "Synthetic address",
  city: "Huehuetenango",
  country: "GT",
  ...address,
});

const finca = ident("Finca Verde", "finca-node", { email: "finca@example.test" });
const maya = ident("Exportadora Maya Café", "maya-node", { city: "Guatemala City" });

function bill(overrides: Partial<BillInfo> = {}): BillInfo {
  return {
    id: "bill-1",
    sum: 6_400_000,
    maturity_date: "2027-01-26",
    file_urls: [],
    drawer: finca,
    drawee: maya,
    payee: { Ident: finca },
    endorsees: [],
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function rows(value: BillInfo): string[] {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <BillParties bill={value} />
      </IntlProvider>
    )
  );
  return Array.from(container.querySelectorAll("li"), (row) => row.textContent ?? "");
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("BillParties", () => {
  it("lists a party named in several roles once, and marks the applicant and the payer", () => {
    const listed = rows(bill());

    expect(container?.querySelector("h3")?.textContent).toBe("Parties on the bill");
    expect(listed).toHaveLength(2);
    expect(listed[0]).toContain("Drawer · PayeeFinca VerdeApplicant");
    expect(listed[0]).toContain("Synthetic address, Huehuetenango, Guatemala");
    expect(container?.querySelector('a[href="mailto:finca@example.test"]')).not.toBeNull();
    expect(listed[1]).toContain("DraweeExportadora Maya CaféPayer");
    expect(listed[1]).toContain("Guatemala City, Guatemala");
  });

  it("follows endorsements in order and marks the last holder as the applicant, even when anonymous", () => {
    const listed = rows(
      bill({
        endorsees: [{ Ident: ident("Café Trading", "trader-node") }, { Anon: { node_id: "anon-holder-node", nostr_relays: [] } }],
      })
    );

    expect(listed).toHaveLength(4);
    expect(listed[0]).toContain("Drawer · PayeeFinca Verde");
    expect(listed[0]).not.toContain("Applicant");
    expect(listed[2]).toContain("Endorsee 1Café Trading");
    expect(listed[3]).toContain("Endorsee 2AnonymousApplicant");
    expect(listed[3]).toContain("anon-holder-node");
  });

  it("shows a country typed out in words as stated instead of failing", () => {
    const listed = rows(bill({ drawee: ident("Wiener Kaffee", "wien-node", { city: "Wien", country: "Österreich" }) }));

    expect(listed[1]).toContain("Synthetic address, Wien, Österreich");
  });
});
