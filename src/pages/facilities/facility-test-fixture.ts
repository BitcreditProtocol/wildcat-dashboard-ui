import { facilityApplicationSchema, type FacilityApplication } from "@bitcredit/ai-credit-shared";

export const facilityDigest = `sha256:${"a".repeat(64)}`;
export function facilityFixture(overrides: Partial<FacilityApplication> = {}): FacilityApplication {
  const summary = {
    business: "Dairy farm",
    purpose: "Pay feed expenses before milk buyers settle",
    buyers: "Regional dairy cooperative",
    timing: "Weekly on Fridays",
    openQuestions: [],
  };
  const messages = [
    { role: "assistant", text: "When do your buyers pay?" },
    { role: "applicant", text: "Our buyer pays every Friday. We need feed before that." },
  ];
  const assessment = {
    submissionVersion: 1,
    submissionDigest: facilityDigest,
    assessedAt: "2026-09-29T10:00:00.000Z",
    promptVersion: "facility-test-v1",
    modelRoute: "synthetic-test",
    summary: "The farm reports regular milk sales and a weekly payment cycle.",
    findings: [
      { claim: "Buyer pays on Fridays", evidenceState: "applicant_statement", sources: [{ messageIndex: 1, quote: messages[1]?.text }] },
    ],
    openQuestions: [],
    limitations: ["No independent buyer confirmation is available."],
    stopReason: "prepared_for_operator",
  };
  return facilityApplicationSchema.parse({
    schemaVersion: "facility-preparation-v1",
    id: "11111111-1111-4111-8111-111111111111",
    mintNodeId: "mint-local",
    applicantRef: "synthetic-farm",
    applicantName: "Demo Dairy Farm",
    identityAssurance: "synthetic_unverified",
    status: "operator_review",
    revision: 4,
    messages,
    summary,
    createdAt: "2026-09-29T09:00:00.000Z",
    updatedAt: "2026-09-29T10:00:00.000Z",
    submittedAt: "2026-09-29T09:59:00.000Z",
    agreementStatus: "not_issued",
    pending: false,
    submissions: [
      {
        version: 1,
        digest: facilityDigest,
        submittedAt: "2026-09-29T09:59:00.000Z",
        messages,
        summary,
        profile: { country: "El Salvador", industry: "Agriculture" },
      },
    ],
    assessment,
    assessmentHistory: [assessment],
    progress: {
      nextActor: "operator",
      reason: "The application has been prepared for your review.",
      nextStep: "Review sources and decide whether to offer terms.",
    },
    ...overrides,
  });
}
