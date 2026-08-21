import Big from "big.js";
import { describe, expect, it } from "vitest";

import type { OfferFormResult } from "./OfferFormDrawer";
import { governedOfferTtl, isCommittedQuoteUpdate, reconcileCommittedQuoteUpdate } from "./useQuoteMutations";

const now = Date.parse("2026-08-11T09:00:00.000Z");
const result = {
  governance: {
    billId: "bill-a",
    caseId: "case-a",
    decisionResultDigest: `sha256:${"a".repeat(64)}`,
    action: "confirm_proposed_quote",
    reasonCode: "operator_confirmed_governed_terms",
    writtenBasis: "Reviewed the governed terms and supporting evidence.",
  },
  discount: {
    days: 180,
    discountRate: new Big("0.065"),
    net: { value: new Big("7734000"), currency: "sat" },
    gross: { value: new Big("8000000"), currency: "sat" },
  },
  ttl: { ttl: new Date("2026-08-11T10:00:00.000Z") },
  governedOfferExpiresAt: new Date("2026-08-12T23:59:59.999Z"),
} satisfies OfferFormResult;

describe("governedOfferTtl", () => {
  it("posts the selected expiry unchanged when it is inside the governed period", () => {
    expect(governedOfferTtl(result, now)).toBe("2026-08-11T10:00:00.000Z");
  });

  it("fails closed when the selected expiry outlives the governed offer", () => {
    expect(governedOfferTtl({ ...result, ttl: { ttl: new Date("2026-08-13T00:00:00.000Z") } }, now)).toBeNull();
  });

  it("fails closed when the governed expiry is absent or the selected expiry has passed", () => {
    expect(governedOfferTtl({ ...result, governedOfferExpiresAt: undefined }, now)).toBeNull();
    expect(governedOfferTtl({ ...result, ttl: { ttl: new Date("2026-08-11T08:00:00.000Z") } }, now)).toBeNull();
  });
});

describe("isCommittedQuoteUpdate", () => {
  it("reconciles only the exact stored offer", () => {
    const quote = {
      ttl: "2026-08-11T10:00:00.000Z",
      discounted: 7_734_000,
      status: "Offered",
    } as const;
    expect(isCommittedQuoteUpdate(quote, { action: "Offer", discounted: 7_734_000, ttl: "2026-08-11T10:00:00.000Z" })).toBe(true);
    expect(isCommittedQuoteUpdate(quote, { action: "Offer", discounted: 7_733_999, ttl: "2026-08-11T10:00:00.000Z" })).toBe(false);
    expect(isCommittedQuoteUpdate(quote, { action: "Offer", discounted: 7_734_000, ttl: "2026-08-11T11:00:00.000Z" })).toBe(false);
  });

  it("does not confuse a pending or offered quote with a denial", () => {
    expect(isCommittedQuoteUpdate({ status: "Pending" }, { action: "Deny" })).toBe(false);
    expect(isCommittedQuoteUpdate({ status: "Denied" }, { action: "Deny" })).toBe(true);
  });
});

describe("reconcileCommittedQuoteUpdate", () => {
  const expected = { action: "Offer", discounted: 7_734_000, ttl: "2026-08-11T10:00:00.000Z" } as const;

  it("confirms an exact state after a dropped mutation response", async () => {
    await expect(
      reconcileCommittedQuoteUpdate(
        () => Promise.resolve({ status: "Offered", discounted: 7_734_000, ttl: "2026-08-11T10:00:00.000Z" }),
        expected
      )
    ).resolves.toBe(true);
  });

  it("fails closed for pending, changed, or unavailable state", async () => {
    await expect(reconcileCommittedQuoteUpdate(() => Promise.resolve({ status: "Pending" }), expected)).resolves.toBe(false);
    await expect(
      reconcileCommittedQuoteUpdate(
        () => Promise.resolve({ status: "Offered", discounted: 7_733_999, ttl: "2026-08-11T10:00:00.000Z" }),
        expected
      )
    ).resolves.toBe(false);
    await expect(reconcileCommittedQuoteUpdate(() => Promise.reject(new Error("Mint unavailable")), expected)).resolves.toBe(false);
  });
});
