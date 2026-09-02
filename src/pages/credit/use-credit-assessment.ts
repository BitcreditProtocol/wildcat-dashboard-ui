import { useQuery } from "@tanstack/react-query";
import type { OperatorSubmittedCaseIssue } from "@bitcredit/ai-credit-shared";
import { authenticatedFetch } from "@/lib/api-client";
import type { DecisionCase } from "./decision-types";
import { parseDecisionCasesResponse, type DecisionCasesResponse } from "./parse-decision-cases";

/**
 * Stored and evaluated AI Credit decisions through the dashboard's authenticated BFF. This read
 * invokes no model; a submitted case may contain extraction produced earlier. A quote whose bill
 * has no decision simply has none — the hook returns undefined and the calling view renders nothing.
 */
export function useCreditAssessments() {
  return useQuery({
    queryKey: ["ai-credit", "decisions"],
    queryFn: async (): Promise<DecisionCasesResponse> => {
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

export type CreditAssessmentForBillState =
  | { status: "loading" }
  | { status: "unavailable"; error: Error }
  | { status: "absent" }
  | { status: "isolated"; issue: OperatorSubmittedCaseIssue }
  | { status: "assessed"; decisionCase: DecisionCase };

export function useCreditAssessmentForBill(billId: string | undefined, mintQuoteId: string | undefined): CreditAssessmentForBillState {
  const { data, isLoading, error } = useCreditAssessments();
  if (isLoading) return { status: "loading" };
  // Fail closed on the latest read even when React Query retains older data.
  if (error !== null) return { status: "unavailable", error };
  if (billId === undefined || mintQuoteId === undefined || data === undefined) return { status: "absent" };

  const issue = data.issues.find(
    (one) =>
      one.billId === billId &&
      (one.mintQuoteId === mintQuoteId || (one.mintQuoteId === null && one.reasonCode === "legacy_authority_missing"))
  );
  // A newly isolated submission invalidates any retained prior assessment for the same quote.
  if (issue !== undefined) return { status: "isolated", issue };

  const decisionCase = data.cases.find((one) => one.snapshot.bill?.billId === billId && one.mintQuoteId === mintQuoteId);
  return decisionCase === undefined ? { status: "absent" } : { status: "assessed", decisionCase };
}
