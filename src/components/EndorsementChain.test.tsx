import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import type { BillHistoryBlock, BillIdentParticipant } from "@/generated/client/types.gen";
import { EndorsementChain } from "./EndorsementChain";

const ident = (name: string, nodeId: string): { Ident: BillIdentParticipant } => ({
  Ident: { type: "Company", name, node_id: nodeId, nostr_relays: [], address: "Synthetic address", city: "Antigua", country: "GT" },
});

const at = (iso: string) => Date.parse(iso) / 1000;

const history: BillHistoryBlock[] = [
  {
    block_id: 2,
    block_type: "Accept",
    signed: { data: ident("Exportadora Maya Café", "maya-node"), signatory: { name: "Ana López", node_id: "ana-node" } },
    signing_timestamp: at("2026-10-02T09:30:00Z"),
    signing_address: { address: "Avenida 1", city: "Guatemala City", country: "GT" },
  },
  {
    block_id: 1,
    block_type: "Issue",
    signed: { data: ident("Finca Verde", "finca-node") },
    pay_to_the_order_of: ident("Finca Verde", "finca-node"),
    signing_timestamp: at("2026-10-01T08:00:00Z"),
  },
  {
    block_id: 3,
    block_type: "Endorse",
    signed: { data: ident("Finca Verde", "finca-node") },
    pay_to_the_order_of: { Anon: { node_id: "anonholder0001234", nostr_relays: [] } },
    signing_timestamp: at("2026-10-03T12:00:00Z"),
  },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(props: Parameters<typeof EndorsementChain>[0]): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <EndorsementChain {...props} />
      </IntlProvider>
    )
  );
  return container;
}

const events = (page: HTMLElement) => Array.from(page.querySelectorAll("li"), (event) => event.textContent ?? "");

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("EndorsementChain", () => {
  it("reads the signed blocks oldest first: who signed, from where, and to whom the bill went", () => {
    const page = render({ historyBlocks: history, maturityDate: "2027-01-26" });
    const [issued, accepted, endorsed] = events(page);

    expect(page.querySelector("h3")?.textContent).toBe("Signed history3 events");
    expect(issued).toContain("Bill issuedOct 1, 2026");
    // Only a block that records where it was signed says so; a party's own address is in the party list.
    expect(issued).toContain("Signed by Finca VerdePayable to Finca Verde");
    expect(issued).toContain("Due Jan 26, 2027");
    expect(accepted).toContain("Bill acceptedOct 2, 2026");
    expect(accepted).toContain("Signed by Exportadora Maya Café · signatory Ana López · Avenida 1, Guatemala City, Guatemala");
    expect(endorsed).toContain("Endorsed to anonymous anonholder00…");
    expect(page.querySelector("time")?.getAttribute("title")).toBe("Oct 1, 2026, 8:00 AM UTC");
  });

  it("turns to newest first on request", () => {
    const page = render({ historyBlocks: history });
    act(() => {
      page.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(page.querySelector("button")?.textContent).toBe("Newest first");
    expect(events(page).map((event) => event.slice(0, 13))).toEqual(["Bill endorsed", "Bill accepted", "Bill issuedOc"]);
  });

  it("tells a history that could not be read apart from one with no blocks", () => {
    expect(render({ historyBlocks: undefined }).textContent).toContain("The signed history is not available.");
    act(() => root?.unmount());
    container?.remove();
    expect(render({ historyBlocks: [] }).textContent).toContain("No signed events are recorded for this bill.");
  });
});
