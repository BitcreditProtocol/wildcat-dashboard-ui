import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, expect, it } from "vitest";
import { caseInvestigationRunSchema } from "@bitcredit/ai-credit-shared";
import { CaseInvestigationPanel } from "./CaseInvestigationPanel";

let root: Root | undefined;
const run = caseInvestigationRunSchema.parse({
  schemaVersion: "case-investigation-run-v1",
  runId: "22222222-2222-4222-8222-222222222222",
  caseId: "case-1",
  preparedInputId: "11111111-1111-4111-8111-111111111111",
  submissionDigest: `sha256:${"a".repeat(64)}`,
  resultDigest: `sha256:${"b".repeat(64)}`,
  modelId: "test-reviewer",
  promptVersion: "case-answer-review-v1",
  status: "completed",
  startedAt: "2026-09-05T12:00:00Z",
  finishedAt: "2026-09-05T12:00:20Z",
  stoppingReason: "review_completed",
  needs: [{ kind: "cost_breakdown", sources: [{ answerIndex: 0, quote: '<img src="bad" onerror="steal()">' }] }],
});
function render(
  decisionCase: Parameters<typeof CaseInvestigationPanel>[0]["decisionCase"],
  options: Partial<Omit<Parameters<typeof CaseInvestigationPanel>[0], "decisionCase">> = {}
) {
  const page = document.createElement("div");
  document.body.append(page);
  root = createRoot(page);
  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <CaseInvestigationPanel
          decisionCase={decisionCase}
          selectedNeeds={options.selectedNeeds ?? []}
          onSelectedNeedsChange={options.onSelectedNeedsChange ?? (() => undefined)}
          selectionDisabled={options.selectionDisabled ?? false}
        />
      </IntlProvider>
    );
  });
  return page;
}
afterEach(() => {
  act(() => root?.unmount());
  document.body.replaceChildren();
});
it("does not manufacture agent work for cases without receipts", () => {
  const page = render(undefined);
  expect(page.textContent).toContain("No optional answer review");
  expect(page.querySelectorAll("article")).toHaveLength(0);
});
it("shows actual source-bound proposals, escapes source content and links to the real conversation", () => {
  const page = render({
    resultDigest: run.resultDigest,
    submissionDigest: run.submissionDigest,
    caseInvestigation: { status: "completed", runs: [run] },
  });
  expect(page.textContent).toContain("Proposed follow-up");
  expect(page.textContent).toContain("no claim verification");
  expect(page.textContent).not.toContain("Previous input");
  expect(page.querySelector("img")).toBeNull();
  expect(page.querySelector("blockquote")?.textContent).toContain("<img");
  expect(page.querySelector('a[href="#case-conversation"]')).not.toBeNull();
});
it("lets an authorized host select a current proposal without turning model prose into a request", () => {
  let selected: Parameters<typeof CaseInvestigationPanel>[0]["selectedNeeds"] = [];
  const page = render(
    {
      resultDigest: run.resultDigest,
      submissionDigest: run.submissionDigest,
      caseInvestigation: { status: "completed", runs: [run] },
    },
    { onSelectedNeedsChange: (value) => (selected = value) }
  );
  const checkbox = page.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(checkbox).not.toBeNull();
  act(() => checkbox?.click());
  expect(selected).toEqual([{ runId: run.runId, needIndex: 0 }]);
  expect(page.querySelector("img")).toBeNull();
});
it("marks old findings as previous input and does not imply an interrupted run succeeded", () => {
  const stopped = { ...run, status: "interrupted" as const, needs: [], stoppingReason: "interrupted" as const };
  const page = render({
    resultDigest: run.resultDigest,
    submissionDigest: `sha256:${"c".repeat(64)}`,
    caseInvestigation: { status: "stopped", runs: [stopped] },
  });
  expect(page.textContent).toContain("Previous input");
  expect(page.textContent).toContain("Interrupted");
  expect(page.textContent).not.toContain("No additional question proposed");
});
