import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import type { DecisionCase } from "./decision-types";
import { parseDecisionCasesResponse } from "./parse-decision-cases";

/**
 * Stored and evaluated AI Credit decisions through the dashboard's authenticated BFF. This read
 * invokes no model; a submitted case may contain extraction produced earlier. A quote whose bill
 * has no decision simply has none — the hook returns undefined and the calling view renders nothing.
 */
export function useCreditAssessments() {
  return useQuery({
    queryKey: ["ai-credit", "decisions"],
    queryFn: async (): Promise<{ cases: DecisionCase[] }> => {
      const response = await authenticatedFetch("/api/ai-credit/workbench-decisions");
      if (!response.ok) throw new Error(`Credit adapter responded ${response.status}`);
      return parseDecisionCasesResponse(await response.json());
    },
    staleTime: 60_000,
    // Applications and verification replacements arrive from the borrower app. Poll while this
    // operator view is mounted so an absent or blocked case does not remain stale until refocus.
    refetchInterval: 10_000,
    retry: 1,
  });
}

export function useCreditAssessmentForBill(
  billId: string | undefined,
  mintQuoteId: string | undefined
): {
  decisionCase: DecisionCase | undefined;
  isLoading: boolean;
  error: Error | null;
  /** True when the adapter answered but holds no decision for this bill. */
  isAbsent: boolean;
  /** True when the latest adapter read failed, even if React Query still has stale data. */
  isUnavailable: boolean;
} {
  const { data, isLoading, error } = useCreditAssessments();
  const decisionCase =
    error !== null || billId === undefined || mintQuoteId === undefined
      ? undefined
      : data?.cases.find((one) => one.snapshot.bill?.billId === billId && one.mintQuoteId === mintQuoteId);
  return {
    decisionCase,
    isLoading,
    error,
    isAbsent: error === null && data !== undefined && decisionCase === undefined,
    isUnavailable: error !== null,
  };
}
