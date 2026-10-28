import { describe, expect, it } from "vitest";
import { financeLockConflictCode } from "./finance-lock-errors";

describe("finance lock API errors", () => {
  it.each(["finance_lock_held_elsewhere", "finance_lock_check_incomplete"])("accepts typed 409 %s", (code) => {
    expect(financeLockConflictCode(409, { code, error: "arbitrary prose" })).toBe(code);
  });
  it.each([
    [500, { code: "finance_lock_held_elsewhere" }],
    [409, { error: "finance_lock_held_elsewhere" }],
    [409, { code: "some_unknown_error" }],
    [409, null],
    [409, "finance_lock_check_incomplete"],
  ])("does not misclassify HTTP %s body %j", (status, body) => {
    expect(financeLockConflictCode(status, body)).toBeUndefined();
  });
});
