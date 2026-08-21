import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCreditAssessmentForBill } from "./use-credit-assessment";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

type CreditAssessmentState = ReturnType<typeof useCreditAssessmentForBill>;

let root: Root | null = null;

function Harness({ onChange }: { onChange: (state: CreditAssessmentState) => void }) {
  const state = useCreditAssessmentForBill("bill-a", "quote-a");
  useEffect(() => {
    onChange(state);
  }, [onChange, state]);
  return null;
}

async function renderHook(): Promise<() => CreditAssessmentState | undefined> {
  const states: CreditAssessmentState[] = [];
  const onChange = (state: CreditAssessmentState) => states.push(state);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Harness onChange={onChange} />
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

    expect(latest()?.isLoading).toBe(false);
    expect(latest()?.decisionCase).toBeUndefined();
    expect(latest()?.isUnavailable).toBe(true);
  });
});
