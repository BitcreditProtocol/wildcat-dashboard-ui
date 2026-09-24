import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, expect, it } from "vitest";
import type { InvestigationNeedSelection } from "@bitcredit/ai-credit-shared";
import { ProposedFollowUps } from "./ProposedFollowUps";

let root: Root | undefined;
const proposal = {
  runId: "22222222-2222-4222-8222-222222222222",
  needIndex: 0,
  need: { kind: "cost_breakdown" as const, sources: [{ answerIndex: 0, quote: '<img src="bad" onerror="steal()">' }] },
};
interface RenderOptions {
  selectedNeeds?: InvestigationNeedSelection[];
  selectionDisabled?: boolean;
  onChange?: (needs: InvestigationNeedSelection[]) => void;
}
function render(options: RenderOptions = {}, proposals = [proposal]) {
  const page = document.createElement("div");
  document.body.append(page);
  root = createRoot(page);
  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <ProposedFollowUps
          proposals={proposals}
          selectedNeeds={options.selectedNeeds ?? []}
          onSelectedNeedsChange={options.onChange ?? (() => undefined)}
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

it("renders nothing when no proposal is selectable", () => {
  expect(render({}, []).textContent).toBe("");
});

it("labels model authorship, escapes exact applicant quotes and selects by run and need index", () => {
  let selected: InvestigationNeedSelection[] = [];
  const page = render({ onChange: (value) => (selected = value) });
  expect(page.querySelector("#proposed-follow-ups")).not.toBeNull();
  expect(page.textContent).toContain("Answer reviewer · model proposal · not sent to the applicant");
  expect(page.textContent).toContain("Support the cost breakdown");
  expect(page.querySelector("img")).toBeNull();
  expect(page.querySelector("blockquote")?.textContent).toContain("<img");
  const checkbox = page.querySelector<HTMLInputElement>('input[type="checkbox"]');
  act(() => checkbox?.click());
  expect(selected).toEqual([{ runId: proposal.runId, needIndex: 0 }]);
});

it("keeps selection disabled when the host withholds approver authority", () => {
  const page = render({ selectionDisabled: true });
  expect(page.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(true);
});

it("previews governed admission guidance with human-readable response paths", () => {
  const page = render({ selectedNeeds: [{ runId: proposal.runId, needIndex: 0 }] });
  expect(page.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  expect(page.textContent).toContain("Applicant request preview");
  expect(page.textContent).toContain("Establish the composition of the applicant's stated costs.");
  expect(page.textContent).toContain("Correct the answer");
  expect(page.textContent).toContain("Upload supporting evidence");
  expect(page.textContent).toContain("Explain why evidence is unavailable");
  expect(page.textContent).toContain("A reviewer reconciles the cost breakdown to cited evidence");
  expect(page.textContent).not.toContain("correct_answer");
  expect(page.textContent).not.toContain("upload_supporting_document");
  expect(page.textContent).not.toContain("explain_evidence_unavailable");
});

it("does not preview a stale selection that is no longer a selectable proposal", () => {
  const page = render({ selectedNeeds: [{ runId: "33333333-3333-4333-8333-333333333333", needIndex: 0 }] });
  expect(page.textContent).not.toContain("Applicant request preview");
});
