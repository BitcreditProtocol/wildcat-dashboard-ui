import { beforeEach, describe, expect, it, vi } from "vitest";
import { operatorMayRecordDecision, recordOperatorDecision, type OperatorDecisionInput } from "./record-operator-decision";

const keycloak = vi.hoisted(() => ({
  authenticated: false,
  realmAccess: undefined as { roles: string[] } | undefined,
  subject: undefined as string | undefined,
  token: undefined as string | undefined,
}));
const env = vi.hoisted(() => ({ apiMocksEnabled: false }));

vi.mock("@/keycloak", () => ({ default: keycloak }));
vi.mock("@/lib/env", () => ({ env }));

const command: OperatorDecisionInput = {
  billId: "bill-1",
  caseId: "case-1",
  decisionResultDigest: `sha256:${"a".repeat(64)}`,
  action: "confirm_proposed_quote",
  reasonCode: "operator_confirmed_governed_terms",
  writtenBasis: "Reviewed the governed result and confirmed the proposed terms.",
};

beforeEach(() => {
  keycloak.authenticated = false;
  keycloak.realmAccess = undefined;
  keycloak.subject = undefined;
  keycloak.token = undefined;
  env.apiMocksEnabled = false;
  vi.unstubAllGlobals();
});

describe("recordOperatorDecision", () => {
  it("fails closed without an authenticated subject and governed role", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command)).resolves.toEqual({
      ok: false,
      error: "An authenticated AI Credit operator role is required",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("derives the operator identity and role from the authenticated session without sending its token", async () => {
    keycloak.authenticated = true;
    keycloak.realmAccess = { roles: ["reviewer", "approver"] };
    keycloak.subject = "operator-123";
    keycloak.token = "signed-token";
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command)).resolves.toEqual({ ok: true });
    // The adapter is an unauthenticated local prototype: it never verifies this token, so sending
    // it only widens where a live credential ends up.
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-decisions",
      expect.objectContaining({ headers: { "content-type": "application/json" } })
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.stringify(request)).not.toContain("signed-token");
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    const requestBody: unknown = JSON.parse(request.body);
    expect(requestBody).toMatchObject({ operatorId: "operator-123", operatorRole: "approver" });
  });

  it("uses explicitly synthetic attribution only in local mock mode", async () => {
    env.apiMocksEnabled = true;
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command)).resolves.toEqual({ ok: true });
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toEqual({ "content-type": "application/json" });
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    const requestBody: unknown = JSON.parse(request.body);
    expect(requestBody).toMatchObject({
      operatorId: "synthetic-dashboard-operator",
      operatorRole: "approver",
    });
  });

  it("keeps every governed action approver-only", async () => {
    keycloak.authenticated = true;
    keycloak.realmAccess = { roles: ["reviewer"] };
    keycloak.subject = "reviewer-123";
    keycloak.token = "signed-token";
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    expect(operatorMayRecordDecision("confirm_proposed_quote")).toBe(false);
    expect(operatorMayRecordDecision("return_for_information")).toBe(false);
    await expect(recordOperatorDecision(command)).resolves.toEqual({
      ok: false,
      error: "An authenticated AI Credit operator role is required",
    });
    await expect(
      recordOperatorDecision({
        ...command,
        action: "return_for_information",
        reasonCode: "operator_returned_for_information",
        requiredItems: ["Signed delivery receipt"],
      })
    ).resolves.toEqual({ ok: false, error: "An authenticated AI Credit operator role is required" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
