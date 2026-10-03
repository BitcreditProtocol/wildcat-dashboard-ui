import { caseNextStep, caseNextStepOwner, type OperatorSubmittedCaseIssue } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "./decision-types";
import type { DecisionCasesResponse } from "./parse-decision-cases";

export interface QuoteCreditRecord {
  /** A newly isolated submission for this quote; it invalidates any retained assessment. */
  scopedIssue: OperatorSubmittedCaseIssue | undefined;
  decisionCase: DecisionCase | undefined;
}

/** The credit record of one quote: the quote page and the inbox both pick it this way. */
export function selectQuoteCreditRecord(
  data: DecisionCasesResponse | undefined,
  billId: string | undefined,
  mintQuoteId: string | undefined
): QuoteCreditRecord {
  const scopedIssue = data?.issues.find(
    (one) =>
      one.billId === billId &&
      (one.mintQuoteId === mintQuoteId || (one.mintQuoteId === null && one.reasonCode === "legacy_authority_missing"))
  );
  const decisionCase =
    billId === undefined || mintQuoteId === undefined || scopedIssue !== undefined
      ? undefined
      : data?.cases.find((one) => one.snapshot.bill?.billId === billId && one.mintQuoteId === mintQuoteId);
  return { scopedIssue, decisionCase };
}

/**
 * Whether a pending quote waits on the Mint operator, for a whole inbox at once. Cases and issues
 * are indexed once, so a long list costs one pass rather than a search per row.
 *
 * Fails visible: a quote with no credit case is a manual decision, an isolated submission needs the
 * operator to confirm the holder, and an unreadable adapter leaves every pending quote with the operator.
 */
export function pendingQuoteOperatorIndex(data: DecisionCasesResponse | undefined, now: number) {
  const key = (billId: string, quoteId: string | null) => `${billId}\u0000${quoteId ?? ""}`;
  const issues = new Set(data?.issues.map((one) => key(one.billId, one.mintQuoteId)) ?? []);
  const legacyIssueBills = new Set(
    data?.issues.filter((one) => one.mintQuoteId === null && one.reasonCode === "legacy_authority_missing").map((one) => one.billId) ?? []
  );
  const cases = new Map<string, DecisionCase>();
  for (const one of data?.cases ?? []) {
    const billId = one.snapshot.bill?.billId;
    // The first match wins, as in selectQuoteCreditRecord.
    if (billId !== undefined && one.mintQuoteId !== undefined && !cases.has(key(billId, one.mintQuoteId))) {
      cases.set(key(billId, one.mintQuoteId), one);
    }
  }
  return (billId: string | undefined, quoteId: string): boolean => {
    if (data === undefined || billId === undefined) return true;
    if (issues.has(key(billId, quoteId)) || legacyIssueBills.has(billId)) return true;
    const decisionCase = cases.get(key(billId, quoteId));
    if (decisionCase === undefined) return true;
    return caseNextStepOwner(caseNextStep(decisionCase, { quoteId, now })) === "operator";
  };
}
