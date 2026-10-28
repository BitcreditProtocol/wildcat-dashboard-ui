export type FinanceLockCode = "finance_lock_held_elsewhere" | "finance_lock_check_incomplete";

export function financeLockCode(value: unknown): FinanceLockCode | undefined {
  return value === "finance_lock_held_elsewhere" || value === "finance_lock_check_incomplete" ? value : undefined;
}

/** Only recognized typed 409s become finance-lock messages; upstream prose is not a code. */
export function financeLockConflictCode(status: number, body: unknown): FinanceLockCode | undefined {
  return status === 409 && typeof body === "object" && body !== null && "code" in body ? financeLockCode(body.code) : undefined;
}

export class FinanceLockConflictError extends Error {
  constructor(public readonly code: FinanceLockCode) {
    super(code);
  }
}
