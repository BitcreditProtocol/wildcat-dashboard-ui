import {
  directorySyncStatusSchema,
  federationHexSchema,
  federationNetworkSchema,
  federationPeersSchema,
  federationRelayCoverageSchema,
  federationRelayUrlSchema,
  publicDirectoryCoverageSchema,
  type ParticipantDirectoryResponse,
  type FederationPeer,
  type FederationNetwork,
  type RelayCoverage,
} from "@bitcredit/ai-credit-shared";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { MintCheckError } from "@/pages/mint-checks/api";

export interface FederationStatus {
  enabled: true;
  descriptor: {
    schema: "mint-federation-descriptor-v1";
    network: FederationNetwork;
    pubkey: string;
    relays: string[];
    operations: string[];
  };
  descriptorDigest: string;
  peers: FederationPeer[];
  directory: NonNullable<ParticipantDirectoryResponse["publicSync"]>;
  relays: NonNullable<ParticipantDirectoryResponse["publicCoverage"]>;
  inbox: RelayCoverage[];
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid federation status");
  return Object.fromEntries(Object.entries(value));
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid federation status");
  return value;
}

/** The endpoint has no shared envelope schema yet. Validate and select public fields only. */
export function parseFederationStatus(value: unknown): FederationStatus {
  const status = object(value);
  const descriptor = object(status.descriptor);
  if (status.enabled !== true || descriptor.schema !== "mint-federation-descriptor-v1") throw new Error("Invalid federation status");
  const operations = array(descriptor.operations).map((operation) => {
    if (operation !== "bill_status") throw new Error("Invalid federation operation");
    return operation;
  });
  return {
    enabled: true,
    descriptor: {
      schema: "mint-federation-descriptor-v1",
      network: federationNetworkSchema.parse(descriptor.network),
      pubkey: federationHexSchema.parse(descriptor.pubkey),
      relays: array(descriptor.relays).map((relay) => federationRelayUrlSchema.parse(relay)),
      operations,
    },
    descriptorDigest: federationHexSchema.parse(status.descriptorDigest),
    peers: federationPeersSchema.parse(status.peers),
    directory: directorySyncStatusSchema.parse(status.directory),
    relays: publicDirectoryCoverageSchema.parse(status.relays),
    inbox: array(status.inbox).map((entry) => federationRelayCoverageSchema.parse(entry)),
  };
}

export async function readFederationStatus(): Promise<FederationStatus> {
  const response = await authenticatedFetch("/api/ai-credit/federation/status", { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new MintCheckError(response.status);
  return parseFederationStatus(await response.json());
}

export function useFederationStatus() {
  return useQuery({ queryKey: ["ai-credit", "federation-status"], queryFn: readFederationStatus, refetchInterval: 30_000, retry: false });
}
