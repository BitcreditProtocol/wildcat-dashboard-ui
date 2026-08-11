/**
 * Records the operator's judgement with the AI Credit adapter when they act on a quote.
 *
 * The Mint's own Offer and Deny still happen on the Mint — this does not stand in for them. What
 * it adds is the governed record the PRD requires behind them: who decided, what they chose, and
 * why, pinned by the adapter to the exact snapshot and engine result they were shown. Without it
 * the button press is the only trace, and a button press is not a reason.
 *
 * Fail-closed by design. Where an AI Credit assessment exists, this record is the only trace of the
 * human judgement behind the offer, so the caller holds the Mint's offer until it succeeds and shows
 * the operator a retryable error if it does not. It was best-effort, which meant a quiet console
 * warning could be the whole difference between a governed decision and an unexplained offer.
 * Recording is replay-tolerant on the adapter side, so retrying the same judgement is safe; a bill
 * with no assessment never reaches here and the Mint flow is unchanged for it.
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

export async function recordOperatorDecision(input: OperatorDecisionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/ai-credit/operator-decisions", {
      body: JSON.stringify({
        ...input,
        requiredItems: input.requiredItems ?? [],
      }),
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
