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
  one: InformationNeed | InformationNeed[] = need,
  writable = false,
  submissionDigest = `sha256:${"5".repeat(64)}`,
  previous?: HTMLDivElement,
  messages: Record<string, string> = {},
  currentPreparedInputId?: string
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
                caseId: "case-1",
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
              informationNeeds: Array.isArray(one) ? one : [one],
              ...(currentPreparedInputId === undefined
                ? {}
                : {
                    applicantConfirmation: {
                      schemaVersion: "applicant-confirmation-summary-v1",
                      preparedInputId: currentPreparedInputId,
                      useOfFunds: "Harvest costs",
                      acceptor: "Buyer",
                      repaymentSource: "Coffee sales",
                      answersAffirmed: true,
                      recourseAcknowledged: true,
                    },
                  }),
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

function enterExhaustedReview(page: Element) {
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

it("shows governed response paths as localized operator copy instead of internal tokens", () => {
  const page = render({
    ...need,
    acceptableResponses: ["correct_answer", "upload_supporting_document", "explain_evidence_unavailable"],
  });
  expect(page.textContent).toContain("Correct the answer");
  expect(page.textContent).toContain("Upload supporting evidence");
  expect(page.textContent).toContain("Explain why evidence is unavailable");
  expect(page.textContent).not.toContain("correct_answer");
  expect(page.textContent).not.toContain("upload_supporting_document");
  expect(page.textContent).not.toContain("explain_evidence_unavailable");
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
  expect(page.textContent).toContain("Evidence review pending");
  expect(page.textContent).toContain("No buyer proof available");
  expect(page.querySelector("form")).toBeNull();
});

it("labels retained unresolved concerns without collapsing current, answered, open or reviewed rows", async () => {
  const earlierPreparedInputId = "22222222-2222-4222-8222-222222222222";
  const reviewed = (index: number, outcome: "resolved" | "exhausted"): InformationNeed => {
    const needId = `sha256:${String(index).repeat(64)}`;
    return {
      ...need,
      needId,
      preparedInputId: earlierPreparedInputId,
      status: outcome,
      review: {
        schemaVersion: "information-need-review-v2",
        needId,
        caseId: need.caseId,
        resultDigest: `sha256:${"2".repeat(64)}`,
        submissionDigest: `sha256:${"5".repeat(64)}`,
        outcome,
        basis: "The reviewer checked the submitted supporting records.",
        evidenceDigests: outcome === "resolved" ? [`sha256:${"4".repeat(64)}`] : [],
        reviewedAt: "2026-09-04T12:00:00Z",
        reviewedBy: "reviewer",
        reviewerRole: "reviewer",
      },
    };
  };
  const olderOpen = { ...need, needId: `sha256:${"4".repeat(64)}`, preparedInputId: earlierPreparedInputId, response: undefined };
  const needs = [
    need,
    { ...need, needId: `sha256:${"2".repeat(64)}`, response: undefined },
    { ...need, needId: `sha256:${"3".repeat(64)}`, preparedInputId: earlierPreparedInputId },
    olderOpen,
    reviewed(5, "exhausted"),
    reviewed(6, "resolved"),
  ];
  const page = render(needs, true, undefined, undefined, {}, need.preparedInputId);
  const rows = [...page.querySelectorAll("details")].filter((row) =>
    row.querySelector(":scope > summary")?.textContent?.startsWith(need.question)
  );
  expect(rows).toHaveLength(6);
  const reviewedGroup = [...page.querySelectorAll("details")].find(
    (row) => row.querySelector(":scope > summary")?.textContent === "Reviewed support (1)"
  );
  expect(reviewedGroup?.open).toBe(false);
  expect(reviewedGroup?.contains(rows[5] ?? null)).toBe(true);
  expect(reviewedGroup?.contains(rows[4] ?? null)).toBe(false); // Exhausted is still unresolved.
  expect(page.textContent).toContain("5 unresolved");
  expect(rows.map((row) => row.querySelector("summary")?.textContent?.includes("Earlier · unresolved"))).toEqual([
    false,
    false,
    true,
    true,
    true,
    false,
  ]);
  expect(rows.map((row) => row.querySelector("summary")?.textContent)).toEqual([
    `${need.question}Evidence review pending`,
    `${need.question}Response not recorded`,
    `${need.question}Earlier · unresolvedEvidence review pending`,
    `${need.question}Earlier · unresolvedResponse not recorded`,
    `${need.question}Earlier · unresolvedUnresolved`,
    `${need.question}Evidence reviewed`,
  ]);
  // Review outcomes keep their reviewer-facing wording, separate from the status vocabulary.
  expect([...(rows[0]?.querySelectorAll("option") ?? [])].map((option) => option.textContent)).toEqual([
    "Select outcome",
    "Support reviewed",
    "Unresolved · evidence unavailable",
  ]);
  expect(rows.map((row) => row.querySelector("blockquote")?.textContent)).toEqual(needs.map(() => "Coffee sales"));
  expect(rows.map((row) => row.querySelector("form") !== null)).toEqual([true, true, true, true, true, false]);
  const olderOpenRow = rows[3];
  if (olderOpenRow === undefined) throw new Error("Missing retained open question");
  enterExhaustedReview(olderOpenRow);
  vi.mocked(reviewInformationNeed).mockResolvedValue({ ok: false, errorCode: "review_rejected" });
  await act(async () => {
    olderOpenRow.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  expect(reviewInformationNeed).toHaveBeenCalledWith(
    expect.objectContaining({ needId: olderOpen.needId, submissionDigest: `sha256:${"5".repeat(64)}` }),
    expect.objectContaining({ operatorRole: "reviewer" })
  );
});

it("does not infer an earlier submission without the current prepared-input binding", () => {
  const page = render({ ...need, preparedInputId: "22222222-2222-4222-8222-222222222222" });
  expect(page.textContent).not.toContain("Earlier ·");
  expect(page.textContent).toContain("Evidence review pending");
});

it("localizes the retained-question label through the host catalog", () => {
  const page = render(
    need,
    false,
    undefined,
    undefined,
    { "credit.needs.status.earlierUnresolved": "Frühere Einreichung · ungeklärt" },
    "22222222-2222-4222-8222-222222222222"
  );
  expect(page.querySelector("summary")?.textContent).toContain("Frühere Einreichung · ungeklärt");
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
  expect(page.textContent).toContain("Recheck required");
  expect(page.textContent).not.toContain("Evidence reviewed");
  expect(page.textContent).not.toContain("Reviewed support (");
  expect(page.textContent).toContain("1 unresolved");
});
