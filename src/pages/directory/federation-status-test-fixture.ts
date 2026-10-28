import { directoryNetworkFixture, mintKey, relayCoverage } from "@/pages/credit/network-controls-test-fixtures";
import type { FederationStatus } from "./federation-status";

export function federationStatusFixture(): FederationStatus {
  const directory = directoryNetworkFixture();
  if (!directory.publicCoverage || !directory.publicSync) throw new Error("Missing directory fixture");
  return {
    enabled: true,
    descriptor: {
      schema: "mint-federation-descriptor-v1",
      network: "regtest",
      pubkey: "a".repeat(64),
      relays: ["ws://mint-a.test:8080"],
      operations: ["bill_status"],
    },
    descriptorDigest: "d".repeat(64),
    peers: [{ label: "Synthetic Mint B", pubkey: mintKey, relays: [relayCoverage.relay] }],
    directory: directory.publicSync,
    relays: directory.publicCoverage,
    inbox: [{ ...relayCoverage, reachable: false, eose: false, error: "inbox_timeout" }],
  };
}
