import { describe, expect, it } from "vitest";
import type { BillInfo, BillParticipant, BitcreditBill, LightInfo } from "@/generated/client/types.gen";
import { billApplicant, billPayer, billPreviousHolder, groupByApplicant, paymentRecord, summarizePartyQuotes } from "./quote-parties";

const party = (name: string) => ({ name, node_id: `node-${name}` }) as BillInfo["drawee"];
const ident = (name: string): BillParticipant => ({ Ident: party(name) });

function bill(overrides: Partial<BillInfo> = {}): BillInfo {
  return {
    id: "bill",
    drawee: party("Payer"),
    drawer: party("Drawer"),
    payee: ident("Drawer"),
    endorsees: [],
    sum: 1000,
    maturity_date: "2027-01-01",
    file_urls: [],
    ...overrides,
  };
}

describe("billApplicant", () => {
  it("is the payee while the bill was never endorsed", () => {
    expect(billApplicant(bill())).toEqual({ nodeId: "node-Drawer", name: "Drawer", anonymous: false });
  });

  it("is the last endorsee once the bill was endorsed, as Wildcat's holder filter uses", () => {
    expect(billApplicant(bill({ endorsees: [ident("First"), ident("Holder")] }))).toEqual({
      nodeId: "node-Holder",
      name: "Holder",
      anonymous: false,
    });
  });

  it("carries the address and email the holder stated in the eBill, for the operator's own lookups", () => {
    const holder = { ...party("Holder"), address: "Calle 5", zip: "03001", city: "Antigua", country: "GT", email: "farm@example.test" };

    expect(billApplicant(bill({ endorsees: [{ Ident: holder }] }))?.contact).toEqual({
      address: "Calle 5, 03001, Antigua",
      country: "GT",
      email: "farm@example.test",
    });
    expect(billPayer(bill({ drawee: { ...party("Payer"), address: "Av. 1", city: "Guatemala", country: "GT" } }))?.contact).toEqual({
      address: "Av. 1, Guatemala",
      country: "GT",
      email: undefined,
    });
  });

  it("names an anonymous holder by node id", () => {
    expect(billApplicant(bill({ endorsees: [{ Anon: { node_id: "anon-node" } as never }] }))).toEqual({
      nodeId: "anon-node",
      name: "anon-node",
      anonymous: true,
    });
  });
});

describe("billPayer", () => {
  it("is the drawee, not the payee", () => {
    expect(billPayer(bill())).toEqual({ nodeId: "node-Payer", name: "Payer" });
  });
});

describe("summarizePartyQuotes", () => {
  const quote = (status: LightInfo["status"], sum: number): LightInfo => ({ id: `${status}-${sum}`, status, sum });

  it("sums face value per open stage and leaves closed quotes out", () => {
    const summary = summarizePartyQuotes([
      quote("Pending", 100),
      quote("Pending", 50),
      quote("Offered", 200),
      quote("Accepted", 300),
      quote("MintingEnabled", 400),
      quote("Denied", 1_000),
      quote("Rejected", 1_000),
      quote("OfferExpired", 1_000),
      quote("Canceled", 1_000),
    ]);

    expect(summary.buckets).toEqual({
      Pending: { count: 2, faceValueSat: 150 },
      Offered: { count: 1, faceValueSat: 200 },
      Accepted: { count: 1, faceValueSat: 300 },
      MintingEnabled: { count: 1, faceValueSat: 400 },
    });
    // Committed is what the Mint offered or holders accepted; pending requests are not part of it.
    expect(summary.committed).toEqual({ count: 3, faceValueSat: 900 });
  });
});

describe("groupByApplicant", () => {
  it("keeps the list order, placing each group where its first row was", () => {
    const rows = [
      { id: 1, applicant: "b" },
      { id: 2, applicant: "a" },
      { id: 3, applicant: "b" },
      { id: 4, applicant: null },
    ];
    const groups = groupByApplicant(rows, (row) => (row.applicant ? { nodeId: row.applicant, name: row.applicant } : null));

    expect(groups.map((group) => [group.applicant?.nodeId ?? null, group.rows.map((row) => row.id)])).toEqual([
      ["b", [1, 3]],
      ["a", [2]],
      [null, [4]],
    ]);
  });
});

describe("billPreviousHolder", () => {
  it("is whoever endorsed the bill to the applicant, not the drawer", () => {
    // Drawer D issues to payee P; P endorses to A. A received the bill from P.
    expect(billPreviousHolder(bill({ payee: ident("P"), endorsees: [ident("A")] }))).toBe("P");
    expect(billPreviousHolder(bill({ payee: ident("P"), endorsees: [ident("B"), ident("A")] }))).toBe("B");
    expect(billPreviousHolder(bill())).toBeUndefined();
  });
});

describe("paymentRecord", () => {
  const held = (drawee: string, endorser: string, maturity: string, paid: boolean, sum: string) =>
    ({
      id: `bill-${sum}`,
      participants: { drawee: { node_id: drawee }, endorsements: [{ signed: { data: { Ident: { node_id: endorser } } } }] },
      data: { maturity_date: maturity, sum },
      status: { payment: { paid } },
    }) as unknown as BitcreditBill;
  const bills = [
    held("node-Payer", "node-Applicant", "2026-08-01", true, "100"),
    held("node-Payer", "node-Other", "2026-09-01", false, "200"),
    held("node-Payer", "node-Applicant", "2027-01-01", false, "400"),
    held("node-Elsewhere", "node-Applicant", "2026-07-01", true, "800"),
  ];

  it("counts paid bills and bills past maturity without a confirmed payment, per party role", () => {
    expect(paymentRecord(bills, "payer", "node-Payer", "2026-10-03")).toEqual({
      paid: { count: 1, faceValueSat: 100 },
      overdue: { count: 1, faceValueSat: 200 },
    });
    // As applicant: bills they endorsed on to the Mint, whoever pays them.
    expect(paymentRecord(bills, "applicant", "node-Applicant", "2026-10-03")).toEqual({
      paid: { count: 2, faceValueSat: 900 },
      overdue: { count: 0, faceValueSat: 0 },
    });
  });

  it("skips partial bills from older Mints instead of failing", () => {
    const partial = [{ id: "bill-a", sum: "8000000" }] as unknown as BitcreditBill[];

    expect(paymentRecord(partial, "payer", "node-Payer", "2026-10-03")).toEqual({
      paid: { count: 0, faceValueSat: 0 },
      overdue: { count: 0, faceValueSat: 0 },
    });
  });
});
