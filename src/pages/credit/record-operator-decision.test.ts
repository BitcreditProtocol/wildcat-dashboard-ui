import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchOperatorCapability,
  durableAuthorizationReceiptFromQuote,
  operatorMayRecordDecision,
  recordMintRiskAssessment,
  recordOperatorDecision,
  signedAuthorizationMatchesOffer,
  type OperatorCapability,
  type OperatorDecisionInput,
  type SignedOfferAuthorization,
} from "./record-operator-decision";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

const approver = { ready: true, operatorId: "operator-123", operatorRole: "approver" } satisfies OperatorCapability;
const reviewer = { ready: true, operatorId: "reviewer-123", operatorRole: "reviewer" } satisfies OperatorCapability;
const command: OperatorDecisionInput = {
  billId: "bill-1",
  caseId: "case-1",
  decisionResultDigest: `sha256:${"a".repeat(64)}`,
  action: "confirm_proposed_quote",
  reasonCode: "operator_confirmed_governed_terms",
  writtenBasis: "Reviewed the governed result and confirmed the proposed terms.",
};
const signedAuthorization = {
  authorization: {
    schemaVersion: "credit-authorization-v7",
    mintQuoteId: "quote-1",
    action: "request_to_mint",
    synthetic: true,
    terms: { discountedSat: "7734000", offerExpiresOn: "2026-08-23" },
  },
  authorizationDigest: `sha256:${"b".repeat(64)}`,
  signatureAlgorithm: "Ed25519",
  signature: "synthetic-signature",
} satisfies SignedOfferAuthorization;

function response(ok: boolean, status: number, body: unknown): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("operator capability", () => {
  it.each([
    [401, "Operator authentication required"],
    [403, "Operator token does not match the running service"],
  ])("fails closed and preserves the safe backend error for status %s", async (status, error) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(false, status, { error })));

    await expect(fetchOperatorCapability()).rejects.toThrow(error);
  });

  it("accepts only the exact ready capability shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, approver)));

    await expect(fetchOperatorCapability()).resolves.toEqual(approver);
  });

  it("lets reviewers return a case but keeps quote decisions approver-only", () => {
    expect(operatorMayRecordDecision(reviewer, "return_for_information")).toBe(true);
    expect(operatorMayRecordDecision(reviewer, "confirm_proposed_quote")).toBe(false);
    expect(operatorMayRecordDecision(approver, "propose_adjustment_and_requote")).toBe(true);
    expect(operatorMayRecordDecision(undefined, "return_for_information")).toBe(false);
  });
});

describe("Mint-owned risk evidence", () => {
  const risk = {
    mintQuoteId: "quote-1",
    billId: "bill-1",
    caseId: "case-1",
    decisionResultDigest: `sha256:${"a".repeat(64)}`,
    probabilityOfDefaultBps: 600,
    lossGivenDefaultBps: 4_000,
    sourceReference: "risk-register-2026-08",
    validThrough: "2026-11-20",
    writtenBasis: "Reviewed against the current Mint-owned testnet risk register.",
  };

  it("records evidence at the Mint before asking AI Credit to refresh", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(true, 200, {}))
      .mockResolvedValueOnce(response(true, 200, {}));
    vi.stubGlobal("fetch", fetch);

    await expect(recordMintRiskAssessment(risk, approver)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/v1/admin/credit/quote/quote-1/acceptor-risk",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          probabilityOfDefaultBps: 600,
          lossGivenDefaultBps: 4_000,
          sourceReference: "risk-register-2026-08",
          validThrough: "2026-11-20",
          writtenBasis: "Reviewed against the current Mint-owned testnet risk register.",
        }),
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/ai-credit/operator-verifications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          billId: "bill-1",
          caseId: "case-1",
          decisionResultDigest: `sha256:${"a".repeat(64)}`,
          action: "retry_current_sources",
        }),
      })
    );
  });

  it("does not refresh AI Credit when the Mint rejects the evidence", async () => {
    const fetch = vi.fn().mockResolvedValue(response(false, 400, { error: "invalid evidence" }));
    vi.stubGlobal("fetch", fetch);

    await expect(recordMintRiskAssessment(risk, approver)).resolves.toEqual({ ok: false, error: "invalid evidence" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps Mint evidence writes approver-only", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(recordMintRiskAssessment(risk, reviewer)).resolves.toEqual({
      ok: false,
      error: "A ready Mint approver capability is required for this action",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("durable authorization receipt", () => {
  const quote = {
    credit_authorization_receipt: {
      receiptVersion: "credit-authorization-receipt-v1",
      operationId: `sha256:${"c".repeat(64)}`,
      authorizationDigest: `sha256:${"d".repeat(64)}`,
      status: "completed",
      completedAt: "2026-08-21T12:06:00.000Z",
      resultDigest: `sha256:${"e".repeat(64)}`,
      effectId: "quote-1",
      mintId: "mint-demo",
      billId: "bill-1",
      action: "request_to_mint",
    },
  };

  it("parses only the durable fields returned by the Mint", () => {
    expect(durableAuthorizationReceiptFromQuote(quote, "quote-1", "bill-1")).toEqual({
      operationId: `sha256:${"c".repeat(64)}`,
      authorizationDigest: `sha256:${"d".repeat(64)}`,
      status: "completed",
      completedAt: "2026-08-21T12:06:00.000Z",
      resultDigest: `sha256:${"e".repeat(64)}`,
      effectId: "quote-1",
      mintId: "mint-demo",
      billId: "bill-1",
      action: "request_to_mint",
    });
  });

  it("rejects a receipt bound to another quote or bill", () => {
    expect(durableAuthorizationReceiptFromQuote(quote, "quote-2", "bill-1")).toBeNull();
    expect(durableAuthorizationReceiptFromQuote(quote, "quote-1", "bill-2")).toBeNull();
  });
});

describe("recordOperatorDecision", () => {
  it("does not call the service without a ready capability", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command, undefined)).resolves.toEqual({
      ok: false,
      error: "A ready AI Credit operator capability is required for this action",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends no browser credential or operator attribution", async () => {
    const fetch = vi.fn().mockResolvedValue(response(true, 200, { signedAuthorization }));
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({ ok: true, signedAuthorization });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-decisions",
      expect.objectContaining({ headers: { "content-type": "application/json" } })
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    expect(JSON.parse(request.body)).not.toHaveProperty("operatorId");
    expect(JSON.parse(request.body)).not.toHaveProperty("operatorRole");
  });

  it("fails closed when an Offer response has no valid signed authorization", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, {})));

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({
      ok: false,
      error: "The AI Credit operator service returned an invalid offer authorization",
    });
  });

  it("keeps return-for-information unsigned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, {})));

    await expect(recordOperatorDecision({ ...command, action: "return_for_information" }, reviewer)).resolves.toEqual({ ok: true });
  });

  it("rejects any authorization field on a non-offer decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, { signedAuthorization: {} })));

    await expect(recordOperatorDecision({ ...command, action: "return_for_information" }, reviewer)).resolves.toEqual({
      ok: false,
      error: "The AI Credit operator service signed a non-offer decision",
    });
  });

  it("returns the exact safe stale-case error", async () => {
    const error = "The governed case changed; refresh before deciding";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(false, 409, { error })));

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({ ok: false, error });
  });
});

describe("signed offer binding", () => {
  const expected = { mintQuoteId: "quote-1", billId: "bill-1", discountedSat: "7734000", offerExpiresOn: "2026-08-23" };
  const boundAuthorization = {
    ...signedAuthorization,
    authorization: { ...signedAuthorization.authorization, billId: "bill-1" },
  };

  it("requires the exact quote, bill, amount and expiry confirmed by the operator", () => {
    expect(signedAuthorizationMatchesOffer(boundAuthorization, expected)).toBe(true);
    expect(signedAuthorizationMatchesOffer(boundAuthorization, { ...expected, mintQuoteId: "quote-2" })).toBe(false);
    expect(signedAuthorizationMatchesOffer(boundAuthorization, { ...expected, billId: "bill-2" })).toBe(false);
    expect(signedAuthorizationMatchesOffer(boundAuthorization, { ...expected, discountedSat: "1" })).toBe(false);
    expect(signedAuthorizationMatchesOffer(boundAuthorization, { ...expected, offerExpiresOn: "2026-08-24" })).toBe(false);
  });
});
