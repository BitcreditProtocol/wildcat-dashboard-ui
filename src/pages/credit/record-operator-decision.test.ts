import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchOperatorCapability,
  durableAuthorizationReceiptFromQuote,
  operatorMayRecordDecision,
  recordMintRiskAssessment,
  reviewInvoiceEvidence,
  recordApplicantHumanReviewUpdate,
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
const DENIAL_OPERATION_ID = `sha256:${"1".repeat(64)}`;
const expectedMint = { mintQuoteId: "quote-1", mintId: "mint-demo" };
const completedMintDenial = {
  state: "completed",
  operationId: DENIAL_OPERATION_ID,
  receipt: {
    receiptVersion: "credit-authorization-receipt-v1",
    operationId: DENIAL_OPERATION_ID,
    authorizationDigest: `sha256:${"2".repeat(64)}`,
    caseId: "case-1",
    status: "completed",
    mintId: "mint-demo",
    billId: "bill-1",
    action: "deny_governed_quote",
    effectId: "quote-1",
    resultDigest: `sha256:${"3".repeat(64)}`,
    completedAt: "2026-08-25T12:00:00.000Z",
    synthetic: true,
  },
} as const;

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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-capability-v1", ...approver }))
    );

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
    signedEvidence: {
      evidence: { acceptorRef: "acceptor-1", keyId: "risk-authority-v1" },
      evidenceDigest: `sha256:${"b".repeat(64)}`,
      signatureAlgorithm: "Ed25519",
      signature: "signed-by-risk-authority",
    },
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
          signedEvidence: risk.signedEvidence,
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

describe("invoice evidence review", () => {
  const input = {
    billId: "bill-1",
    caseId: "case-1",
    decisionResultDigest: `sha256:${"a".repeat(64)}`,
    evidence: {
      reference: `sha256:${"b".repeat(64)}`,
      contentDigest: `sha256:${"c".repeat(64)}`,
      label: "invoice.pdf",
      origin: "applicant_upload" as const,
    },
  };

  it("submits the exact current evidence through the authenticated operator route", async () => {
    const fetch = vi.fn().mockResolvedValue(response(true, 200, {}));
    vi.stubGlobal("fetch", fetch);

    await expect(reviewInvoiceEvidence(input, reviewer)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-verifications",
      expect.objectContaining({ body: JSON.stringify({ ...input, action: "review_invoice" }), method: "POST" })
    );
  });

  it("does not send without an operator capability", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(reviewInvoiceEvidence(input, undefined)).resolves.toEqual({
      ok: false,
      error: "A ready AI Credit operator capability is required for this action",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("applicant human review", () => {
  const input = {
    billId: "bill-1",
    caseId: "case-1",
    requestId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
    contestedDecisionResultDigest: `sha256:${"a".repeat(64)}`,
    action: "begin_review" as const,
  };

  it("uses the authenticated operator route without browser-supplied attribution", async () => {
    const fetch = vi.fn().mockResolvedValue(response(true, 200, {}));
    vi.stubGlobal("fetch", fetch);

    await expect(recordApplicantHumanReviewUpdate(input, reviewer)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-human-review-updates",
      expect.objectContaining({ body: JSON.stringify(input), headers: { "content-type": "application/json" }, method: "POST" })
    );
  });

  it("keeps the second-review identity check server-authoritative", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(false, 400, { error: "Human review must use another operator" })));

    await expect(recordApplicantHumanReviewUpdate(input, approver)).resolves.toEqual({
      ok: false,
      error: "Human review must use another operator",
    });
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
    const fetch = vi
      .fn()
      .mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-decision-response-v1", signedAuthorization }));
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({ ok: true, signedAuthorization });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-decisions",
      expect.objectContaining({ headers: { "content-type": "application/json" } })
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    expect(request.body).toBe(JSON.stringify({ ...command, materialEvidence: [], requiredItems: [] }));
  });

  it("forwards only the selected material-evidence identities for a discretionary decline", async () => {
    const materialEvidence = [{ kind: "submitted_document" as const, reference: "invoice-a" }];
    const decline = {
      ...command,
      action: "decline_application" as const,
      reasonCode: "operator_declined_governed_offer",
      materialEvidence,
    };
    const fetch = vi.fn().mockResolvedValue(
      response(true, 200, {
        schemaVersion: "ai-credit-operator-decision-response-v1",
        caseId: decline.caseId,
        action: decline.action,
        mintDenial: completedMintDenial,
      })
    );
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(decline, approver, expectedMint)).resolves.toEqual({
      ok: true,
      mintDenial: completedMintDenial,
    });

    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    expect(request.body).toBe(JSON.stringify({ ...decline, materialEvidence, requiredItems: [] }));
  });

  it("fails closed on malformed or differently bound Mint denial responses", async () => {
    const decline = { ...command, action: "decline_application" as const };
    for (const body of [
      { caseId: "case-2", action: decline.action, mintDenial: completedMintDenial },
      { caseId: decline.caseId, action: "close_unable_to_assess", mintDenial: completedMintDenial },
      { caseId: decline.caseId, action: decline.action, mintDenial: { state: "syncing", operationId: DENIAL_OPERATION_ID, extra: true } },
      {
        caseId: decline.caseId,
        action: decline.action,
        mintDenial: { ...completedMintDenial, receipt: { ...completedMintDenial.receipt, effectId: "quote-2" } },
      },
      {
        caseId: decline.caseId,
        action: decline.action,
        mintDenial: { ...completedMintDenial, receipt: { ...completedMintDenial.receipt, operationId: `sha256:${"4".repeat(64)}` } },
      },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-decision-response-v1", ...body }))
      );
      await expect(recordOperatorDecision(decline, approver, expectedMint)).resolves.toEqual({
        ok: false,
        error: "The AI Credit operator service returned an invalid Mint denial status",
      });
    }
  });

  it("fails closed when an Offer response has no valid signed authorization", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-decision-response-v1" })));

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({
      ok: false,
      error: "The AI Credit operator service returned an invalid offer authorization",
    });
  });

  it("keeps return-for-information unsigned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-decision-response-v1" })));

    await expect(recordOperatorDecision({ ...command, action: "return_for_information" }, reviewer)).resolves.toEqual({ ok: true });
  });

  it("rejects any authorization field on a non-offer decision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(true, 200, { schemaVersion: "ai-credit-operator-decision-response-v1", signedAuthorization: {} }))
    );

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
