import type { InformationNeed } from "@bitcredit/ai-credit-shared";
import { describe, expect, it } from "vitest";
import { buildCaseBrief, operatorOwnsNextStep } from "./case-brief";
import {
  activeDialogue,
  firstRun,
  resultDigest,
  salesQuestion,
  submissionDigest,
  submittedDialogue,
  twoSubmissionCase,
} from "./case-history.test-fixtures";
import type { DecisionCase, VerificationRequest } from "./decision-types";

const now = Date.parse("2026-09-23T12:00:00.000Z");

/** Current, quote-bound, offer-ready synthetic case; each test changes only what it examines. */
function readyCase(overrides: Partial<DecisionCase> = {}): DecisionCase {
  return {
    assessmentCurrency: "current",
    mintQuoteId: "quote-1",
    submissionDigest,
    resultDigest,
    creditProgram: {},
    creditProgramAssignment: {},
    snapshot: {
      caseId: "case-1",
      confirmedClaims: { evidenceState: "applicant_confirmed" },
      invoice: { plausibility: "plausible", billAndClaimsConsistency: "match", evidenceState: "corroborated" },
      acceptor: { probabilityOfDefaultBps: 120, lossGivenDefaultBps: 4500, evidenceState: "corroborated" },
      duplicateCheck: { result: "clear", evidenceState: "corroborated" },
    },
    result: {
      assessmentStatus: "ready_for_decision",
      recommendation: "offer_available",
      terms: { offerExpiresOn: "2026-09-30" },
      verificationRequests: [],
    },
    ...overrides,
  } as unknown as DecisionCase;
}

const brief = (decisionCase: DecisionCase) => buildCaseBrief(decisionCase, { quoteId: "quote-1", now });

const blocked = (...requests: Partial<VerificationRequest>[]): Partial<DecisionCase> => ({
  result: {
    ...readyCase().result,
    assessmentStatus: "blocked_pending_verification",
    recommendation: null,
    terms: null,
    verificationRequests: requests.map((request) => ({
      code: "check",
      axis: "evidence_sufficiency",
      requiredItem: "Required item",
      reasonCode: "verification_required",
      ...request,
    })),
  },
});

const openNeed = (overrides: Partial<InformationNeed>): InformationNeed => ({
  ...salesQuestion,
  status: "open",
  review: undefined,
  origin: undefined,
  ...overrides,
});

describe("buildCaseBrief", () => {
  it("requires facility review when a bound case has no current coverage, even if ordinary bill checks pass", () => {
    const base = readyCase();
    const result = brief({
      ...base,
      snapshot: {
        ...base.snapshot,
        facility: {
          schemaVersion: "facility-bill-binding-v1",
          facilityId: "11111111-1111-4111-8111-111111111111",
          applicantRef: "applicant",
          mintNodeId: "mint",
          agreementVersion: 1,
          agreementDigest: resultDigest,
          submissionDigest,
        },
      },
    });
    expect(result.next.kind).toBe("facility_review");
    expect(operatorOwnsNextStep(result.next)).toBe(true);
  });
  it("keeps a processing dialogue with the agent rather than the applicant in legacy projections", () => {
    const result = brief(readyCase({ serverClarificationDialogues: [{ ...activeDialogue, status: "processing" }] }));
    expect(result.next.kind).toBe("wait_agent");
    expect(result.work.some((work) => work.kind === "applicant" && work.state === "answering")).toBe(false);
  });

  it("does not present historical evidence questions as current blockers", () => {
    const result = brief(readyCase({ assessmentCurrency: "historical", informationNeeds: [openNeed({})] }));
    expect(result.next.kind).toBe("wait_reassessment");
    expect(result.outstanding).toEqual([]);
  });

  const prepared: NonNullable<DecisionCase["casePreparation"]> = {
    schemaVersion: "case-preparation-v1",
    status: "prepared",
    approvable: true,
    reasons: ["no_further_eligible_work"],
    automaticRequests: { policyVersion: "synthetic-agent-follow-up-v2", used: 2, budget: 3, consent: "agent_follow_up_v2", enabled: true },
    rounds: [],
    openObjectives: [],
  };

  it("uses the server's prepared case without demanding a human disposition for every answer", () => {
    const result = brief(readyCase({ informationNeeds: [openNeed({})], casePreparation: prepared }));
    expect(result.next.kind).toBe("decide_offer");
    expect(result.work.some((work) => work.kind === "evidence_review" || work.kind === "proposals")).toBe(false);
    expect(result.repaymentUnverified).toBe(true);
  });

  it.each(["awaiting_applicant", "preparing", "attention"] as const)("does not override a %s server preparation hold", (status) => {
    const result = brief(readyCase({ casePreparation: { ...prepared, status, approvable: false, reasons: ["agent_review_failed"] } }));
    expect(result.next.kind).toBe(
      status === "awaiting_applicant" ? "wait_applicant" : status === "preparing" ? "wait_agent" : "preparation_attention"
    );
  });

  it("does not let prepared status bypass mandatory Mint evidence or quote binding", () => {
    expect(brief(readyCase({ ...blocked({ owner: "mint_risk" }), casePreparation: prepared })).next.kind).toBe("wait_mint_risk");
    expect(brief(readyCase({ casePreparation: prepared, mintQuoteId: "other-quote" })).next.kind).toBe("not_actionable");
    expect(brief(readyCase({ casePreparation: prepared, assessmentCurrency: "historical" })).next.kind).toBe("wait_reassessment");
  });

  it("shows the applicant's next step when a pending question makes the assessment historical", () => {
    const result = brief(
      readyCase({
        assessmentCurrency: "historical",
        casePreparation: { ...prepared, status: "awaiting_applicant", approvable: false, reasons: ["awaiting_applicant_reply"] },
      })
    );
    expect(result.next.kind).toBe("wait_applicant");
    expect(operatorOwnsNextStep(result.next)).toBe(false);
  });
  it("hands a ready, quote-bound case to the operator and reports what supports it", () => {
    const result = brief(readyCase());
    expect(result.next).toEqual({ kind: "decide_offer", offerExpiresOn: "2026-09-30" });
    expect(operatorOwnsNextStep(result.next)).toBe(true);
    expect(result.support).toEqual({ invoice: "consistent", acceptorRiskRecord: true, duplicateCheckClear: true });
    expect(result.repaymentUnverified).toBe(true);
  });

  it("counts only the Mint's own records as independent, never the synthetic assessor or the applicant's invoice", () => {
    const synthetic = brief(
      readyCase({
        snapshot: {
          ...readyCase().snapshot,
          invoice: { plausibility: "plausible", billAndClaimsConsistency: "match", evidenceState: "independently_verified" },
          acceptor: { probabilityOfDefaultBps: 120, lossGivenDefaultBps: 4500, evidenceState: "independently_verified" },
          duplicateCheck: { result: "clear", evidenceState: "independently_verified" },
        },
      } as unknown as Partial<DecisionCase>)
    );
    // The invoice stays an applicant-document check; the synthetic assessor's records are not Mint evidence.
    expect(synthetic.support).toEqual({ invoice: "consistent", acceptorRiskRecord: false, duplicateCheckClear: false });

    const unconfirmedMatch = brief(
      readyCase({
        snapshot: {
          ...readyCase().snapshot,
          invoice: { plausibility: "plausible", billAndClaimsConsistency: "match", evidenceState: "unconfirmed" },
          duplicateCheck: { result: "unknown", evidenceState: "source_unavailable" },
        },
      } as unknown as Partial<DecisionCase>)
    );
    expect(unconfirmedMatch.support.invoice).toBe("unchecked");
    expect(unconfirmedMatch.support.duplicateCheckClear).toBe(false);
  });

  it("never offers expired, unbound or no-fit terms as an offer decision", () => {
    expect(
      brief(readyCase({ result: { ...readyCase().result, terms: { offerExpiresOn: "2026-09-01" } } as DecisionCase["result"] })).next
    ).toEqual({
      kind: "terms_expired",
      offerExpiresOn: "2026-09-01",
    });
    expect(brief(readyCase({ mintQuoteId: "another-quote" })).next).toEqual({ kind: "not_actionable", noFit: false });
    const noFit = brief(readyCase({ result: { ...readyCase().result, recommendation: "no_current_product_fit", terms: null } }));
    expect(noFit.next).toEqual({ kind: "confirm_no_fit" });
    expect(noFit.repaymentUnverified).toBe(false);
  });

  it("hands expired prepared terms to the applicant, even when agent preparation finished", () => {
    const withExpiry = (offerExpiresOn: string) => ({ ...readyCase().result, terms: { offerExpiresOn } }) as DecisionCase["result"];
    const expired = brief(readyCase({ casePreparation: prepared, result: withExpiry("2026-09-22") }));
    expect(expired.next).toEqual({ kind: "terms_expired", offerExpiresOn: "2026-09-22" });
    expect(operatorOwnsNextStep(expired.next)).toBe(false);
    // Terms stand through the end of their UTC expiry day.
    expect(brief(readyCase({ result: withExpiry("2026-09-23") })).next.kind).toBe("decide_offer");
  });

  it("asks a human reviewer to check applicant replies instead of treating them as resolved", () => {
    const result = brief(readyCase({ informationNeeds: [openNeed({})] }));
    expect(result.next).toEqual({ kind: "review_evidence", count: 1 });
    expect(result.work).toContainEqual({ kind: "evidence_review", toReview: 1, noReply: 0, unavailable: 0, reviewed: 0 });
    expect(result.outstanding).toEqual([{ item: salesQuestion.question, action: "review_reply" }]);
  });

  it("counts a review bound to an older assessment as needing review again", () => {
    const olderReview = { ...salesQuestion.review!, resultDigest: `sha256:${"9".repeat(64)}` };
    const result = brief(readyCase({ informationNeeds: [{ ...salesQuestion, review: olderReview }] }));
    expect(result.next).toEqual({ kind: "review_evidence", count: 1 });
  });

  it("records current reviewed support in progress without claiming independence", () => {
    const result = brief(readyCase({ informationNeeds: [salesQuestion] }));
    expect(result.next.kind).toBe("decide_offer");
    expect(result.work).toContainEqual({ kind: "evidence_review", toReview: 0, noReply: 0, unavailable: 0, reviewed: 1 });
  });

  it("waits for the applicant while they are answering, even when older replies await review", () => {
    const result = brief(
      readyCase({ ...blocked({ owner: "applicant" }), informationNeeds: [openNeed({})], serverClarificationDialogues: [activeDialogue] })
    );
    expect(result.next).toEqual({ kind: "wait_applicant", since: activeDialogue.updatedAt });
    expect(operatorOwnsNextStep(result.next)).toBe(false);
    expect(result.outstanding).toEqual([]);
    expect(result.work).toContainEqual({ kind: "applicant", state: "answering", at: activeDialogue.updatedAt, submissions: 0 });
  });

  it("lists an automatic request's items as owed only while that request still awaits a reply", () => {
    const answered = {
      request: { requestedAt: "2026-09-20T10:00:00.000Z", requiredItems: ["Show the buyer's purchase order."] },
      response: { respondedAt: "2026-09-21T10:00:00.000Z" },
    } as unknown as DecisionCase["automaticInformationRequest"];
    // A new live dialogue makes the applicant the next actor; the earlier, answered request is not owed again.
    const live = brief(readyCase({ automaticInformationRequest: answered, serverClarificationDialogues: [activeDialogue] }));
    expect(live.next).toEqual({ kind: "wait_applicant", since: activeDialogue.updatedAt });
    expect(live.outstanding).toEqual([]);

    const awaiting = brief(
      readyCase({
        automaticInformationRequest: { ...answered, response: null } as unknown as DecisionCase["automaticInformationRequest"],
        casePreparation: { ...prepared, status: "awaiting_applicant", approvable: false, reasons: ["awaiting_applicant_reply"] },
      })
    );
    expect(awaiting.next.kind).toBe("wait_applicant");
    expect(awaiting.outstanding).toEqual([{ item: "Show the buyer's purchase order.", action: "reply" }]);
  });

  it("waits for a reply to a question already sent, and asks the operator to send one that was not", () => {
    const asked = openNeed({ response: undefined, origin: { runId: firstRun.runId, needIndex: 0, requestId: "request-1" } });
    expect(brief(readyCase({ informationNeeds: [asked] })).next.kind).toBe("wait_applicant");
    expect(brief(readyCase({ informationNeeds: [asked] })).outstanding).toEqual([{ item: asked.question, action: "reply" }]);
    expect(brief(readyCase({ informationNeeds: [openNeed({ response: undefined })] })).outstanding).toEqual([
      { item: salesQuestion.question, action: "send_request" },
    ]);
    expect(brief(readyCase({ informationNeeds: [openNeed({ response: undefined })] })).next).toEqual({
      kind: "send_applicant_request",
      count: 1,
    });
  });

  it("offers the operator a choice when evidence ended unavailable", () => {
    const exhausted = openNeed({
      status: "exhausted",
      review: { ...salesQuestion.review!, outcome: "exhausted", evidenceDigests: [] },
    });
    const result = brief(readyCase({ informationNeeds: [exhausted] }));
    expect(result.next).toEqual({ kind: "decide_unresolved", count: 1 });
    expect(result.outstanding).toEqual([{ item: exhausted.question, action: "resolve_evidence" }]);
  });

  it("lets running agent work finish before asking anyone to act", () => {
    const result = brief(readyCase({ caseInvestigation: { status: "running", runs: [] }, informationNeeds: [openNeed({})] }));
    expect(result.next).toEqual({ kind: "wait_agent" });
    expect(result.outstanding).toEqual([]);
    expect(result.work[0]).toEqual({ kind: "answer_review", state: "running", proposed: 0 });
  });

  it.each(["applicant", "system", "mint_risk", "mint_operations"] as const)(
    "does not dispatch %s verification work while answer review is running",
    (owner) => {
      const result = brief(readyCase({ ...blocked({ owner }), caseInvestigation: { status: "running", runs: [] } }));
      expect(result.next.kind).toBe("wait_agent");
      expect(result.outstanding).toEqual([]);
      expect(result.work.some((item) => item.kind === "verification")).toBe(true);
    }
  );

  it("tells a failed answer review apart from one that never ran for the latest submission", () => {
    const failed = { ...firstRun, submissionDigest, resultDigest, status: "failed" as const, needs: [] };
    expect(brief(readyCase({ caseInvestigation: { status: "stopped", runs: [failed] } })).work[0]).toEqual({
      kind: "answer_review",
      state: "failed",
      proposed: 0,
    });
    const earlier = { ...firstRun, submissionDigest: `sha256:${"8".repeat(64)}` };
    expect(brief(readyCase({ caseInvestigation: { status: "stopped", runs: [earlier] } })).work[0]).toEqual({
      kind: "answer_review",
      state: "not_run",
      proposed: 0,
    });
  });

  it("routes blockers to their owners: Mint risk waits, applicant information and source retries go to the operator", () => {
    const mintRisk = brief(readyCase(blocked({ owner: "mint_risk", reasonCode: "verification_acceptor_loss_parameters_required" })));
    expect(mintRisk.next).toEqual({ kind: "wait_mint_risk" });
    expect(mintRisk.support.acceptorRiskRecord).toBe(false);

    const withApplicant = brief(readyCase(blocked({ owner: "mint_risk" }, { owner: "applicant" })));
    expect(withApplicant.next).toEqual({ kind: "send_applicant_request", count: 1 });
    expect(withApplicant.work.filter((item) => item.kind === "verification")).toHaveLength(2);
    expect(withApplicant.outstanding).toEqual([
      { item: "Required item", action: "provide_risk" },
      { item: "Required item", action: "send_request" },
    ]);

    expect(brief(readyCase(blocked({ owner: "system" }))).next).toEqual({ kind: "retry_sources" });
    expect(brief(readyCase(blocked({ owner: "mint_operations", axis: "mint_exposure_capacity" }))).next).toEqual({ kind: "manual_review" });
  });

  it("never tells the operator to send an applicant request on an agent-prepared case", () => {
    const attention = {
      ...prepared,
      status: "attention" as const,
      approvable: false,
      reasons: ["mint_verification_required" as const, "applicant_verification_unresolved" as const],
    };
    const result = brief(readyCase({ ...blocked({ owner: "mint_risk" }, { owner: "applicant" }), casePreparation: attention }));
    expect(result.next).toEqual({ kind: "wait_mint_risk" });
    expect(operatorOwnsNextStep(result.next)).toBe(false);
    // Both needs stay listed with their actual owners; the applicant item is not an operator dispatch task.
    expect(result.outstanding).toEqual([
      { item: "Required item", action: "provide_risk" },
      { item: "Required item", action: "applicant_evidence" },
    ]);
    expect(result.work.flatMap((item) => (item.kind === "verification" ? [item.owner] : []))).toEqual(["mint_risk", "applicant"]);
  });

  it("puts closure, applicant review and retained assessments ahead of every other step", () => {
    const closed = brief(
      readyCase({ ...blocked({ owner: "applicant" }), mintDenial: { state: "completed" } as DecisionCase["mintDenial"] })
    );
    expect(closed.next).toEqual({ kind: "closed" });
    expect(brief(readyCase({ applicantHumanReview: {} as DecisionCase["applicantHumanReview"] })).next.kind).toBe(
      "respond_applicant_review"
    );
    const historical = brief(readyCase({ assessmentCurrency: "historical", informationNeeds: [openNeed({})] }));
    expect(historical.next).toEqual({ kind: "wait_reassessment" });
  });

  it("summarises agent, applicant and proposal work from recorded identifiers", () => {
    const result = brief(readyCase({ ...twoSubmissionCase, serverClarificationDialogues: [submittedDialogue] }));
    expect(result.work).toEqual(
      expect.arrayContaining([
        { kind: "answer_review", state: "completed", proposed: 0 },
        { kind: "public_research", state: "available", findings: 1, sources: 1, searches: 1 },
        { kind: "applicant", state: "replied", at: submittedDialogue.updatedAt, submissions: 2 },
      ])
    );
  });
});
