import { defineMessages } from "react-intl";
import type { FacilityApplication } from "@bitcredit/ai-credit-shared";

export const facilityStatusMessages = defineMessages({
  consent_required: {
    id: "facilities.status.consentRequired",
    defaultMessage: "Waiting for applicant permission",
    description: "Legacy applicant must opt into automatic follow-up before preparation continues",
  },
  expired: {
    id: "facilities.status.expired",
    defaultMessage: "Agreement expired",
    description: "An expired agreement cannot supply reusable findings",
  },
  interview: { id: "facilities.status.interview", defaultMessage: "Applicant is preparing", description: "Facility interview in progress" },
  review: { id: "facilities.status.review", defaultMessage: "Applicant is reviewing", description: "Applicant has not submitted yet" },
  submitted: {
    id: "facilities.status.submitted",
    defaultMessage: "Application received",
    description: "Facility submission awaits assessment",
  },
  assessing: { id: "facilities.status.assessing", defaultMessage: "Preparing the case", description: "Agent assessment is in progress" },
  information_requested: {
    id: "facilities.status.informationRequested",
    defaultMessage: "Waiting for the applicant",
    description: "Facility follow-up awaits applicant",
  },
  operator_review: {
    id: "facilities.status.operatorReview",
    defaultMessage: "Ready for your review",
    description: "Prepared facility case awaits human decision, not approved",
  },
  agreement_offered: {
    id: "facilities.status.agreementOffered",
    defaultMessage: "Agreement awaiting acceptance",
    description: "Operator offered terms that applicant has not accepted",
  },
  agreement_accepted: {
    id: "facilities.status.agreementAccepted",
    defaultMessage: "Agreement accepted",
    description: "Applicant accepted this synthetic non-binding facility agreement",
  },
  declined: {
    id: "facilities.status.declined",
    defaultMessage: "Application declined",
    description: "Operator declined the facility application",
  },
});

export function facilityStatusKey(application: FacilityApplication, now = Date.now()): keyof typeof facilityStatusMessages {
  if (application.status === "operator_review" && application.assessment?.stopReason === "consent_required") return "consent_required";
  if (
    application.status === "agreement_accepted" &&
    (application.agreementStatus === "expired" ||
      (application.currentAgreement && Date.parse(application.currentAgreement.terms.expiresAt) <= now))
  )
    return "expired";
  return application.status;
}

export function facilityDisplayStatus(application: FacilityApplication) {
  return facilityStatusMessages[facilityStatusKey(application)];
}

export const facilityActorMessages = defineMessages({
  applicant: { id: "facilities.actor.applicant", defaultMessage: "Applicant", description: "Who needs to act next" },
  agent: { id: "facilities.actor.agent", defaultMessage: "Preparation agent", description: "Who needs to act next" },
  operator: { id: "facilities.actor.operator", defaultMessage: "Mint operator", description: "Who needs to act next" },
  none: { id: "facilities.actor.none", defaultMessage: "No action needed", description: "No pending step in this facility application" },
});

export const facilitySummaryMessages = defineMessages({
  business: { id: "facilities.business", defaultMessage: "Business", description: "Applicant business summary" },
  purpose: { id: "facilities.purpose", defaultMessage: "Purpose", description: "Facility intended purpose" },
  buyers: { id: "facilities.buyers", defaultMessage: "Expected buyers", description: "Potential future eBill payers" },
  timing: {
    id: "facilities.paymentTiming",
    defaultMessage: "Payment timing",
    description: "Applicant-stated payment and cash timing, the label the applicant sees; not a verified buyer payment cycle",
  },
});

const operatorProgressMessages = defineMessages({
  interviewReason: {
    id: "facilities.progress.interviewReason",
    defaultMessage: "The applicant is preparing or updating their answers.",
    description: "Applicant interview progress described to a Mint operator",
  },
  interviewNext: {
    id: "facilities.progress.interviewNext",
    defaultMessage: "Wait for their submission. Preparation continues automatically after they submit.",
    description: "Operator does not need to micromanage the applicant interview",
  },
  reviewReason: {
    id: "facilities.progress.reviewReason",
    defaultMessage: "The applicant is reviewing their summary before submitting.",
    description: "Distinguishes applicant summary review from an operator review",
  },
  reviewNext: {
    id: "facilities.progress.reviewNext",
    defaultMessage: "No action is needed from you. Their submission will start the next assessment.",
    description: "Operator next step while applicant reviews unsubmitted answers",
  },
  offeredReason: {
    id: "facilities.progress.offeredReason",
    defaultMessage: "The applicant reviews and accepts this exact agreement version.",
    description: "Applicant owns acceptance of an operator-offered agreement",
  },
  offeredNext: {
    id: "facilities.progress.offeredNext",
    defaultMessage: "No operator action is required while you wait for their acceptance.",
    description: "Operator does not accept an agreement on the applicant's behalf",
  },
  acceptedReason: {
    id: "facilities.progress.acceptedReason",
    defaultMessage: "The applicant has accepted this agreement version.",
    description: "Acceptance status described to the Mint operator",
  },
  acceptedNext: {
    id: "facilities.progress.acceptedNext",
    defaultMessage:
      "No operator action is required now. Each future eBill still needs its own assessment; this agreement does not authorize minting.",
    description: "Separate applicant acceptance and per-bill minting authority",
  },
  expiredReason: {
    id: "facilities.progress.expiredReason",
    defaultMessage: "The accepted agreement has expired.",
    description: "Expired agreement status described to the Mint operator",
  },
  expiredNext: {
    id: "facilities.progress.expiredNext",
    defaultMessage: "The applicant needs updated terms before earlier findings can be reused for a new eBill.",
    description: "Operator-facing next step after agreement expiry",
  },
});

export function facilityOperatorProgress(application: FacilityApplication) {
  if (application.status === "interview")
    return { reason: operatorProgressMessages.interviewReason, nextStep: operatorProgressMessages.interviewNext };
  if (application.status === "review")
    return { reason: operatorProgressMessages.reviewReason, nextStep: operatorProgressMessages.reviewNext };
  if (application.status === "agreement_offered")
    return { reason: operatorProgressMessages.offeredReason, nextStep: operatorProgressMessages.offeredNext };
  if (facilityDisplayStatus(application) === facilityStatusMessages.expired)
    return { reason: operatorProgressMessages.expiredReason, nextStep: operatorProgressMessages.expiredNext };
  if (application.status === "agreement_accepted")
    return { reason: operatorProgressMessages.acceptedReason, nextStep: operatorProgressMessages.acceptedNext };
  return undefined;
}

/** Identity admission only: control of the eBill key, never KYC, truth of statements or solvency. */
export const facilityIdentityMessages = defineMessages({
  ebill_identity_key_proof: {
    id: "facilities.identity.keyProof",
    defaultMessage: "Controls this eBill identity",
    description: "The applicant proved control of the active eBill identity key; not KYC or verification of any claim",
  },
  synthetic_unverified: {
    id: "facilities.identity.unverified",
    defaultMessage: "Identity control not proven",
    description: "Older self-asserted application without proof of eBill identity control",
  },
} satisfies Record<FacilityApplication["identityAssurance"], { id: string; defaultMessage: string; description: string }>);
