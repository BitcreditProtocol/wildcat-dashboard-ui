import { defineMessages } from "react-intl";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";

export type StatusKind = "online" | "interim" | "offline" | "rabid" | "confiscatedRabid" | "unknown";

export function mintLabel(mint: string): string {
  try {
    return new URL(mint).host;
  } catch {
    return mint;
  }
}

export function sortByMintLabel(mints: ConnectedMintResponse[]): ConnectedMintResponse[] {
  return [...mints].sort((a, b) => mintLabel(a.mint).localeCompare(mintLabel(b.mint)));
}

export function statusKind(state?: SimpleAlphaState): StatusKind {
  if (!state) return "unknown";
  if ("Online" in state) return "online";
  if ("Interim" in state) return "interim";
  if ("Offline" in state) return "offline";
  if ("Rabid" in state) return "rabid";
  if ("ConfiscatedRabid" in state) return "confiscatedRabid";
  return "unknown";
}

export function statusTimestamp(state?: SimpleAlphaState): number | undefined {
  if (!state) return undefined;
  if ("Online" in state) return state.Online;
  if ("Interim" in state) return state.Interim;
  if ("Offline" in state) return state.Offline;
  return undefined;
}

export function statusDetail(state?: SimpleAlphaState): string | undefined {
  if (!state) return undefined;
  if ("Rabid" in state) return state.Rabid;
  if ("ConfiscatedRabid" in state) return state.ConfiscatedRabid.map((entry) => JSON.stringify(entry)).join(", ");
  return undefined;
}

export const statusMessages = defineMessages({
  online: { id: "home.clowderPeers.status.online", defaultMessage: "Online" },
  interim: { id: "home.clowderPeers.status.interim", defaultMessage: "Interim" },
  offline: { id: "home.clowderPeers.status.offline", defaultMessage: "Offline" },
  rabid: { id: "home.clowderPeers.status.rabid", defaultMessage: "Rabid" },
  confiscatedRabid: { id: "home.clowderPeers.status.confiscatedRabid", defaultMessage: "Confiscated Rabid" },
  unknown: { id: "home.clowderPeers.status.unknown", defaultMessage: "Unknown" },
});

export const substituteMessages = defineMessages({
  label: { id: "home.clowderPeers.substitute.label", defaultMessage: "Substitute: {mint}" },
  loading: { id: "home.clowderPeers.substitute.loading", defaultMessage: "Loading substitute..." },
  noSubstitute: { id: "home.clowderPeers.substitute.noSubstitute", defaultMessage: "No substitute elected" },
  unknownNode: { id: "home.clowderPeers.substitute.unknownNode", defaultMessage: "Substitute unknown: node is not in topology" },
  unavailable: { id: "home.clowderPeers.substitute.unavailable", defaultMessage: "Substitute unavailable" },
});

export const peerMessages = defineMessages({
  mintUrl: { id: "home.clowderPeers.peer.mintUrl", defaultMessage: "Mint URL" },
  clowderUrl: { id: "home.clowderPeers.peer.clowderUrl", defaultMessage: "Clowder URL" },
  nodeId: { id: "home.clowderPeers.peer.nodeId", defaultMessage: "Node ID" },
  status: { id: "home.clowderPeers.peer.status", defaultMessage: "Status" },
  statusDetail: { id: "home.clowderPeers.peer.statusDetail", defaultMessage: "Status detail" },
  updatedAt: { id: "home.clowderPeers.peer.updatedAt", defaultMessage: "Updated at" },
  clowderInformation: { id: "home.clowderPeers.peer.clowderInformation", defaultMessage: "Clowder Information" },
  substituteInformation: { id: "home.clowderPeers.peer.substituteInformation", defaultMessage: "Substitute Information" },
});

export const statusDotClass: Record<StatusKind, string> = {
  online: "bg-emerald-500",
  interim: "bg-amber-500",
  offline: "bg-red-500",
  rabid: "bg-purple-500",
  confiscatedRabid: "bg-rose-700",
  unknown: "bg-muted-foreground",
};
