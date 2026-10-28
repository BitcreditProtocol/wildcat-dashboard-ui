import { defineMessages } from "react-intl";

export const publicDirectoryMessages = defineMessages({
  public: {
    id: "directory.public",
    defaultMessage: "Public listing · self-declared",
    description: "Provenance badge for subject signed public listing",
  },
  local: { id: "directory.localRecord", defaultMessage: "This Mint’s records", description: "Local record provenance badge" },
  heading: {
    id: "directory.publicHeading",
    defaultMessage: "Observed public listings",
    description: "Separate public listing search results",
  },
  scope: {
    id: "directory.publicScope",
    defaultMessage:
      "Optional, subject-signed public listings held in local copies. A match is a reason to ask, never a finding. No listing or no match says nothing about identity, financing or the whole network.",
    description: "Public listing evidence and coverage boundaries",
  },
  noListing: {
    id: "directory.publicNone",
    defaultMessage: "No public listing observed for this exact node ID. Listing is optional; no adverse inference.",
    description: "Missing signer listing is not adverse",
  },
  identityMismatch: {
    id: "directory.publicIdentityMismatch",
    defaultMessage: "The returned public listing belongs to a different node ID. Verify the lookup before relying on it.",
    description: "A signer listing must bind the exact node identity",
  },
  notRecorded: {
    id: "directory.publicNotRecorded",
    defaultMessage: "Public listing lookup not recorded for this exact node ID.",
    description: "Legacy signer API without public lookup",
  },
  noResults: {
    id: "directory.publicNoResults",
    defaultMessage: "No matching public listings observed in this local copy. No clearance is implied.",
    description: "Empty public search",
  },
  unavailable: {
    id: "directory.publicUnavailable",
    defaultMessage: "Public listings unavailable in this response.",
    description: "Legacy or disabled federation directory",
  },
  validity: { id: "directory.publicValidity", defaultMessage: "Listed until {time}", description: "Subject public listing validity" },
  signature: {
    id: "directory.publicSignature",
    defaultMessage: "Subject signature verified by the service; contents remain self-declared.",
    description: "Directory signature does not verify contents",
  },
  event: {
    id: "directory.publicEvent",
    defaultMessage: "Author {author} · event {event} · published {time}",
    description: "Original signed listing provenance",
  },
  score: {
    id: "directory.publicScore",
    defaultMessage: "{score, number, percent} similarity · ranking aid only",
    description: "Public directory deterministic similarity score",
  },
  networkUnknown: {
    id: "directory.networkUnknown",
    defaultMessage: "Network coverage: unknown. Local relay coverage never establishes network-wide clearance.",
    description: "No network clear claim",
  },
  noCoverage: {
    id: "directory.noCoverage",
    defaultMessage: "Public directory relay coverage not reported.",
    description: "No relay health data",
  },
  lastSync: {
    id: "directory.lastSync",
    defaultMessage: "{relay} · last successful sync {time} · cursor {cursor}",
    description: "Per relay directory sync history",
  },
  never: { id: "directory.never", defaultMessage: "not recorded", description: "No successful synchronization" },
  sync: {
    id: "directory.sync",
    defaultMessage: "Sync snapshot {time} · backfill window {seconds} seconds · history before {skipped} skipped",
    description: "Bounded directory sync snapshot",
  },
  window: {
    id: "directory.syncWindow",
    defaultMessage: "{relay} · {since} to {until} · {status}",
    description: "Directory backfill query window",
  },
  capped: { id: "directory.syncCapped", defaultMessage: "capped; incomplete", description: "Truncated directory sync" },
  bounded: {
    id: "directory.syncBounded",
    defaultMessage: "within query cap",
    description: "Sync window bounded completion is not network coverage",
  },
  noSync: { id: "directory.noSync", defaultMessage: "Directory sync status not reported.", description: "Absent sync status" },
});
