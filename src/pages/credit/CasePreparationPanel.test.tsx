import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { CasePreparationPanel } from "./CasePreparationPanel";
import type { DecisionCase } from "./decision-types";

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});
function render(preparation: DecisionCase["casePreparation"]) {
  const container = document.createElement("div");
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <CasePreparationPanel decisionCase={{ casePreparation: preparation }} />
      </IntlProvider>
    )
  );
  return container;
}

const preparation: NonNullable<DecisionCase["casePreparation"]> = {
  schemaVersion: "case-preparation-v1",
  status: "awaiting_applicant",
  approvable: false,
  reasons: ["awaiting_applicant_reply"],
  automaticRequests: { policyVersion: "synthetic-agent-follow-up-v2", used: 1, budget: 3, consent: "agent_follow_up_v2", enabled: true },
  openObjectives: [],
  rounds: [
    {
      round: 1,
      actor: "bounded_policy",
      requestId: `sha256:${"a".repeat(64)}`,
      requestedAt: "2026-09-24T08:00:00.000Z",
      requestCodes: ["sales_evidence"],
      hasOperatorQuestion: false,
      status: "answered",
      respondedAt: "2026-09-24T08:10:00.000Z",
    },
    {
      round: 2,
      actor: "operator",
      requestId: `sha256:${"b".repeat(64)}`,
      requestedAt: "2026-09-24T08:20:00.000Z",
      requestCodes: ["operator_question"],
      hasOperatorQuestion: true,
      status: "awaiting_reply",
      respondedAt: null,
    },
  ],
};

describe("CasePreparationPanel", () => {
  it("shows each request's actor and response state without operator dispatch or disposition controls", () => {
    const page = render(preparation);
    expect(page.textContent).toContain("1 of 3 automatic rounds used");
    const rounds = page.querySelectorAll("ol > li");
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.textContent).toContain("Round 1 · Agent follow-up");
    expect(rounds[0]?.textContent).toContain("Reply received");
    expect(rounds[1]?.textContent).toContain("Round 2 · Operator question");
    expect(rounds[1]?.textContent).toContain("Awaiting reply");
    expect(page.querySelectorAll("button, input, textarea, select")).toHaveLength(0);
    expect(page.querySelector("a")?.getAttribute("href")).toBe("#case-conversation");
  });
  it("leaves legacy cases to their existing presentation", () => {
    expect(render(undefined).textContent).toBe("");
  });
  it("does not imply that legacy consent permits three automatic rounds", () => {
    const page = render({
      ...preparation,
      automaticRequests: { ...preparation.automaticRequests, consent: "legacy_one_question_v1" },
    });
    expect(page.textContent).not.toContain("of 3 automatic rounds");
    expect(page.querySelectorAll("ol > li")).toHaveLength(2);
  });
});
