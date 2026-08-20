/** Records the governed operator judgement before the corresponding Mint action. */
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

export interface OperatorCapability {
  ready: true;
  operatorId: string;
  operatorRole: "reviewer" | "approver";
}

const FALLBACK_ERROR = "The AI Credit operator service rejected the request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const message = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  })
    .join("")
    .trim()
    .slice(0, 500);
  return message.length > 0 ? message : fallback;
}

async function responseError(response: Response): Promise<string> {
  const fallback = `${FALLBACK_ERROR} (${String(response.status)})`;
  const body: unknown = await response.json().catch(() => null);
  return safeMessage(isRecord(body) ? body.error : undefined, fallback);
}

export async function fetchOperatorCapability(): Promise<OperatorCapability> {
  let response: Response;
  try {
    response = await fetch("/api/ai-credit/operator-capability", { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("The AI Credit operator service is not reachable");
  }
  if (!response.ok) throw new Error(await responseError(response));

  const body: unknown = await response.json().catch(() => null);
  if (
    !isRecord(body) ||
    body.ready !== true ||
    typeof body.operatorId !== "string" ||
    body.operatorId.trim().length === 0 ||
    (body.operatorRole !== "reviewer" && body.operatorRole !== "approver")
  ) {
    throw new Error("The AI Credit operator capability response is invalid");
  }
  return { ready: true, operatorId: body.operatorId, operatorRole: body.operatorRole };
}

/** Client affordance only. The operator service remains authoritative for every command. */
export function operatorMayRecordDecision(capability: OperatorCapability | undefined, action: OperatorDecisionAction): boolean {
  if (capability === undefined) return false;
  return capability.operatorRole === "approver" || action === "return_for_information";
}

export async function recordOperatorDecision(
  input: OperatorDecisionInput,
  capability: OperatorCapability | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!operatorMayRecordDecision(capability, input.action) || capability === undefined) {
    return { ok: false, error: "A ready AI Credit operator capability is required for this action" };
  }
  try {
    const response = await fetch("/api/ai-credit/operator-decisions", {
      body: JSON.stringify({
        ...input,
        operatorId: capability.operatorId,
        operatorRole: capability.operatorRole,
        requiredItems: input.requiredItems ?? [],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { ok: true } : { ok: false, error: await responseError(response) };
  } catch {
    return { ok: false, error: "The AI Credit operator service is not reachable" };
  }
}
