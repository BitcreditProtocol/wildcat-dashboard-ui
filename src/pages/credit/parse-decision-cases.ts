import { mintQuoteDenialStatusSchema, operatorWorkbenchDecisionsResponseSchema } from "@bitcredit/ai-credit-shared";
import type { OperatorSubmittedCaseIssue } from "@bitcredit/ai-credit-shared";
import type { DecisionCase, MintQuoteDenialStatus } from "./decision-types";

export interface DecisionCasesResponse {
  cases: DecisionCase[];
  issues: OperatorSubmittedCaseIssue[];
}

export function parseMintDenialStatus(
  value: unknown,
  expected: { caseId: string; mintQuoteId: string; billId: string; mintId: string }
): MintQuoteDenialStatus | undefined {
  if (value === undefined) return undefined;
  const parsed = mintQuoteDenialStatusSchema.safeParse(value);
  if (!parsed.success) throw new Error("AI Credit returned an invalid Mint denial status");
  const denial = parsed.data;
  if (denial.state === "completed") {
    const { receipt } = denial;
    if (
      receipt.operationId !== denial.operationId ||
      receipt.caseId !== expected.caseId ||
      receipt.mintId !== expected.mintId ||
      receipt.billId !== expected.billId ||
      receipt.effectId !== expected.mintQuoteId
    ) {
      throw new Error("AI Credit returned an invalid Mint denial status");
    }
  }
  return denial;
}

export function parseDecisionCasesResponse(value: unknown): DecisionCasesResponse {
  const parsed = operatorWorkbenchDecisionsResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error("AI Credit returned an invalid governed decision response");
  return { cases: parsed.data.cases, issues: parsed.data.issues };
}
