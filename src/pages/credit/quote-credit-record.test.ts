import { describe, expect, it } from "vitest";
import type { DecisionCase } from "./decision-types";
import type { DecisionCasesResponse } from "./parse-decision-cases";
import { pendingQuoteOperatorIndex, selectQuoteCreditRecord } from "./quote-credit-record";

type Preparation = NonNullable<DecisionCase["casePreparation"]>;
const decisionCase = (billId: string, mintQuoteId: string, status: Preparation["status"]) =>
  ({
    mintQuoteId,
    assessmentCurrency: "current",
    snapshot: { bill: { billId }, contradictions: [] },
    result: { recommendation: "offer_available", verificationRequests: [], terms: null },
    casePreparation: {
      schemaVersion: "case-preparation-v1",
      status,
      approvable: status === "attention",
      reasons: [],
      automaticRequests: { policyVersion: "synthetic-agent-follow-up-v2", used: 0, budget: 3, consent: "absent", enabled: false },
      rounds: [],
      openObjectives: [],
    },
  }) as unknown as DecisionCase;

const data = (cases: DecisionCase[], issues: DecisionCasesResponse["issues"] = []): DecisionCasesResponse => ({ cases, issues });

describe("pendingQuoteOperatorIndex", () => {
  const now = Date.UTC(2026, 9, 3);

  it("leaves a quote with the operator when the case waits on them, and not when it waits on the applicant or agents", () => {
    const operatorActs = pendingQuoteOperatorIndex(
      data([
        decisionCase("bill-a", "quote-a", "attention"),
        decisionCase("bill-b", "quote-b", "awaiting_applicant"),
        decisionCase("bill-c", "quote-c", "preparing"),
      ]),
      now
    );

    expect(operatorActs("bill-a", "quote-a")).toBe(true);
    expect(operatorActs("bill-b", "quote-b")).toBe(false);
    expect(operatorActs("bill-c", "quote-c")).toBe(false);
  });

  it("treats a quote without a credit case as a manual decision for the operator", () => {
    const operatorActs = pendingQuoteOperatorIndex(data([decisionCase("bill-b", "quote-b", "awaiting_applicant")]), now);

    expect(operatorActs("bill-x", "quote-x")).toBe(true);
    // The same bill under another quote is a different case.
    expect(operatorActs("bill-b", "quote-other")).toBe(true);
  });

  it("gives an isolated submission to the operator even when an older case waits on the applicant", () => {
    const issue = {
      billId: "bill-b",
      mintQuoteId: "quote-b",
      reasonCode: "mint_quote_changed",
    } as unknown as DecisionCasesResponse["issues"][number];
    const operatorActs = pendingQuoteOperatorIndex(data([decisionCase("bill-b", "quote-b", "awaiting_applicant")], [issue]), now);

    expect(operatorActs("bill-b", "quote-b")).toBe(true);
  });

  it("keeps every pending quote visible while the credit adapter cannot be read", () => {
    expect(pendingQuoteOperatorIndex(undefined, now)("bill-b", "quote-b")).toBe(true);
  });

  it("picks the same case as the quote page", () => {
    const cases = [decisionCase("bill-b", "quote-b", "awaiting_applicant"), decisionCase("bill-b", "quote-b", "attention")];

    expect(selectQuoteCreditRecord(data(cases), "bill-b", "quote-b").decisionCase).toBe(cases[0]);
    expect(pendingQuoteOperatorIndex(data(cases), now)("bill-b", "quote-b")).toBe(false);
  });
});
