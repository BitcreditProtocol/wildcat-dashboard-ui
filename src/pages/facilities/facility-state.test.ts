import { describe, expect, it } from "vitest";
import { agreementExpiry, defaultAgreementExpiryDate, facilityActionState } from "./facility-state";
import { facilityDigest, facilityFixture } from "./facility-test-fixture";
import { facilityRefetchInterval } from "./facility-api";

describe("facility operator action gates", () => {
  it("allows a decision only on a prepared matching submission", () => {
    expect(facilityActionState(facilityFixture()).canDecide).toBe(true);
    expect(facilityActionState(facilityFixture({ assessment: null })).canDecide).toBe(false);
    const application = facilityFixture();
    if (!application.assessment) throw new Error("Expected assessment");
    application.assessment.submissionDigest = `sha256:${"b".repeat(64)}`;
    expect(facilityActionState(application).canDecide).toBe(false);
  });
  it.each([
    "interview",
    "review",
    "submitted",
    "assessing",
    "information_requested",
    "agreement_offered",
    "agreement_accepted",
    "declined",
  ] as const)("does not decide in %s", (status) => {
    expect(facilityActionState(facilityFixture({ status })).canDecide).toBe(false);
  });
  it("blocks mutations while working and duplicate unanswered requests", () => {
    expect(facilityActionState(facilityFixture({ pending: true }))).toMatchObject({ canDecide: false, canAsk: false, canReassess: false });
    const app = facilityFixture({
      informationRequests: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          source: "operator",
          actor: "reviewer",
          submissionVersion: 1,
          submissionDigest: facilityDigest,
          questions: ["Which buyer?"],
          objectives: ["buyer"],
          requestedAt: "2026-09-29T10:00:00.000Z",
          answeredBySubmission: null,
        },
      ],
    });
    expect(facilityActionState(app)).toMatchObject({ canDecide: false, canAsk: false, canReassess: false });
  });
  it("allows an optional question on a stable accepted case, not an approval", () => {
    expect(facilityActionState(facilityFixture({ status: "agreement_accepted" }))).toMatchObject({ canAsk: true, canDecide: false });
  });
  it("awaits applicant consent rather than offering operator actions", () => {
    const app = facilityFixture();
    if (!app.assessment) throw new Error("Expected assessment");
    app.assessment.stopReason = "consent_required";
    expect(facilityActionState(app)).toMatchObject({ canDecide: false, canAsk: false, canReassess: false });
  });
  it("refuses malformed dates instead of normalizing a nonexistent day", () => {
    expect(agreementExpiry("2027-02-31")).toBeUndefined();
    expect(agreementExpiry("tomorrow")).toBeUndefined();
    expect(agreementExpiry("2027-02-28")).toBe("2027-02-28T23:59:59.000Z");
  });
  it.each([
    ["2026-09-29T10:00:00.000Z", "2027-09-29"],
    ["2027-03-01T00:00:00.000Z", "2028-03-01"],
    ["2028-02-29T23:59:59.000Z", "2029-02-28"],
    ["2026-12-31T23:30:00-02:00", "2028-01-01"],
  ])("defaults to one UTC calendar year from %s", (now, expected) => {
    expect(defaultAgreementExpiryDate(new Date(now))).toBe(expected);
  });
  it("polls active preparation faster and still discovers terminal case updates", () => {
    expect(facilityRefetchInterval([])).toBe(10_000);
    expect(facilityRefetchInterval([facilityFixture({ status: "assessing" })])).toBe(2000);
    expect(facilityRefetchInterval([facilityFixture({ status: "information_requested" })])).toBe(10_000);
    expect(facilityRefetchInterval([facilityFixture({ status: "agreement_accepted" })])).toBe(30_000);
  });
});
