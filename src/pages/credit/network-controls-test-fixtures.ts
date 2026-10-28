import type { CrossMintEvidence, ParticipantDirectoryResponse, PublicListing, RelayCoverage } from "@bitcredit/ai-credit-shared";

export const mintKey = "b".repeat(64);
export const publicNodeId = `bitcrt02${"c".repeat(64)}`;
export const relayCoverage: RelayCoverage = { relay: "ws://mint-b.test:8080", reachable: true, eose: true, error: null, capped: false };
export function publicListingFixture(): PublicListing {
  return {
    schema: "yellow-book-v1",
    network: "regtest",
    subjectNodeId: publicNodeId,
    type: "company",
    status: "listed",
    name: "Finca Verde S.A.",
    tradingNames: ["Verde Coffee"],
    registration: { country: "GT", registry: "sat", number: "BUYER-99" },
    country: "GT",
    region: "Antigua",
    products: [{ label: "Coffee" }],
    actingPersons: [{ publicName: "Ana", publicRole: "Director" }],
    contactRelays: [relayCoverage.relay],
    validUntil: Math.floor(Date.now() / 1000) + 3600,
    noticeVersion: "v1",
  };
}
export function directoryNetworkFixture(): Pick<ParticipantDirectoryResponse, "publicCoverage" | "publicSync" | "publicListings"> {
  const listing = publicListingFixture();
  const now = Math.floor(Date.now() / 1000);
  return {
    publicListings: [
      {
        provenance: "public_listing",
        listing,
        eventId: "d".repeat(64),
        author: publicNodeId.slice(8),
        createdAt: now - 60,
        validUntil: listing.validUntil,
        signatureStatus: "valid",
        evidenceState: "self_declared",
        participant: {
          ref: publicNodeId,
          kind: "company",
          names: [listing.name],
          postalAddresses: [],
          emails: [],
          registrationNumbers: [],
          identificationDigests: [],
          sources: [],
          truncated: false,
        },
        score: 0.9,
      },
    ],
    publicCoverage: {
      networkCoverage: "unknown",
      relays: [
        {
          relay: relayCoverage.relay,
          lastSuccessfulSync: now - 60,
          cursor: now - 60,
          coverage: { ...relayCoverage, reachable: false, eose: false, capped: true, error: "relay_timeout" },
        },
      ],
    },
    publicSync: {
      snapshotAt: now,
      networkCoverage: "unknown",
      backfillWindowSeconds: 3600,
      skippedBefore: now - 86400,
      windows: [{ relay: relayCoverage.relay, since: now - 3600, until: now, capped: true, error: null }],
    },
  };
}
export function crossMintFixture(): CrossMintEvidence {
  const now = Math.floor(Date.now() / 1000);
  const hex = "a".repeat(64);
  const signature = "b".repeat(128);
  const attestation: CrossMintEvidence["attestation"] = {
    requestDigest: hex,
    subjectBinding: publicNodeId,
    billId: "bill-a",
    billStateHash: hex,
    caseBinding: hex,
    observations: {
      seen: "seen",
      quoted: [{ state: "Offered", expiresAt: now + 1800 }],
      acquiredRecorded: false,
      issuance: "unknown",
      repayment: "unknown",
    },
    scope: { billId: "bill-a", billStateHash: hex, recordCount: 1, windowStart: null, windowEnd: now },
    coverage: "partial",
    asOf: now,
    validUntil: now + 3600,
    methodologyVersion: "mint-quote-book-bill-status-v1",
    issuerRecordCommitment: hex,
    disputeStatus: "unknown",
    supersedes: null,
    synthetic: true,
  };
  return {
    schema: "cross-mint-attestation-v1",
    source: { mintPubkey: mintKey, descriptorDigest: hex, signature, messageId: hex },
    state: "attributed_source_assertion",
    applicantVisible: true,
    caseBinding: hex,
    attestation,
    signedEnvelope: {
      schema: "cross-mint-envelope-v1",
      network: "regtest",
      sender: mintKey,
      recipient: hex,
      keyId: mintKey,
      descriptorDigest: hex,
      messageId: hex,
      requestId: hex,
      grantDigest: hex,
      issuedAt: now,
      expiresAt: now + 3600,
      nonce: hex,
      payloadDigest: hex,
      signatureAlgorithm: "BIP340",
      signature,
      type: "attestation",
      payload: attestation,
    },
  };
}
