import { defineMessages } from "react-intl";

export const networkMessages = defineMessages({
  locks: { id: "credit.network.locks", defaultMessage: "Instrument finance locks", description: "Finance lock panel heading" },
  bill: { id: "credit.network.bill", defaultMessage: "Bill lock", description: "Bill instrument lock" },
  invoice: { id: "credit.network.invoice", defaultMessage: "Invoice lock", description: "Tax authority invoice instrument lock" },
  missing: {
    id: "credit.network.missing",
    defaultMessage: "Not recorded in this snapshot; no clearance is implied.",
    description: "Missing network observation",
  },
  clear: {
    id: "credit.network.clear",
    defaultMessage: "No active lock observed in the checked scope",
    description: "Scoped lock observation, never network clearance",
  },
  reserved: { id: "credit.network.reserved", defaultMessage: "Reserved · offer open", description: "Reserved finance lock state" },
  financed: {
    id: "credit.network.financed",
    defaultMessage: "Financed lock · Mint statement",
    description: "Financed lock state is a source statement",
  },
  none: { id: "credit.network.none", defaultMessage: "No holder observed", description: "No lock holder in checked scope" },
  us: { id: "credit.network.us", defaultMessage: "Held by this Mint", description: "Own finance lock" },
  other_mint: { id: "credit.network.otherMint", defaultMessage: "Held by another Mint", description: "Another Mint finance lock" },
  lockScope: {
    id: "credit.network.lockScope",
    defaultMessage:
      "Checks cover this Mint and its pinned followed Mints only. A signed lock is a Mint statement, not proof of financing. Mints outside this set are not covered.",
    description: "Finance lock coverage and evidence limits",
  },
  retry: { id: "credit.network.retry", defaultMessage: "Retry current lock checks", description: "Retry Mint verification sources" },
  retryFailed: {
    id: "credit.network.retryFailed",
    defaultMessage: "Lock checks could not be refreshed. Retry when the service is reachable.",
    description: "Failed lock retry",
  },
  retryDone: {
    id: "credit.network.retryDone",
    defaultMessage: "Sources checked. Review the refreshed case snapshot.",
    description: "Source retry success requires fresh review",
  },
  relay: {
    id: "credit.network.relay",
    defaultMessage: "{relay}: {reachable} · {complete} · {cap}",
    description: "Per relay query coverage",
  },
  reachable: { id: "credit.network.reachable", defaultMessage: "reachable", description: "Relay reachable" },
  unreachable: { id: "credit.network.unreachable", defaultMessage: "unreachable", description: "Relay unreachable" },
  eose: { id: "credit.network.eose", defaultMessage: "end of stored events received", description: "Relay query EOSE received" },
  noEose: { id: "credit.network.noEose", defaultMessage: "query incomplete", description: "Relay query without EOSE" },
  capped: { id: "credit.network.capped", defaultMessage: "capped", description: "Bounded relay query truncated" },
  uncapped: { id: "credit.network.uncapped", defaultMessage: "not capped", description: "Relay query within cap" },
  coverageMissing: {
    id: "credit.network.coverageMissing",
    defaultMessage: "Relay coverage unavailable; no clearance is implied.",
    description: "No relay observations",
  },
  registration: {
    id: "credit.network.registration",
    defaultMessage: "Buyer registration comparison",
    description: "Public listing versus register buyer tax ID",
  },
  registrationScope: {
    id: "credit.network.registrationScope",
    defaultMessage:
      "Exact buyer node ID: {node}. Compares the buyer’s self-declared public registration with the tax-authority buyer tax ID. A reason to ask, never a finding; no listing is required.",
    description: "Buyer comparison evidence limits",
  },
  match: {
    id: "credit.network.match",
    defaultMessage: "Registration matches",
    description: "Buyer public registration agrees with register",
  },
  mismatch: {
    id: "credit.network.mismatch",
    defaultMessage: "Registration differs · ask for clarification",
    description: "Buyer registration difference is not an adverse finding",
  },
  no_listing: {
    id: "credit.network.noListing",
    defaultMessage: "No public registration listing observed",
    description: "Absent optional public buyer registration",
  },
  no_register: {
    id: "credit.network.noRegister",
    defaultMessage: "No valid register buyer record available for comparison",
    description: "Absent register record",
  },
  crossMint: { id: "credit.network.crossMint", defaultMessage: "Cross-Mint evidence", description: "Bilateral evidence panel heading" },
  evidenceScope: {
    id: "credit.network.evidenceScope",
    defaultMessage:
      "Attributed source assertions, not independent verification. Never a gate by themselves. Refusal, revocation, silence, no match or unavailable history creates no adverse inference and establishes no network-wide clearance. An offer elsewhere is not financed exposure.",
    description: "Cross Mint authority boundary",
  },
  noEvidence: {
    id: "credit.network.noEvidence",
    defaultMessage: "No usable cross-Mint attestation recorded in this snapshot.",
    description: "Missing optional cross Mint evidence",
  },
  assertion: {
    id: "credit.network.assertion",
    defaultMessage: "Mint {mint} states: {observation}",
    description: "Explicit source attribution for a Mint assertion",
  },
  seen: { id: "credit.network.seen", defaultMessage: "bill seen in its quote book", description: "Issuer Mint says bill seen" },
  not_found_in_scope: {
    id: "credit.network.notFound",
    defaultMessage: "bill not found in its stated scope",
    description: "Scoped no match never clearance",
  },
  unknown: { id: "credit.network.unknown", defaultMessage: "unknown", description: "Unknown source observation" },
  unsupported: { id: "credit.network.unsupported", defaultMessage: "question unsupported", description: "Issuer cannot answer" },
  not_disclosed: { id: "credit.network.notDisclosed", defaultMessage: "not disclosed", description: "Issuer did not disclose" },
  state_mismatch: { id: "credit.network.stateMismatch", defaultMessage: "bill state differs", description: "Issuer bill state mismatch" },
  complete_for_scope: {
    id: "credit.network.completeScope",
    defaultMessage: "Complete for the stated scope",
    description: "Attestation scoped coverage",
  },
  partial: { id: "credit.network.partial", defaultMessage: "Partial coverage", description: "Attestation partial coverage" },
  attestationScope: {
    id: "credit.network.attestationScope",
    defaultMessage: "Scope: bill {bill}, state {state}; {count} records; window {start} to {end}",
    description: "Attestation bill state and bounded quote book scan",
  },
  freshness: {
    id: "credit.network.freshness",
    defaultMessage: "As of {asOf} · valid until {until}",
    description: "Attestation freshness timestamps",
  },
  expired: {
    id: "credit.network.expired",
    defaultMessage: "Expired · do not rely on this assertion",
    description: "Expired retained snapshot attestation",
  },
  current: {
    id: "credit.network.current",
    defaultMessage: "Within its stated validity period",
    description: "Time validity does not establish truth",
  },
  signature: {
    id: "credit.network.signature",
    defaultMessage: "Signature verified by the service on ingestion (BIP340); authentic source, not verified facts.",
    description: "Service verified signature provenance, no browser verification claim",
  },
  revocation: {
    id: "credit.network.revocation",
    defaultMessage:
      "Revocation status is not exposed in this snapshot. The service omits revoked or expired evidence from fresh case reads; this retained snapshot is not a live revocation check.",
    description: "API does not expose attestation revocation state",
  },
  observations: {
    id: "credit.network.observations",
    defaultMessage: "Acquisition recorded: {acquired}. Issuance: unknown. Repayment: unknown. Dispute status: unknown.",
    description: "Separate quote book assertion from issuance repayment and dispute facts",
  },
  yes: { id: "credit.network.yes", defaultMessage: "yes", description: "Affirmative source assertion" },
  no: { id: "credit.network.no", defaultMessage: "no", description: "Negative source assertion within scope" },
  quoted: {
    id: "credit.network.quoted",
    defaultMessage: "Quoted state: {state} · offer expiry {expiry}",
    description: "Quoted lifecycle state does not prove issued value",
  },
  unspecified: {
    id: "credit.network.unspecified",
    defaultMessage: "not specified",
    description: "Optional scope time or quote expiry not supplied",
  },
});
