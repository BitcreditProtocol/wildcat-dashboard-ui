import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchOperatorCapability,
  operatorMayRecordDecision,
  recordOperatorDecision,
  type OperatorCapability,
  type OperatorDecisionInput,
} from "./record-operator-decision";

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

  it("attributes the command to the capability without sending a browser credential", async () => {
    const fetch = vi.fn().mockResolvedValue(response(true, 200, {}));
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-decisions",
      expect.objectContaining({ headers: { "content-type": "application/json" } })
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    expect(JSON.parse(request.body)).toMatchObject({ operatorId: "operator-123", operatorRole: "approver" });
  });

  it("returns the exact safe stale-case error", async () => {
    const error = "The governed case changed; refresh before deciding";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(false, 409, { error })));

    await expect(recordOperatorDecision(command, approver)).resolves.toEqual({ ok: false, error });
  });
});
