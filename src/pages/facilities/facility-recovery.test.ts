import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import { FacilityRecoveryError, pendingReassessment, saveReassessment } from "./facility-recovery";
import { facilityDigest, facilityFixture } from "./facility-test-fixture";

vi.mock("@/keycloak", () => ({ default: { authenticated: true, subject: "operator-a", tokenParsed: { iss: "https://issuer.test" } } }));
const command = {
  action: "reassess",
  id: "11111111-1111-4111-8111-111111111111",
  expectedRevision: 4,
  submissionDigest: facilityDigest,
  commandId: "22222222-2222-4222-8222-222222222222",
} satisfies FacilityOperatorCommand;
beforeEach(() => {
  sessionStorage.clear();
});
describe("operator-bound recovery records", () => {
  it("isolates another operator, application and snapshot", () => {
    saveReassessment("operator-a", command);
    expect(pendingReassessment("operator-a", facilityFixture())).toEqual(command);
    expect(pendingReassessment("operator-b", facilityFixture())).toBeUndefined();
    expect(pendingReassessment("operator-a", facilityFixture({ id: "33333333-3333-4333-8333-333333333333" }))).toBeUndefined();
    expect(pendingReassessment("operator-a", facilityFixture({ revision: 5 }))).toBeUndefined();
    const changed = facilityFixture();
    changed.submissions[0].digest = `sha256:${"c".repeat(64)}`;
    expect(pendingReassessment("operator-a", changed)).toBeUndefined();
  });
  it("does not replace an unconfirmed command with a new command id", () => {
    saveReassessment("operator-a", command);
    expect(() => saveReassessment("operator-a", { ...command, commandId: "33333333-3333-4333-8333-333333333333" })).toThrow(
      FacilityRecoveryError
    );
    expect(pendingReassessment("operator-a", facilityFixture())).toEqual(command);
  });
  it("requires an authenticated identity before recording a request", () => {
    expect(() => saveReassessment(undefined, command)).toThrow(FacilityRecoveryError);
    expect(sessionStorage.length).toBe(0);
  });
});
