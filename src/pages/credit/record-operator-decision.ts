import keycloak from "@/keycloak";
import { env } from "@/lib/env";

/**
 * Records the operator's judgement with the AI Credit adapter when they act on a quote.
 *
 * The Mint's own Offer and Deny still happen on the Mint — this does not stand in for them. What
 * it adds is the governed record the PRD requires behind them: who decided, what they chose, and
 * why, pinned by the adapter to the exact snapshot and engine result they were shown. Without it
 * the button press is the only trace, and a button press is not a reason.
 *
 * The caller must await success before sending the corresponding Mint action. Otherwise a
 * rejected governed requote would still become an offer through the ordinary quote endpoint.
 */
export type OperatorDecisionAction =
  | "confirm_proposed_quote"
  | "confirm_no_current_product_fit"
  | "decline_application"
  | "propose_adjustment_and_requote"
  | "return_for_information";

export interface OperatorDecisionInput {
  billId: string;
  caseId: string;
  decisionResultDigest: string;
  action: OperatorDecisionAction;
  /** Required for an adjustment: what the operator is offering for the whole bill, in satoshis. */
  discountedSat?: string;
  reasonCode: string;
  writtenBasis: string;
  requiredItems?: string[];
}

type OperatorRole = "approver";

function authenticatedOperator(): { operatorId: string; operatorRole: OperatorRole } | null {
  // The mock stack has no Keycloak by design. This identity is synthetic test attribution only;
  // deployed builds must derive attribution from authenticated claims below.
  if (env.apiMocksEnabled) return { operatorId: "synthetic-dashboard-operator", operatorRole: "approver" };
  // A live token is still required as evidence of an authenticated session — it is simply never
  // sent onward, because the prototype adapter has no way to verify it and no need for it.
  if (!keycloak.authenticated || keycloak.subject === undefined || keycloak.token === undefined) return null;
  const roles = keycloak.realmAccess?.roles ?? [];
  const operatorRole = roles.includes("approver") ? "approver" : undefined;
  if (operatorRole === undefined) return null;
  return { operatorId: keycloak.subject, operatorRole };
}

/** Mirrors the client-side role gate in action controls; the server remains authoritative. */
export function operatorMayRecordDecision(action: OperatorDecisionAction): boolean {
  void action;
  return authenticatedOperator() !== null;
}

export async function recordOperatorDecision(input: OperatorDecisionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const operator = authenticatedOperator();
  if (operator === null) {
    return { ok: false, error: "An authenticated AI Credit operator role is required" };
  }
  try {
    const response = await fetch("/api/ai-credit/operator-decisions", {
      body: JSON.stringify({
        ...input,
        operatorId: operator.operatorId,
        operatorRole: operator.operatorRole,
        requiredItems: input.requiredItems ?? [],
      }),
      // No bearer token: the prototype adapter neither verifies one nor needs one, and a live
      // Keycloak JWT sent to an unauthenticated local process is a credential given away for
      // nothing. The gate above still decides whether this call happens at all. When the adapter
      // grows real authentication, the token travels with that — not ahead of it.
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? `Credit adapter responded ${String(response.status)}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "The AI Credit adapter is not reachable" };
  }
}
