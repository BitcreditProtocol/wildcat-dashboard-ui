import { describe, expect, it } from "vitest";
import { usesSyntheticData, type DecisionCase } from "./decision-types";

const caseWith = (snapshot: boolean | undefined, policyPack: boolean | undefined) =>
  ({ snapshot: { isSynthetic: snapshot }, policyPack: { isSynthetic: policyPack } }) as unknown as Pick<
    DecisionCase,
    "snapshot" | "policyPack"
  >;

describe("usesSyntheticData", () => {
  it("reads a case as real only when its snapshot and policy pack both say so", () => {
    expect(usesSyntheticData(caseWith(false, false))).toBe(false);
    expect(usesSyntheticData(caseWith(true, false))).toBe(true);
    expect(usesSyntheticData(caseWith(false, true))).toBe(true);
  });

  it("never reads a missing flag as real", () => {
    expect(usesSyntheticData(caseWith(false, undefined))).toBe(true);
    expect(usesSyntheticData(caseWith(undefined, false))).toBe(true);
  });
});
