import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchOperatorCapability,
  operatorMayRecordDecision,
  recordOperatorDecision,
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
