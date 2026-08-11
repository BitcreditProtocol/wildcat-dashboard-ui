import { describe, expect, it } from "vitest";
import { operatorBasicAuthMatches, operatorBasicAuthRequiredForPath } from "./operator-dev-auth";

const token = "demo-operator-token-with-at-least-32-characters";
const basic = (username: string, password: string) => `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

describe("operator dev server auth", () => {
  it("accepts only the fixed username and exact strong server token", () => {
    expect(operatorBasicAuthMatches(basic("operator", token), token)).toBe(true);
    expect(operatorBasicAuthMatches(basic("other", token), token)).toBe(false);
    expect(operatorBasicAuthMatches(basic("operator", `${token}x`), token)).toBe(false);
  });

  it("fails closed for missing, malformed, or weak configuration", () => {
    expect(operatorBasicAuthMatches(undefined, token)).toBe(false);
    expect(operatorBasicAuthMatches("Basic !!!", token)).toBe(false);
    expect(operatorBasicAuthMatches(basic("operator", "short"), "short")).toBe(false);
    expect(operatorBasicAuthMatches(basic("operator", token), undefined)).toBe(false);
  });

  it("leaves Mint API requests to Keycloak Bearer authentication", () => {
    expect(operatorBasicAuthRequiredForPath("/v1/admin")).toBe(false);
    expect(operatorBasicAuthRequiredForPath("/v1/admin/quotes")).toBe(false);
    expect(operatorBasicAuthRequiredForPath("/api/ai-credit/workbench-decisions")).toBe(true);
    expect(operatorBasicAuthRequiredForPath("/v1/admin-impersonation")).toBe(true);
  });
});
