import type { FacilityApplication } from "@bitcredit/ai-credit-shared";

export function facilityActionState(application: FacilityApplication) {
  const submission = application.submissions[application.submissions.length - 1];
  const awaitingReply = application.informationRequests.some((request) => request.answeredBySubmission === null);
  const currentAssessment = submission !== undefined && application.assessment?.submissionDigest === submission.digest;
  const stable =
    !!submission &&
    !application.pending &&
    application.assessment?.stopReason !== "consent_required" &&
    !["interview", "review", "assessing"].includes(application.status);
  return {
    submission,
    canDecide: stable && !awaitingReply && currentAssessment && application.status === "operator_review",
    canRevise: stable && !awaitingReply && currentAssessment && application.status === "agreement_offered",
    canAsk: stable && !awaitingReply,
    canReassess: stable && !awaitingReply && ["submitted", "operator_review"].includes(application.status),
  };
}

/** One calendar year from the UTC date; clamp leap day to February 28. */
export function defaultAgreementExpiryDate(now = new Date()): string {
  const year = now.getUTCFullYear() + 1;
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(now.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

export function agreementExpiry(date: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return undefined;
  const value = new Date(`${date}T23:59:59.000Z`);
  return Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date ? undefined : value.toISOString();
}
