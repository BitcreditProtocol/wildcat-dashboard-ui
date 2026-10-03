import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { CaseOpenPoints } from "./CaseOpenPoints";
import { openPointCount } from "./case-open-points";
import type { DecisionCase } from "./decision-types";

type Preparation = NonNullable<DecisionCase["casePreparation"]>;
const preparation = (overrides: Partial<Preparation> = {}): Preparation => ({
  schemaVersion: "case-preparation-v1",
  status: "attention",
  approvable: true,
  reasons: ["automatic_requests_disabled"],
  automaticRequests: { policyVersion: "synthetic-agent-follow-up-v2", used: 0, budget: 3, consent: "absent", enabled: false },
  rounds: [],
  openObjectives: [{ kind: "sales_evidence", sources: [{ answerIndex: 0, quote: "an earlier advance may overlap" }] }],
  ...overrides,
});
const decisionCase = (overrides: Partial<DecisionCase> = {}) =>
  ({
    assessmentCurrency: "current",
    casePreparation: preparation(),
    snapshot: { contradictions: [{ code: "acceptor_claim_bill_mismatch", state: "unresolved", evidenceState: "deterministic" }] },
    ...overrides,
  }) as unknown as DecisionCase;

let root: Root | undefined;
function render(value: DecisionCase) {
  act(() => root?.unmount());
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <CaseOpenPoints decisionCase={value} />
      </IntlProvider>
    )
  );
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("CaseOpenPoints", () => {
  it("shows an unasked agent objective with the applicant's own words, numbered from one", () => {
    const page = render(decisionCase());
    expect(page.textContent).toContain("Support expected sales");
    expect(page.textContent).toContain("“an earlier advance may overlap”");
    expect(page.textContent).toContain("Applicant, answer 1");
    expect(page.textContent).toContain("Agent · not asked yet");
    expect(page.textContent).toContain("Automatic follow-ups are disabled for this case.");
    expect(page.textContent).toContain("use Ask the applicant");
  });

  it("leaves blocking snapshot contradictions to the brief instead of framing them as judgment points", () => {
    const page = render(decisionCase());
    expect(page.textContent).not.toMatch(/contradiction|mismatch/iu);
    expect(openPointCount(decisionCase())).toBe(1);
    expect(render(decisionCase({ casePreparation: preparation({ openObjectives: [] }) })).textContent).toBe("");
  });

  it("does not invite a duplicate question while the agent is preparing its request", () => {
    const page = render(decisionCase({ casePreparation: preparation({ status: "preparing", reasons: ["agent_request_pending"] }) }));
    expect(page.textContent).toContain("Agent · preparing a question");
    expect(page.textContent).not.toContain("use Ask the applicant");
  });

  it("shows nothing for a historical assessment", () => {
    const historical = decisionCase({ assessmentCurrency: "historical" });
    expect(render(historical).textContent).toBe("");
    expect(openPointCount(historical)).toBe(0);
    expect(openPointCount(undefined)).toBe(0);
  });
});
