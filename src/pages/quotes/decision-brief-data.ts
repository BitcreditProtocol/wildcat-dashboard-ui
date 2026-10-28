import { normalizeIntelligenceSubject, type MintIntelligenceResponse } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "@/pages/credit/decision-types";
export function matchedBriefNotes(response: MintIntelligenceResponse, subjects: readonly string[]) {
  const terms = subjects.filter(Boolean).map(normalizeIntelligenceSubject);
  return response.notes.filter(
    (n) =>
      response.current.includes(n.id) &&
      (n.scope === "macro" ||
        terms.some(
          (text) =>
            text === normalizeIntelligenceSubject(n.subject) || text.split(/[\s_]+/u).includes(normalizeIntelligenceSubject(n.subject))
        ))
  );
}
/** No new policy evaluation: only a recorded failure or completed governed price establishes a gate result here. */
export function recordedGateStatus(one: DecisionCase, gate: string): "pass" | "fail" | "unknown" {
  if (one.result.assessmentTrace.some((t) => t.ruleId === gate && t.outcome === "fail")) return "fail";
  if (one.result.terms !== null) return "pass";
  return "unknown";
}
