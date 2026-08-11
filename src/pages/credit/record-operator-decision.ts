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
export type OperatorDecisionAction = "confirm_proposed_quote" | "propose_adjustment_and_requote" | "return_for_information";

export interface OperatorDecisionInput {
  billId: string;
  action: OperatorDecisionAction;
  /** Required for an adjustment: what the operator is offering for the whole bill, in satoshis. */
  discountedSat?: string;
  reasonCode: string;
  writtenBasis: string;
  requiredItems?: string[];
}

/** Until the dashboard has a signed-in operator identity to read, the decision is attributed here. */
const OPERATOR_ID = "wildcat-dashboard-operator";

export async function recordOperatorDecision(input: OperatorDecisionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/ai-credit/operator-decisions", {
      body: JSON.stringify({
        ...input,
        operatorId: OPERATOR_ID,
        operatorRole: "approver",
        requiredItems: input.requiredItems ?? [],
      }),
      headers: { "content-type": "application/json" },
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
