import { useQuery } from "@tanstack/react-query";
import { fetchOperatorCapability } from "./record-operator-decision";

export function useOperatorCapability() {
  const query = useQuery({
    queryKey: ["ai-credit", "operator-capability"],
    queryFn: fetchOperatorCapability,
    retry: false,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  return {
    capability: query.error === null ? query.data : undefined,
    error: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isLoading,
  };
}
