import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordOperatorDecision, type OperatorDecisionInput } from "./record-operator-decision";

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

  it("derives the operator identity and role from the authenticated Keycloak token", async () => {
    keycloak.authenticated = true;
    keycloak.realmAccess = { roles: ["reviewer", "approver"] };
    keycloak.subject = "operator-123";
    keycloak.token = "signed-token";
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(recordOperatorDecision(command)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-credit/operator-decisions",
      expect.objectContaining({
        headers: { authorization: "Bearer signed-token", "content-type": "application/json" },
      })
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
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

  it("allows reviewers to return for information but not make final decisions", async () => {
    keycloak.authenticated = true;
    keycloak.realmAccess = { roles: ["reviewer"] };
    keycloak.subject = "reviewer-123";
    keycloak.token = "signed-token";
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

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
    ).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    if (typeof request.body !== "string") throw new Error("Expected a JSON request body");
    const requestBody: unknown = JSON.parse(request.body);
    expect(requestBody).toMatchObject({ operatorId: "reviewer-123", operatorRole: "reviewer" });
  });
});
