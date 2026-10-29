import { describe, expect, it } from "vitest";
import type { BillHistoryBlock, BillIdentParticipant, BillParticipant, BitcreditBill } from "@/generated/client/types.gen";
import { billPdfContentFromBill, billPdfEndorsementsFromHistory } from "./bill-pdf";

function ident(name: string, nodeId: string, type: BillIdentParticipant["type"] = "Person"): BillIdentParticipant {
  return { type, node_id: nodeId, name, address: `${name} Street 1`, zip: "1010", city: "Vienna", country: "AT", nostr_relays: [] };
}

const asParticipant = (participant: BillIdentParticipant): BillParticipant => ({ Ident: participant });
const BEARER: BillParticipant = { Anon: { node_id: "anon", nostr_relays: [] } };

function bill(
  overrides: {
    payee?: BillParticipant;
    drawee?: BillIdentParticipant;
    accepted?: boolean;
    requestedToPay?: boolean;
    addressToPay?: string;
  } = {}
) {
  return {
    id: "bill-1",
    participants: {
      drawee: overrides.drawee ?? ident("Payer AG", "payer"),
      drawer: ident("Issuer KG", "issuer"),
      payee: overrides.payee ?? asParticipant(ident("Mint GmbH", "mint")),
      endorsements: [],
      endorsements_count: 0,
      all_participant_node_ids: [],
    },
    data: {
      time_of_drawing: 0,
      issue_date: "2026-01-21",
      time_of_maturity: 0,
      maturity_date: "2026-04-21",
      country_of_issuing: "AT",
      city_of_issuing: "Vienna",
      country_of_payment: "AT",
      city_of_payment: "Vienna",
      currency: "sat",
      sum: "150000",
      files: [],
    },
    status: {
      acceptance: {
        accepted: overrides.accepted ?? true,
        requested_to_accept: true,
        request_to_accept_timed_out: false,
        rejected_to_accept: false,
      },
      payment: {
        paid: false,
        requested_to_pay: overrides.requestedToPay ?? false,
        request_to_pay_timed_out: false,
        rejected_to_pay: false,
      },
    },
    current_waiting_state:
      overrides.addressToPay === undefined
        ? null
        : {
            Payment: {
              payer: ident("Payer AG", "payer"),
              payee: asParticipant(ident("Mint GmbH", "mint")),
              payment_data: {
                time_of_request: 0,
                currency: "sat",
                sum: "150000",
                address_to_pay: overrides.addressToPay,
                in_mempool: false,
                confirmations: 0,
              },
            },
          },
  } as unknown as BitcreditBill;
}

function block(overrides: Partial<BillHistoryBlock>): BillHistoryBlock {
  return {
    block_id: 1,
    block_type: "Issue",
    signed: { data: asParticipant(ident("Issuer KG", "issuer")) },
    signing_timestamp: 1_000,
    ...overrides,
  };
}

describe("billPdfContentFromBill", () => {
  it("formats the front of the bill the way the eBill print does", () => {
    const content = billPdfContentFromBill(bill());

    expect(content).toMatchObject({
      issuingPlace: "Vienna, AT, Jan 21, 2026",
      paymentPlace: "Vienna, AT",
      maturityDate: "Apr 21, 2026",
      amountDisplay: "0.00150000 XBT",
      amountInWords: "Bitcoin zero point zero zero one five zero zero zero zero",
      payeeName: "Mint GmbH",
      payeeAddress: "Mint GmbH Street 1, 1010 Vienna, AT",
      payerAddressLine1: "Payer AG Street 1",
      payerAddressLine2: "Vienna, AT 1010",
      isAccepted: true,
      isPayeeBearer: false,
    });
  });

  it("prints a bearer payee without an address", () => {
    const content = billPdfContentFromBill(bill({ payee: BEARER }));

    expect(content.payeeName).toBe("Bearer");
    expect(content.payeeAddress).toBe("");
    expect(content.isPayeeBearer).toBe(true);
  });

  it("signs for a company with the person who accepted on its behalf", () => {
    const company = ident("Payer AG", "payer", "Company");
    const history = [
      block({
        block_id: 2,
        block_type: "Accept",
        signed: { data: asParticipant(company), signatory: { node_id: "x", name: "Anna Payer" } },
      }),
    ];

    expect(billPdfContentFromBill(bill({ drawee: company }), history).payerSignatureName).toBe("Anna Payer");
    // A person signs with their own name.
    expect(billPdfContentFromBill(bill(), history).payerSignatureName).toBe("Payer AG");
  });

  it("prints the payment address only while payment is requested", () => {
    expect(billPdfContentFromBill(bill({ requestedToPay: true, addressToPay: " bc1qpay " }))).toMatchObject({
      isPaymentRequested: true,
      paymentAddress: "bc1qpay",
    });
    expect(billPdfContentFromBill(bill({ requestedToPay: true })).isPaymentRequested).toBe(false);
  });
});

describe("billPdfEndorsementsFromHistory", () => {
  it("lists only the blocks that handed the bill on, oldest first, skipping anonymous signers", () => {
    const endorsements = billPdfEndorsementsFromHistory([
      block({ block_id: 4, block_type: "Mint", signing_timestamp: 4_000, pay_to_the_order_of: asParticipant(ident("Mint GmbH", "mint")) }),
      block({ block_id: 1, block_type: "Issue", signing_timestamp: 1_000 }),
      block({ block_id: 2, block_type: "Endorse", signing_timestamp: 2_000, pay_to_the_order_of: BEARER }),
      block({ block_id: 3, block_type: "Endorse", signing_timestamp: 3_000, signed: { data: BEARER }, pay_to_the_order_of: BEARER }),
      block({ block_id: 5, block_type: "RequestToPay", signing_timestamp: 5_000 }),
    ]);

    expect(endorsements.map(({ label, payeeName }) => ({ label, payeeName }))).toEqual([
      { label: "Pay to", payeeName: "Bearer" },
      { label: "Pay to the order of", payeeName: "Mint GmbH" },
    ]);
    expect(endorsements[1]).toMatchObject({ signerName: "Issuer KG", payeeAddressLine1: "Mint GmbH Street 1" });
  });
});
