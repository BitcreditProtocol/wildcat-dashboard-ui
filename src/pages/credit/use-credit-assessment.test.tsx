import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCreditAssessmentForBill } from "./use-credit-assessment";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

type CreditAssessmentState = ReturnType<typeof useCreditAssessmentForBill>;

let root: Root | null = null;

function Harness({
  billId,
  mintQuoteId,
  onChange,
}: {
  billId: string;
  mintQuoteId: string;
  onChange: (state: CreditAssessmentState) => void;
}) {
  const state = useCreditAssessmentForBill(billId, mintQuoteId);
  useEffect(() => {
    onChange(state);
  }, [onChange, state]);
  return null;
}

async function renderHook(billId = "bill-a", mintQuoteId = "quote-a"): Promise<() => CreditAssessmentState | undefined> {
  const states: CreditAssessmentState[] = [];
  const onChange = (state: CreditAssessmentState) => states.push(state);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Harness billId={billId} mintQuoteId={mintQuoteId} onChange={onChange} />
      </QueryClientProvider>
    );
  });

  for (let index = 0; index < 5; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  return () => states[states.length - 1];
}

describe("useCreditAssessmentForBill", () => {
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("fails closed when an apparent offer has malformed governed terms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            cases: [
              {
                mintQuoteId: "quote-a",
                snapshot: { bill: { billId: "bill-a" }, caseId: "case-a" },
                result: { recommendation: "offer_available", terms: { discountedSat: 95 } },
                resultDigest: false,
              },
            ],
          })
        )
      )
    );

    const latest = await renderHook();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_100));
    });

    expect(latest()?.status).toBe("unavailable");
  });

  it("returns only an isolation issue bound to the exact bill and quote", async () => {
    const mintQuoteId = "da82cf03-b166-426d-b062-b3b9fbf4bd6f";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            schemaVersion: "ai-credit-workbench-decisions-v1",
            cases: [],
            issues: [
              {
                billId: "bill-a",
                caseId: "case-a",
                mintQuoteId,
                reasonCode: "bill_state_mismatch",
                detectedAt: "2026-09-02T09:30:00.000Z",
              },
              {
                billId: "bill-a",
                caseId: "case-b",
                mintQuoteId: "09724439-86df-4d57-a444-f65ca1e966bf",
                reasonCode: "mint_quote_changed",
                detectedAt: "2026-09-02T09:31:00.000Z",
              },
            ],
          })
        )
      )
    );

    const latest = await renderHook("bill-a", mintQuoteId);

    expect(latest()).toMatchObject({ status: "isolated", issue: { reasonCode: "bill_state_mismatch" } });
  });

  it("uses the narrow quote-less fallback only for missing legacy applicant authority", async () => {
    const mintQuoteId = "da82cf03-b166-426d-b062-b3b9fbf4bd6f";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            schemaVersion: "ai-credit-workbench-decisions-v1",
            cases: [],
            issues: [
              {
                billId: "bill-a",
                caseId: "case-wrong",
                mintQuoteId: null,
                reasonCode: "submitted_evidence_unavailable",
                detectedAt: "2026-09-02T09:30:00.000Z",
              },
              {
                billId: "bill-a",
                caseId: "case-legacy",
                mintQuoteId: null,
                reasonCode: "legacy_authority_missing",
                detectedAt: "2026-09-02T09:31:00.000Z",
              },
            ],
          })
        )
      )
    );

    const latest = await renderHook("bill-a", mintQuoteId);

    expect(latest()).toMatchObject({ status: "isolated", issue: { caseId: "case-legacy", reasonCode: "legacy_authority_missing" } });
  });
});
