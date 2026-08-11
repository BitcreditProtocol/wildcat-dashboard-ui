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

type OperatorRole = "reviewer" | "approver";

function authenticatedOperator(action: OperatorDecisionAction): { operatorId: string; operatorRole: OperatorRole; token?: string } | null {
  // The mock stack has no Keycloak by design. This identity is synthetic test attribution only;
  // deployed builds must derive attribution from authenticated claims below.
  if (env.apiMocksEnabled) return { operatorId: "synthetic-dashboard-operator", operatorRole: "approver" };
  if (!keycloak.authenticated || keycloak.subject === undefined || keycloak.token === undefined) return null;
  const roles = keycloak.realmAccess?.roles ?? [];
  const operatorRole = roles.includes("approver") ? "approver" : roles.includes("reviewer") ? "reviewer" : undefined;
  if (operatorRole === undefined || (action !== "return_for_information" && operatorRole !== "approver")) return null;
  return { operatorId: keycloak.subject, operatorRole, token: keycloak.token };
}

export async function recordOperatorDecision(input: OperatorDecisionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const operator = authenticatedOperator(input.action);
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
      headers: {
        ...(operator.token === undefined ? {} : { authorization: `Bearer ${operator.token}` }),
        "content-type": "application/json",
      },
      method: "POST",
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
