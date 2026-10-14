import { describe, expect, it } from "vitest";
import type { BillHistoryBlock } from "@/generated/client/types.gen";
import { hasRejectedToPay, latestPaymentRequest } from "./payment-request";

function block(overrides: Partial<BillHistoryBlock>): BillHistoryBlock {
  return {
    block_id: 1,
    block_type: "Issue",
    signed: { data: { Anon: { node_id: "node" } } } as BillHistoryBlock["signed"],
    signing_timestamp: 1_000,
    ...overrides,
  };
}

const paymentData = (address: string) => ({ sum: "5000", currency: "sat", payment_address: address });

describe("latestPaymentRequest", () => {
  it("returns nothing when the bill was never requested to pay", () => {
    expect(latestPaymentRequest(undefined)).toBeNull();
    expect(latestPaymentRequest([block({ block_type: "Issue" })])).toBeNull();
  });

  it("keeps the payment details of a request the payer rejected", () => {
    const request = latestPaymentRequest([
      block({ block_id: 1, block_type: "Issue" }),
      block({
        block_id: 2,
        block_type: "RequestToPay",
        payment_data: paymentData("bc1qpay"),
        signing_timestamp: 2_000,
        request_deadline: 9_000,
      }),
      block({ block_id: 3, block_type: "RejectToPay", signing_timestamp: 3_000 }),
    ]);

    expect(request).toEqual({ paymentAddress: "bc1qpay", sum: "5000", currency: "sat", requestedAt: 2_000, deadline: 9_000 });
  });

  it("takes the latest request by block id, whatever order the blocks arrive in", () => {
    const request = latestPaymentRequest([
      block({ block_id: 5, block_type: "RequestToPay", payment_data: paymentData("bc1qlater") }),
      block({ block_id: 2, block_type: "RequestToPay", payment_data: paymentData("bc1qearlier") }),
    ]);

    expect(request?.paymentAddress).toBe("bc1qlater");
  });

  it("ignores a request block that carries no payment data", () => {
    expect(latestPaymentRequest([block({ block_type: "RequestToPay", payment_data: null })])).toBeNull();
  });
});

describe("hasRejectedToPay", () => {
  it("finds a rejection on the chain", () => {
    expect(hasRejectedToPay([block({ block_type: "RequestToPay" }), block({ block_id: 2, block_type: "RejectToPay" })])).toBe(true);
    expect(hasRejectedToPay([block({ block_type: "RequestToPay" })])).toBe(false);
    expect(hasRejectedToPay(undefined)).toBe(false);
  });
});
