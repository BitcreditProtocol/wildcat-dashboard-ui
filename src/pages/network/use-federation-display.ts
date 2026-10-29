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
  return {
    observation: query.error instanceof IncompleteFederationRead ? query.error.observation : query.data,
    phase: query.isFetching || query.isPending ? "checking" : query.error ? "degraded" : "healthy",
    lastGoodAt: query.dataUpdatedAt || null,
  } as const;
}
