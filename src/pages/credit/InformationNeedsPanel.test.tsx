import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { InformationNeed } from "@bitcredit/ai-credit-shared";
import { InformationNeedsPanel } from "./InformationNeedsPanel";
import { reviewInformationNeed } from "./record-operator-decision";

vi.mock("./record-operator-decision", () => ({ reviewInformationNeed: vi.fn() }));
let root: Root | undefined;
const need: InformationNeed = {
  schemaVersion: "information-need-v1",
  needId: `sha256:${"1".repeat(64)}`,
  caseId: "case-1",
  preparedInputId: "11111111-1111-4111-8111-111111111111",
  question: "What supports the sales?",
  objective: { kind: "sales_evidence", sources: [{ answerIndex: 0, quote: "Coffee sales" }] },
  response: "No buyer proof available",
  status: "open",
  reviewIsStale: false,
};
function render(
  one: InformationNeed = need,
  writable = false,
  submissionDigest = `sha256:${"5".repeat(64)}`,
  previous?: HTMLDivElement,
  messages: Record<string, string> = {}
) {
  const container = previous ?? document.createElement("div");
  if (previous === undefined) {
    document.body.append(container);
    root = createRoot(container);
  }
  act(() =>
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <IntlProvider locale="en" messages={messages}>
          <InformationNeedsPanel
            decisionCase={{
              snapshot: {
                bill: {
                  billId: "bill-1",
                  billStateDigest: `sha256:${"7".repeat(64)}`,
                  acceptanceState: "accepted",
                  holderRef: "holder-1",
                  acceptorRef: "acceptor-1",
                  faceValueSat: "8000000",
                  acceptedDate: "2026-09-01",
                  maturityDate: "2027-03-01",
                  alreadyFinanced: false,
                },
              },
              assessmentCurrency: "current",
              resultDigest: `sha256:${"2".repeat(64)}`,
              submissionDigest,
              informationNeeds: [one],
            }}
            capability={writable ? { ready: true, operatorId: "reviewer", operatorRole: "reviewer" } : undefined}
          />
        </IntlProvider>
      </QueryClientProvider>
    )
  );
  return container;
}
afterEach(() => {
  act(() => root?.unmount());
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function enterExhaustedReview(page: HTMLDivElement) {
  const select = page.querySelector("select");
  const textarea = page.querySelector("textarea");
  if (select === null || textarea === null) throw new Error("Missing review form");
  act(() => {
    select.value = "exhausted";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      textarea,
      "The supporting records are still unavailable for review."
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("discards a review draft when evidence changes without changing calculated terms", () => {
  const page = render(need, true);
  enterExhaustedReview(page);
  expect(page.querySelector("select")?.value).toBe("exhausted");
  render(need, true, `sha256:${"6".repeat(64)}`, page);
  expect(page.querySelector("select")?.value).toBe("");
  expect(page.querySelector("textarea")?.value).toBe("");
  expect(reviewInformationNeed).not.toHaveBeenCalled();
});

it("coalesces repeated submit events while the exact evidence review is in flight", async () => {
  const page = render(need, true);
  enterExhaustedReview(page);
  let finish: ((result: { ok: true }) => void) | undefined;
  vi.mocked(reviewInformationNeed).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  act(() => {
    page.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    page.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(reviewInformationNeed).toHaveBeenCalledOnce();
  await act(async () => {
    finish?.({ ok: true });
    await Promise.resolve();
  });
});

it("sends the displayed submission binding and exact prior review when appending a review", async () => {
  const prior = {
    schemaVersion: "information-need-review-v2" as const,
    needId: need.needId,
    caseId: need.caseId,
    resultDigest: `sha256:${"2".repeat(64)}`,
    submissionDigest: `sha256:${"5".repeat(64)}`,
    outcome: "exhausted" as const,
    basis: "The previous submission did not contain the requested records.",
    evidenceDigests: [],
    reviewedAt: "2026-09-04T12:00:00Z",
    reviewedBy: "reviewer",
    reviewerRole: "reviewer" as const,
  };
  const page = render({ ...need, review: prior, reviewIsStale: true }, true, `sha256:${"6".repeat(64)}`);
  enterExhaustedReview(page);
  vi.mocked(reviewInformationNeed).mockResolvedValue({ ok: false, errorCode: "review_rejected" });
  await act(async () => {
    page.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  expect(reviewInformationNeed).toHaveBeenCalledWith(
    expect.objectContaining({
      submissionDigest: `sha256:${"6".repeat(64)}`,
      expectedReview: prior,
      outcome: "exhausted",
    }),
    expect.objectContaining({ operatorId: "reviewer" })
  );
  expect(page.textContent).toContain("Review not accepted. Refresh the case");
});

it("discards a review draft when another reviewer replaces the prior review", () => {
  const page = render(need, true);
  enterExhaustedReview(page);
  render(
    {
      ...need,
      status: "exhausted",
      review: {
        schemaVersion: "information-need-review-v2",
        needId: need.needId,
        caseId: need.caseId,
        resultDigest: `sha256:${"2".repeat(64)}`,
        submissionDigest: `sha256:${"5".repeat(64)}`,
        outcome: "exhausted",
        basis: "Another reviewer could not obtain the necessary records.",
        evidenceDigests: [],
        reviewedAt: "2026-09-05T12:00:00Z",
        reviewedBy: "other-reviewer",
        reviewerRole: "reviewer",
      },
    },
    true,
    `sha256:${"5".repeat(64)}`,
    page
  );
  expect(page.querySelector("select")?.value).toBe("");
  expect(page.querySelector("textarea")?.value).toBe("");
});
it("shows answered questions as unverified and is read-only without a capability", () => {
  const page = render();
  expect(page.textContent).toContain("Answered · unverified");
  expect(page.textContent).toContain("No buyer proof available");
  expect(page.querySelector("form")).toBeNull();
});

it.each([
  ["reviewer_required", "credit.needs.error.reviewerRequired"],
  ["review_rejected", "credit.needs.error.rejected"],
  ["review_unconfirmed", "credit.needs.error.unconfirmed"],
] as const)("localizes %s through the host Intl catalog", async (errorCode, id) => {
  const page = render(need, true, undefined, undefined, { [id]: "Lokalisierte sichere Fehlermeldung" });
  enterExhaustedReview(page);
  vi.mocked(reviewInformationNeed).mockResolvedValue({ ok: false, errorCode });
  await act(async () => {
    page.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  expect(page.querySelector('[role="alert"]')?.textContent).toBe("Lokalisierte sichere Fehlermeldung");
  expect(page.querySelector("textarea")?.value).not.toBe("");
});
it("does not preselect a review outcome or enable an empty review", () => {
  const page = render(need, true);
  expect(page.querySelector("select")?.value).toBe("");
  expect(page.querySelector("select")?.labels?.[0]?.textContent).toBe("Review outcome");
  expect(page.querySelector("textarea")?.labels?.[0]?.textContent).toBe("Review basis");
  expect(page.querySelector("button")?.disabled).toBe(true);
});
it("makes stale reviews visibly open rather than carrying a green result forward", () => {
  const page = render({
    ...need,
    reviewIsStale: true,
    review: {
      schemaVersion: "information-need-review-v1",
      needId: need.needId,
      caseId: need.caseId,
      resultDigest: `sha256:${"3".repeat(64)}`,
      outcome: "resolved",
      basis: "Earlier evidence review basis",
      evidenceDigests: [`sha256:${"4".repeat(64)}`],
      reviewedAt: "2026-09-04T12:00:00Z",
      reviewedBy: "reviewer",
      reviewerRole: "reviewer",
    },
  });
  expect(page.textContent).toContain("Reopened · assessment changed");
  expect(page.textContent).not.toContain("Support reviewed");
});
