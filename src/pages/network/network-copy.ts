import { defineMessages } from "react-intl";
import type { FederationStatus } from "@/pages/directory/federation-status";
export const networkMessages = defineMessages({
  checking: { id: "network.checking", defaultMessage: "Checking…", description: "Display-only quiet retry of relay reads" },
  lastGood: {
    id: "network.lastGood",
    defaultMessage: "Last good: {time}",
    description: "Time of last complete healthy display observation",
  },
  noLastGood: {
    id: "network.noLastGood",
    defaultMessage: "No complete read yet",
    description: "No last-good federation observation available",
  },
  title: { id: "network.title", defaultMessage: "Network", description: "Operator dashboard network: title" },
  healthy: { id: "network.healthy", defaultMessage: "Followed relays responding", description: "Operator dashboard network: healthy" },
  degraded: { id: "network.degraded", defaultMessage: "Federation degraded", description: "Operator dashboard network: degraded" },
  unknown: { id: "network.unknown", defaultMessage: "Federation health unknown", description: "Operator dashboard network: unknown" },
  scope: {
    id: "network.scope",
    defaultMessage: "Observed peers only. A healthy relay is not network-wide clearance.",
    description: "Operator dashboard network: scope",
  },
  why: {
    id: "network.why",
    defaultMessage:
      "Finance locks cover only the Mints this Mint follows. Unreachable relays hold an offer for verification. A lock is its Mint’s statement, not proof of financing. Directory listings are self-authored; matches are reasons to ask, never findings. Cursors and coverage diagnostics remain available below.",
    description: "Operator dashboard network: why",
  },
  reserved: { id: "network.reserved", defaultMessage: "Reserved", description: "Operator dashboard network: reserved" },
  financed: { id: "network.financed", defaultMessage: "Financed", description: "Operator dashboard network: financed" },
  bill: { id: "network.bill", defaultMessage: "Bill", description: "Operator dashboard network: bill" },
  invoice: { id: "network.invoice", defaultMessage: "Invoice", description: "Operator dashboard network: invoice" },
  delivered: { id: "network.delivered", defaultMessage: "Published", description: "Operator dashboard network: delivered" },
  pending: { id: "network.pending", defaultMessage: "Delivery pending", description: "Operator dashboard network: pending" },
  expires: { id: "network.expires", defaultMessage: "Expires {time}", description: "Operator dashboard network: expires" },
  own: { id: "network.own", defaultMessage: "This Mint", description: "Operator dashboard network: own" },
  followed: { id: "network.followed", defaultMessage: "Followed Mints", description: "Operator dashboard network: followed" },
  relays: { id: "network.relays", defaultMessage: "Relays", description: "Operator dashboard network: relays" },
  responding: { id: "network.responding", defaultMessage: "Responding", description: "Operator dashboard network: responding" },
  unreachable: {
    id: "network.unreachable",
    defaultMessage: "Unreachable / incomplete",
    description: "Operator dashboard network: unreachable",
  },
  locks: { id: "network.locks", defaultMessage: "Observed finance locks", description: "Operator dashboard network: locks" },
  noActiveLocks: {
    id: "network.noActiveLocks",
    defaultMessage: "No active finance locks in this Mint’s observed records.",
    description: "Empty observed active lock set, distinct from unavailable observations",
  },
  noLocks: {
    id: "network.noLocks",
    defaultMessage: "Lock observations are available on each quote’s fraud controls. No lock count has been reported here.",
    description: "Operator dashboard network: noLocks",
  },
  diagnostics: {
    id: "network.diagnostics",
    defaultMessage: "Technical diagnostics",
    description: "Operator dashboard network: diagnostics",
  },
  diagram: {
    id: "network.diagram",
    defaultMessage: "This Mint connects to its relay; followed Mints connect to their configured relays.",
    description: "Operator dashboard network: diagram",
  },
});
export function federationHealthy(status: FederationStatus) {
  const configured = [...new Set([...status.descriptor.relays, ...status.peers.flatMap((p) => p.relays)])];
  return (
    configured.length > 0 &&
    configured.every((relay) => {
      const inbox = status.inbox.find((r) => r.relay === relay);
      const directory = status.relays.relays.find((r) => r.relay === relay)?.coverage;
      return (
        inbox?.reachable &&
        inbox.eose &&
        !inbox.capped &&
        !inbox.error &&
        directory?.reachable &&
        directory.eose &&
        !directory.capped &&
        !directory.error
      );
    })
  );
}
