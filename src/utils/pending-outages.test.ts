import { describe, expect, it } from "vitest";
import type { PendingOutage } from "@/generated/client/types.gen";
import { outageKey, sortPendingOutages, totalPendingOutages } from "./pending-outages";

function outage(overrides: Partial<PendingOutage> = {}): PendingOutage {
  return {
    evidence_digest: [1, 2, 3],
    substitute: "02ab",
    betas_holding: 1,
    pending_exchanges: 1,
    pending_amount: 1000,
    ...overrides,
  };
}

describe("pending-outages", () => {
  describe("outageKey", () => {
    it("hex-encodes the evidence digest, padding single-digit bytes", () => {
      expect(outageKey(outage({ evidence_digest: [0, 12, 34, 255] }))).toBe("000c22ff");
    });

    it("tells two outages apart", () => {
      expect(outageKey(outage({ evidence_digest: [1, 2] }))).not.toBe(outageKey(outage({ evidence_digest: [2, 1] })));
    });
  });

  describe("sortPendingOutages", () => {
    it("puts the most widely held outage first, the one substitute_beta mirrors", () => {
      const sorted = sortPendingOutages([
        outage({ evidence_digest: [1], betas_holding: 1, substitute: "02aa" }),
        outage({ evidence_digest: [2], betas_holding: 3, substitute: "02bb" }),
        outage({ evidence_digest: [3], betas_holding: 2, substitute: "02cc" }),
      ]);

      expect(sorted.map((entry) => entry.substitute)).toEqual(["02bb", "02cc", "02aa"]);
    });

    it("leaves the input untouched", () => {
      const outages = [outage({ betas_holding: 1 }), outage({ betas_holding: 2 })];

      sortPendingOutages(outages);

      expect(outages.map((entry) => entry.betas_holding)).toEqual([1, 2]);
    });
  });

  describe("totalPendingOutages", () => {
    it("adds up the swaps and their amounts", () => {
      const totals = totalPendingOutages([
        outage({ pending_exchanges: 3, pending_amount: 15_000 }),
        outage({ pending_exchanges: 2, pending_amount: 500 }),
      ]);

      expect(totals).toEqual({ pendingExchanges: 5, pendingAmount: 15_500 });
    });

    it("is zero without outages", () => {
      expect(totalPendingOutages([])).toEqual({ pendingExchanges: 0, pendingAmount: 0 });
    });
  });
});
