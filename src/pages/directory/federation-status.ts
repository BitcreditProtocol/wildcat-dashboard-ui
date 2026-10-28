import { operatorFederationStatusSchema, type OperatorFederationStatus } from "@bitcredit/ai-credit-shared";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { MintCheckError } from "@/pages/mint-checks/api";
export type FederationStatus = OperatorFederationStatus;
export const parseFederationStatus = (value: unknown): FederationStatus => operatorFederationStatusSchema.parse(value);

export async function readFederationStatus(): Promise<FederationStatus> {
  const response = await authenticatedFetch("/api/ai-credit/operator-federation-status", { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new MintCheckError(response.status);
  return parseFederationStatus(await response.json());
}

export function useFederationStatus() {
  return useQuery({ queryKey: ["ai-credit", "federation-status"], queryFn: readFederationStatus, refetchInterval: 30_000, retry: false });
}
