import { defineMessages } from "react-intl";
import type { BillSignerSignal, EmailVerification, MintIntelligenceScope, ParticipantMatchSignal } from "@bitcredit/ai-credit-shared";
import { quoteStatusMessages } from "@/i18n/descriptors";
import { facilityStatusMessages } from "@/pages/facilities/facility-copy";

export const mintCheckMessages = defineMessages({
  reviewSignal: {
    id: "mintChecks.reviewSignal",
    defaultMessage: "Review signal — not a finding",
    description: "Label on every deterministic check result: a reason to look closer, never a fraud finding or a gate",
  },
  unavailable: {
    id: "mintChecks.unavailable",
    defaultMessage: "This check could not be loaded. Nothing about the case has changed; try again in a moment.",
    description: "Calm, retryable error for a read-only operator check",
  },
  unavailableMint: {
    id: "mintChecks.unavailableMint",
    defaultMessage: "The Mint cannot serve this data right now. Nothing about the case has changed; try again in a moment.",
    description: "503 from a read-only operator check: the Mint or its storage is not reachable",
  },
  retry: { id: "mintChecks.retry", defaultMessage: "Try again", description: "Retry a failed read-only check" },
  loading: { id: "mintChecks.loading", defaultMessage: "Loading…", description: "A read-only check is loading" },
  openInDirectory: {
    id: "mintChecks.openInDirectory",
    defaultMessage: "Look up {name} in the directory",
    description: "Link from a possible duplicate to the Mint-local participant directory search",
  },
  quoteSource: {
    id: "mintChecks.source.quote",
    defaultMessage: "Quote · {status} · {roles}",
    description: "A quote at this Mint naming the participant: quote status and the participant's bill roles",
  },
  applicationSource: {
    id: "mintChecks.source.application",
    defaultMessage: "Onboarding application {reference} · {status} · {role}",
    description: "A Mint onboarding application naming the participant: reference, status and the participant's role in it",
  },
  similarity: {
    id: "mintChecks.similarity",
    defaultMessage: "name {name, number, percent} · address {address, number, percent} alike",
    description: "Deterministic trigram similarity of names and addresses; a ranking aid, not a probability",
  },
  directoryIncomplete: {
    id: "mintChecks.directoryIncomplete",
    defaultMessage: "Some of this Mint’s quotes could not be read. A missing match here proves nothing.",
    description: "The participant directory is incomplete, so absence of a match is not evidence",
  },
  noMatches: {
    id: "mintChecks.noMatches",
    defaultMessage: "No possible duplicates in this Mint’s directory.",
    description: "No directory participant looks like this identity",
  },
});

export const matchSignalMessages = defineMessages<ParticipantMatchSignal>({
  same_email: { id: "mintChecks.match.sameEmail", defaultMessage: "Same email", description: "Directory match signal" },
  same_registration_number: {
    id: "mintChecks.match.sameRegistration",
    defaultMessage: "Same registration number",
    description: "Directory match signal",
  },
  same_identification_number: {
    id: "mintChecks.match.sameIdentification",
    defaultMessage: "Same identification number",
    description: "Directory match signal; numbers are compared as digests",
  },
  similar_name: { id: "mintChecks.match.similarName", defaultMessage: "Similar name", description: "Directory match signal" },
  same_address: { id: "mintChecks.match.sameAddress", defaultMessage: "Same address", description: "Directory match signal" },
  similar_address: { id: "mintChecks.match.similarAddress", defaultMessage: "Similar address", description: "Directory match signal" },
});

export const participantKindMessages = defineMessages({
  person: { id: "mintChecks.kind.person", defaultMessage: "Person", description: "Participant kind" },
  company: { id: "mintChecks.kind.company", defaultMessage: "Company", description: "Participant kind" },
  anonymous: { id: "mintChecks.kind.anonymous", defaultMessage: "Anonymous", description: "Participant kind" },
});

export const billRoleMessages = defineMessages({
  drawer: { id: "mintChecks.role.drawer", defaultMessage: "Drawer", description: "Bill party role" },
  drawee: { id: "mintChecks.role.drawee", defaultMessage: "Drawee", description: "Bill party role" },
  payee: { id: "mintChecks.role.payee", defaultMessage: "Payee", description: "Bill party role" },
  endorsee: { id: "mintChecks.role.endorsee", defaultMessage: "Endorsee", description: "Bill party role" },
  holder: { id: "mintChecks.role.holder", defaultMessage: "Holder", description: "Bill party role" },
});

export const applicantIdentityMessages = defineMessages({
  applicant: {
    id: "mintChecks.identity.applicant",
    defaultMessage: "Applicant identity",
    description: "The eBill identity that opened the onboarding application",
  },
  signer: {
    id: "mintChecks.identity.signer",
    defaultMessage: "Signature (person)",
    description: "The applicant's personal signer identity",
  },
  company: { id: "mintChecks.identity.company", defaultMessage: "Seal (company)", description: "The applicant's company identity" },
});

export const masterDataFieldMessages = defineMessages({
  name: { id: "mintChecks.field.name", defaultMessage: "Name", description: "Master data field" },
  email: { id: "mintChecks.field.email", defaultMessage: "Email", description: "Master data field" },
  postal_address: { id: "mintChecks.field.postalAddress", defaultMessage: "Postal address", description: "Master data field" },
  date_of_birth: { id: "mintChecks.field.dateOfBirth", defaultMessage: "Date of birth", description: "Master data field" },
  place_of_birth: { id: "mintChecks.field.placeOfBirth", defaultMessage: "Place of birth", description: "Master data field" },
  identification_number: {
    id: "mintChecks.field.identificationNumber",
    defaultMessage: "Identification number",
    description: "Master data field",
  },
  identity_document: { id: "mintChecks.field.identityDocument", defaultMessage: "Identity document", description: "Master data field" },
  place_of_registration: {
    id: "mintChecks.field.placeOfRegistration",
    defaultMessage: "Place of registration",
    description: "Master data field",
  },
  registration_number: {
    id: "mintChecks.field.registrationNumber",
    defaultMessage: "Registration number",
    description: "Master data field",
  },
  registration_date: { id: "mintChecks.field.registrationDate", defaultMessage: "Registration date", description: "Master data field" },
  proof_of_registration: {
    id: "mintChecks.field.proofOfRegistration",
    defaultMessage: "Proof of registration",
    description: "Master data field",
  },
  signer_is_signatory: {
    id: "mintChecks.field.signerIsSignatory",
    defaultMessage: "Signer listed as company signatory",
    description: "Master data field: the personal signer appears among the company's recorded signatories",
  },
});

export const emailVerificationMessages = defineMessages<EmailVerification>({
  confirmed_by_this_mint: {
    id: "mintChecks.email.thisMint",
    defaultMessage: "Email confirmed by this Mint",
    description: "A valid email identity proof witnessed by this Mint",
  },
  confirmed_by_other_witness: {
    id: "mintChecks.email.otherWitness",
    defaultMessage: "Email confirmed by another witness",
    description: "A valid proof witnessed by another key; authentic, but whose confirmation process is unknown",
  },
  self_signed: {
    id: "mintChecks.email.selfSigned",
    defaultMessage: "Email only self-confirmed",
    description: "The applicant's own identity witnessed the email proof; a self-statement, not a confirmation",
  },
  proof_for_other_email: {
    id: "mintChecks.email.otherEmail",
    defaultMessage: "Proof is for a different email",
    description: "A valid proof for this identity names another email than the declared one",
  },
  unconfirmed: { id: "mintChecks.email.unconfirmed", defaultMessage: "Email not confirmed", description: "No valid email identity proof" },
  proof_invalid: {
    id: "mintChecks.email.invalid",
    defaultMessage: "Email proof does not verify",
    description: "A supplied email proof's signature or identity binding did not verify",
  },
});

export const signerSignalMessages = defineMessages<BillSignerSignal["kind"]>({
  same_signatory_for_distinct_parties: {
    id: "mintChecks.signal.sameSignatory",
    defaultMessage: "One person signed for several parties",
    description: "Bill signer signal title",
  },
  company_signature_without_signatory: {
    id: "mintChecks.signal.noSignatory",
    defaultMessage: "Company signed without a named signatory",
    description: "Bill signer signal title",
  },
  signing_address_differs_from_party_address: {
    id: "mintChecks.signal.addressDiffers",
    defaultMessage: "Signed from a different address",
    description: "Bill signer signal title",
  },
  signed_in_quick_succession: {
    id: "mintChecks.signal.quickSuccession",
    defaultMessage: "Signed in quick succession",
    description: "Bill signer signal title",
  },
  party_name_varies: {
    id: "mintChecks.signal.nameVaries",
    defaultMessage: "Name differs within the bill",
    description: "Bill signer signal title",
  },
  anonymous_party: { id: "mintChecks.signal.anonymous", defaultMessage: "Anonymous party", description: "Bill signer signal title" },
  possible_duplicate_in_directory: {
    id: "mintChecks.signal.duplicate",
    defaultMessage: "Looks like a party already known to this Mint",
    description: "Bill signer signal title",
  },
});

export const signerSignalExplanations = defineMessages<BillSignerSignal["kind"]>({
  same_signatory_for_distinct_parties: {
    id: "mintChecks.signal.sameSignatory.explain",
    defaultMessage:
      "The same person signed for two or more distinct parties, for example drawer and drawee. Related companies do this legitimately; ask how the parties are connected.",
    description: "Plain-language explanation of a bill signer signal",
  },
  company_signature_without_signatory: {
    id: "mintChecks.signal.noSignatory.explain",
    defaultMessage: "A company block carries no personal signatory: a seal without a signature. Ask who signed for the company.",
    description: "Plain-language explanation of a bill signer signal",
  },
  signing_address_differs_from_party_address: {
    id: "mintChecks.signal.addressDiffers.explain",
    defaultMessage:
      "The address stated when signing differs from the party’s address on the bill. Travel and branch offices explain this often.",
    description: "Plain-language explanation of a bill signer signal",
  },
  signed_in_quick_succession: {
    id: "mintChecks.signal.quickSuccession.explain",
    defaultMessage:
      "Two distinct parties signed consecutive blocks {seconds, plural, =0 {in the same second} one {# second apart} other {# seconds apart}}. Parties at one desk do this; independent parties rarely do.",
    description: "Plain-language explanation of a bill signer signal; seconds is the gap between the signatures",
  },
  party_name_varies: {
    id: "mintChecks.signal.nameVaries.explain",
    defaultMessage: "The bill names this party differently in different places. Check which name is current.",
    description: "Plain-language explanation of a bill signer signal",
  },
  anonymous_party: {
    id: "mintChecks.signal.anonymous.explain",
    defaultMessage: "This party holds or held the bill without a named identity, so its master data cannot be checked.",
    description: "Plain-language explanation of a bill signer signal",
  },
  possible_duplicate_in_directory: {
    id: "mintChecks.signal.duplicate.explain",
    defaultMessage:
      "This Mint’s directory holds another identity with a similar name, address or the same email. Shared offices and family names explain some matches.",
    description: "Plain-language explanation of a bill signer signal",
  },
});

export const intelligenceScopeMessages = defineMessages<MintIntelligenceScope>({
  region: { id: "intelligence.scope.region", defaultMessage: "Region", description: "Mint Intelligence scope" },
  industry: { id: "intelligence.scope.industry", defaultMessage: "Industry", description: "Mint Intelligence scope" },
  macro: { id: "intelligence.scope.macro", defaultMessage: "Macro", description: "Mint Intelligence scope" },
});

/** A status we know is translated; anything else shows as the server sent it rather than as a wrong status. */
export function quoteStatusLabel(status: string) {
  return status in quoteStatusMessages ? quoteStatusMessages[status as keyof typeof quoteStatusMessages] : undefined;
}

export function facilityStatusLabel(status: string) {
  return status in facilityStatusMessages ? facilityStatusMessages[status as keyof typeof facilityStatusMessages] : undefined;
}

const blockTypeMessages = defineMessages({
  Issue: { id: "mintChecks.block.Issue", defaultMessage: "Issued the bill", description: "Signed bill block type" },
  Endorse: { id: "mintChecks.block.Endorse", defaultMessage: "Endorsed the bill", description: "Signed bill block type" },
  RequestToAccept: {
    id: "mintChecks.block.RequestToAccept",
    defaultMessage: "Requested acceptance",
    description: "Signed bill block type",
  },
  Accept: { id: "mintChecks.block.Accept", defaultMessage: "Accepted the bill", description: "Signed bill block type" },
  RejectToAccept: { id: "mintChecks.block.RejectToAccept", defaultMessage: "Rejected acceptance", description: "Signed bill block type" },
  RequestToPay: { id: "mintChecks.block.RequestToPay", defaultMessage: "Requested payment", description: "Signed bill block type" },
  RejectToPay: { id: "mintChecks.block.RejectToPay", defaultMessage: "Rejected payment", description: "Signed bill block type" },
  Pay: { id: "mintChecks.block.Pay", defaultMessage: "Recorded payment", description: "Signed bill block type" },
  Mint: { id: "mintChecks.block.Mint", defaultMessage: "Endorsed to a Mint", description: "Signed bill block type" },
});

export function blockTypeLabel(blockType: string) {
  return blockType in blockTypeMessages ? blockTypeMessages[blockType as keyof typeof blockTypeMessages] : undefined;
}
