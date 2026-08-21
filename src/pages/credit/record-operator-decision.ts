import { authenticatedFetch } from "@/lib/api-client";

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

export interface SignedOfferAuthorization {
  [key: string]: unknown;
  authorization: {
    schemaVersion: "credit-authorization-v7";
    keyId?: string;
    mintId?: string;
    mintQuoteId: string;
    billId?: string;
    action: "request_to_mint";
    expiresAt?: string;
    synthetic: true;
    terms: {
      discountedSat: string;
      offerExpiresOn: string;
    };
    [key: string]: unknown;
  };
  authorizationDigest: string;
  signatureAlgorithm: "Ed25519";
  signature: string;
}

export interface VerifiedAuthorizationReceipt {
  keyId: string;
  mintId: string;
  mintQuoteId: string;
  billId: string;
  action: "request_to_mint";
  expiresAt: string;
  authorizationDigest: string;
}

export interface DurableAuthorizationReceipt {
  operationId: string;
  status: string;
  completedAt: string;
  resultDigest: string;
  effectId: string;
  authorizationDigest: string;
  mintId: string;
  billId: string;
  action: "request_to_mint";
}

/** The operator API may return older envelopes; only expose a receipt when every displayed binding is present. */
export function verifiedAuthorizationReceiptOf(value: SignedOfferAuthorization): VerifiedAuthorizationReceipt | null {
  const { authorization } = value;
  if (
    typeof authorization.keyId !== "string" ||
    authorization.keyId.length === 0 ||
    typeof authorization.mintId !== "string" ||
    authorization.mintId.length === 0 ||
    typeof authorization.billId !== "string" ||
    authorization.billId.length === 0 ||
    typeof authorization.expiresAt !== "string" ||
    Number.isNaN(Date.parse(authorization.expiresAt))
  ) {
    return null;
  }

  return {
    keyId: authorization.keyId,
    mintId: authorization.mintId,
    mintQuoteId: authorization.mintQuoteId,
    billId: authorization.billId,
    action: authorization.action,
    expiresAt: authorization.expiresAt,
    authorizationDigest: value.authorizationDigest,
  };
}

export interface OperatorDecisionSuccess {
  ok: true;
  signedAuthorization?: SignedOfferAuthorization;
}

const FALLBACK_ERROR = "The AI Credit operator service rejected the request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parses the persisted Mint receipt without depending on a generated client that may lag the backend schema. */
export function durableAuthorizationReceiptFromQuote(
  value: unknown,
  expectedQuoteId: string,
  expectedBillId: string
): DurableAuthorizationReceipt | null {
  if (!isRecord(value) || !isRecord(value.credit_authorization_receipt)) return null;
  const receipt = value.credit_authorization_receipt;
  const digestPattern = /^sha256:[0-9a-f]{64}$/u;
  if (
    receipt.receiptVersion !== "credit-authorization-receipt-v1" ||
    typeof receipt.operationId !== "string" ||
    !digestPattern.test(receipt.operationId) ||
    typeof receipt.authorizationDigest !== "string" ||
    !digestPattern.test(receipt.authorizationDigest) ||
    typeof receipt.resultDigest !== "string" ||
    !digestPattern.test(receipt.resultDigest) ||
    typeof receipt.status !== "string" ||
    receipt.status.length === 0 ||
    typeof receipt.completedAt !== "string" ||
    Number.isNaN(Date.parse(receipt.completedAt)) ||
    receipt.effectId !== expectedQuoteId ||
    receipt.billId !== expectedBillId ||
    typeof receipt.mintId !== "string" ||
    receipt.mintId.length === 0 ||
    receipt.action !== "request_to_mint"
  ) {
    return null;
  }

  return {
    operationId: receipt.operationId,
    status: receipt.status,
    completedAt: receipt.completedAt,
    resultDigest: receipt.resultDigest,
    effectId: receipt.effectId,
    authorizationDigest: receipt.authorizationDigest,
    mintId: receipt.mintId,
    billId: receipt.billId,
    action: receipt.action,
  };
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

function isSignedOfferAuthorization(value: unknown): value is SignedOfferAuthorization {
  if (!isRecord(value) || !isRecord(value.authorization)) return false;
  const { authorization } = value;
  const { terms } = authorization;
  if (!isRecord(terms)) return false;
  const discountedSat = terms.discountedSat;
  const offerExpiresOn = terms.offerExpiresOn;
  if (
    authorization.schemaVersion !== "credit-authorization-v7" ||
    typeof authorization.mintQuoteId !== "string" ||
    authorization.mintQuoteId.length === 0 ||
    authorization.action !== "request_to_mint" ||
    authorization.synthetic !== true ||
    typeof discountedSat !== "string" ||
    !/^[1-9][0-9]*$/u.test(discountedSat) ||
    discountedSat.length > 16 ||
    BigInt(discountedSat) > BigInt(Number.MAX_SAFE_INTEGER) ||
    typeof offerExpiresOn !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(offerExpiresOn) ||
    Number.isNaN(Date.parse(`${offerExpiresOn}T23:59:59.999Z`)) ||
    typeof value.authorizationDigest !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(value.authorizationDigest) ||
    value.signatureAlgorithm !== "Ed25519" ||
    typeof value.signature !== "string" ||
    value.signature.length === 0
  ) {
    return false;
  }
  return true;
}

export async function fetchOperatorCapability(): Promise<OperatorCapability> {
  let response: Response;
  try {
    response = await authenticatedFetch("/api/ai-credit/operator-capability", { signal: AbortSignal.timeout(10_000) });
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
): Promise<OperatorDecisionSuccess | { ok: false; error: string }> {
  if (!operatorMayRecordDecision(capability, input.action) || capability === undefined) {
    return { ok: false, error: "A ready AI Credit operator capability is required for this action" };
  }
  try {
    const response = await authenticatedFetch("/api/ai-credit/operator-decisions", {
      body: JSON.stringify({
        ...input,
        requiredItems: input.requiredItems ?? [],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, error: await responseError(response) };
    const body: unknown = await response.json().catch(() => null);
    const offerDecision = input.action === "confirm_proposed_quote" || input.action === "propose_adjustment_and_requote";
    const carriesAuthorization = isRecord(body) && body.signedAuthorization !== undefined;
    const authorization = isRecord(body) && isSignedOfferAuthorization(body.signedAuthorization) ? body.signedAuthorization : undefined;
    if (offerDecision && authorization === undefined) {
      return { ok: false, error: "The AI Credit operator service returned an invalid offer authorization" };
    }
    if (!offerDecision && carriesAuthorization) {
      return { ok: false, error: "The AI Credit operator service signed a non-offer decision" };
    }
    return authorization === undefined ? { ok: true } : { ok: true, signedAuthorization: authorization };
  } catch {
    return { ok: false, error: "The AI Credit operator service is not reachable" };
  }
}
