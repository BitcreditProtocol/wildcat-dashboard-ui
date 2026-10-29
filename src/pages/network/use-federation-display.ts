import { useQuery } from "@tanstack/react-query";
import { readFederationStatus, type FederationStatus } from "@/pages/directory/federation-status";
import { federationHealthy } from "./network-copy";

export class IncompleteFederationRead extends Error {
  constructor(readonly observation: FederationStatus) {
    super("Incomplete federation observation");
  }
}
export function useFederationDisplay() {
  const query = useQuery({
    queryKey: ["ai-credit", "federation-display"],
    queryFn: async () => {
      const status = await readFederationStatus();
      if (!federationHealthy(status)) throw new IncompleteFederationRead(status);
      return status;
    },
    retry: 1,
    retryDelay: 500,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  // Only a read in which the Mint reports a peer problem is "degraded". A read that did not finish
  // says nothing about other Mints, and a routine background refresh keeps the last answer on screen.
  const phase: "checking" | "healthy" | "degraded" | "unknown" = query.isPending
    ? "checking"
    : query.error instanceof IncompleteFederationRead
      ? "degraded"
      : query.error
        ? "unknown"
        : "healthy";
  return {
    observation: query.error instanceof IncompleteFederationRead ? query.error.observation : query.data,
    phase,
    lastGoodAt: query.dataUpdatedAt || null,
  } as const;
}
