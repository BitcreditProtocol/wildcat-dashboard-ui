import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { BitcreditBill, LightInfo, ListQuotesData } from "@/generated/client/types.gen";
import { PartyExposureBand, PartyExposureCard } from "./PartyExposure";

type ListQuery = NonNullable<ListQuotesData["query"]>;
interface QueryOptions {
  queryKey: [{ _id: string; query?: ListQuery }];
  enabled?: boolean;
}

const requests: ListQuery[] = [];
let answer: (query: ListQuery) => { data: LightInfo[]; total: number } | { quotes: LightInfo[] } | undefined;
let ebills: BitcreditBill[] = [];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => {
      const [{ _id, query }] = options.queryKey;
      if (options.enabled === false) return { data: undefined, isLoading: false, error: null };
      if (_id === "listEbills") return { data: ebills, isLoading: false, error: null };
      if (_id !== "listQuotes" || query === undefined) return { data: undefined, isLoading: false, error: null };
      requests.push(query);
      return { data: answer(query), isLoading: false, error: null };
    },
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesOptions: ({ query }: { query: ListQuery }) => ({ queryKey: [{ _id: "listQuotes", query }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
}));

const APPLICANT = { nodeId: "holder-node", name: "Finca Verde" };
const PAYER = { nodeId: "drawee-node", name: "Exportadora Maya Café" };
const THIS = { id: "this", status: "Pending" as const, billId: "bill-this", faceValueSat: 6_400_000 };
const quote = (id: string, status: LightInfo["status"], sum: number): LightInfo => ({ id, status, sum });
const TODAY = new Date().toISOString().slice(0, 10);

function ebill(overrides: { drawee?: string; endorser?: string; maturity: string; paid: boolean; sum: string }): BitcreditBill {
  return {
    id: `bill-${overrides.sum}`,
    participants: {
      drawee: { node_id: overrides.drawee ?? "someone" },
      endorsements: overrides.endorser ? [{ signed: { data: { Ident: { node_id: overrides.endorser } } } }] : [],
    },
    data: { maturity_date: overrides.maturity, sum: overrides.sum },
    status: { payment: { paid: overrides.paid } },
  } as unknown as BitcreditBill;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(element: ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <PreferencesProvider>
          <MemoryRouter>{element}</MemoryRouter>
        </PreferencesProvider>
      </IntlProvider>
    );
  });
  return container;
}

const card = (current: Partial<typeof THIS> = {}, payer = PAYER) =>
  render(<PartyExposureCard applicant={APPLICANT} payer={payer} quote={{ ...THIS, ...current }} />);

function section(page: HTMLElement, label: "Applicant" | "Payer"): HTMLElement {
  const found = Array.from(page.querySelectorAll("section")).find((one) => one.querySelector("h3")?.textContent?.startsWith(label));
  if (!found) throw new Error(`No ${label} section`);
  return found;
}

function rowText(scope: HTMLElement, label: string): string {
  const row = Array.from(scope.querySelectorAll("tr")).find((one) => one.querySelector("th")?.textContent?.startsWith(label));
  return row?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

beforeEach(() => {
  requests.length = 0;
  ebills = [];
  answer = (query) => {
    if (query.status === "Denied") return query.bill_id ? { data: [], total: 1 } : { data: [], total: 3 };
    if (query.bill_holder_id === APPLICANT.nodeId) {
      return {
        data: [
          // The list may still hold this quote's previous stage; its own live record wins.
          quote("this", "Offered", 6_400_000),
          quote("p2", "Pending", 4_800_000),
          quote("o1", "Offered", 1_900_000),
          quote("m1", "MintingEnabled", 5_200_000),
          quote("x1", "Rejected", 9_000_000),
        ],
        total: 5,
      };
    }
    return { data: [quote("this", "Pending", 6_400_000), quote("a1", "Accepted", 3_000_000)], total: 2 };
  };
});

describe("PartyExposureCard", () => {
  it("reads the applicant by holder and the payer by drawee, only bills not yet due", () => {
    card();

    expect(requests).toContainEqual(expect.objectContaining({ bill_holder_id: "holder-node", bill_maturity_date_from: TODAY }));
    // Wildcat's bill_payer_id matches the payee; the payer at maturity is the drawee.
    expect(requests).toContainEqual(expect.objectContaining({ bill_drawee_id: "drawee-node", bill_maturity_date_from: TODAY }));
    expect(requests.some((query) => "bill_payer_id" in query && query.bill_payer_id !== undefined)).toBe(false);
  });

  it("totals the offered-or-accepted stages, counting this quote by its own live status", () => {
    const applicant = section(card(), "Applicant");

    expect(rowText(applicant, "Offered")).toBe("Offered11,900,000sat");
    expect(rowText(applicant, "Accepted")).toBe("Accepted0–");
    expect(rowText(applicant, "Minting enabled")).toBe("Minting enabled15,200,000sat");
    expect(rowText(applicant, "Offered or accepted")).toBe("Offered or accepted27,100,000sat");
    expect(rowText(applicant, "Pending")).toBe("Pending(incl. this)211,200,000sat");
    expect(applicant.textContent).toContain("13,500,000sat if this bill is offered too");
  });

  it("moves this quote into its new stage after an offer, without projecting it again", () => {
    const applicant = section(card({ status: "Offered" as never }), "Applicant");

    expect(rowText(applicant, "Offered")).toBe("Offered(incl. this)28,300,000sat");
    expect(rowText(applicant, "Pending")).toBe("Pending14,800,000sat");
    expect(applicant.textContent).not.toContain("if this bill is offered too");
  });

  it("counts denials on other bills only, neutrally, so a reissued quote's own denial is not held against it", () => {
    const applicant = section(card(), "Applicant");

    expect(requests).toContainEqual(expect.objectContaining({ bill_holder_id: "holder-node", bill_id: "bill-this", status: "Denied" }));
    expect(applicant.textContent).toContain("Denied quotes on other bills: 2 (any reason)");
    expect(applicant.querySelector(".text-signal-alert")).toBeNull();
  });

  it("shows bills past maturity without a confirmed payment, per party role", () => {
    ebills = [
      ebill({ drawee: "drawee-node", maturity: "2020-01-01", paid: false, sum: "700000" }),
      ebill({ drawee: "drawee-node", maturity: "2020-01-01", paid: true, sum: "900000" }),
      ebill({ drawee: "drawee-node", maturity: "2999-01-01", paid: false, sum: "800000" }),
      ebill({ endorser: "holder-node", maturity: "2020-02-01", paid: false, sum: "500000" }),
    ];
    const page = card();

    expect(section(page, "Payer").textContent).toContain("1 bill past maturity without a confirmed payment · 700,000sat");
    expect(section(page, "Applicant").textContent).toContain("1 bill past maturity without a confirmed payment · 500,000sat");
  });

  it("omits the overdue row when nothing is past maturity", () => {
    expect(card().textContent).not.toContain("Past maturity");
  });

  it("reads a legacy Mint that answers every quote without a total", () => {
    answer = (query) => (query.status === "Denied" ? { quotes: [quote("d", "Denied", 1)] } : { quotes: [quote("o", "Offered", 10)] });
    const payer = section(card(), "Payer");

    expect(rowText(payer, "Offered or accepted")).toBe("Offered or accepted110sat");
    expect(payer.textContent).not.toContain("lower bound");
  });

  it("says when the Mint holds more bills than one read returned", () => {
    answer = (query) => (query.status === "Denied" ? { data: [], total: 0 } : { data: [quote("a", "Offered", 10)], total: 900 });

    expect(section(card(), "Payer").textContent).toContain("figures are a lower bound");
  });

  it("keeps the payer section when the applicant drew the bill on itself, since others' bills on it differ", () => {
    const page = card({}, { ...APPLICANT });

    expect(page.querySelectorAll("section")).toHaveLength(2);
  });

  it("links each party to the server-filtered quote list", () => {
    const page = card();

    expect(section(page, "Applicant").querySelector("a")?.getAttribute("href")).toBe("/quotes?applicant=holder-node");
    expect(section(page, "Payer").querySelector("a")?.getAttribute("href")).toBe("/quotes?payer=drawee-node");
  });
});

describe("PartyExposureBand", () => {
  it("names the filtered party, counts all its denials, and clears to the page it came from", () => {
    const page = render(<PartyExposureBand role="applicant" nodeId="holder-node" name="Finca Verde" clearTo="/quotes/pending" />);

    expect(page.querySelector("h2")?.textContent).toBe("ApplicantFinca Verde");
    expect(page.textContent).toContain("Denied quotes: 3 (any reason)");
    expect(
      Array.from(page.querySelectorAll("a"))
        .find((link) => link.textContent === "Remove filter")
        ?.getAttribute("href")
    ).toBe("/quotes/pending");
  });
});
