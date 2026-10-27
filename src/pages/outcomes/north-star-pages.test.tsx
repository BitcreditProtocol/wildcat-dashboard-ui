import { act } from "react";
import { getByLabelText, getByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OperatorRequotePreview, OutcomeReport } from "@bitcredit/ai-credit-shared";
import ApplicantHelpPage, { ApplicantHelpCard } from "@/pages/help/ApplicantHelp";
import { RequotePreview } from "@/pages/credit/RequotePreview";
import { cleanup, flush, json, renderWithProviders, requestBody, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import OutcomesPage from "./OutcomesPage";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rate = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  ratio: denominator === 0 ? null : numerator / denominator,
});
const noDurations = { sampleCount: 0, averageMs: null, medianMs: null, maximumMs: null };

function report(): OutcomeReport {
  return {
    schemaVersion: "prd-outcome-report-v1",
    generatedAt: "2026-10-27T12:00:00.000Z",
    synthetic: true,
    cases: {
      schemaVersion: "current-cabinet-success-metrics-v1",
      coverage: { cohort: "current_published_cases_in_current_cabinet", denominator: 2, casesWithDurableEventLog: 2, statement: "x" },
      durableAssessment: { casesEverAssessed: rate(2, 2), creationToFirstAssessment: noDurations },
      operatorReview: {
        casesEverReviewed: rate(1, 2),
        actionCount: 1,
        evaluationToAction: { sampleCount: 1, averageMs: 600_000, medianMs: 600_000, maximumMs: 600_000 },
        comparableActions: 1,
        deviations: rate(0, 1),
      },
      humanReview: {
        requests: 0,
        completed: rate(0, 0),
        requestToStart: noDurations,
        requestToCompletion: noDurations,
        correctionsAfterCompletedReview: rate(0, 0),
      },
      currentDecisionReproducibility: {
        currentDecisions: 2,
        storedInputSets: 2,
        missingInputSets: 0,
        reproducible: rate(2, 2),
        evaluationErrors: 0,
      },
      unavailableTelemetry: [],
    },
    applicantJourney: {
      cohort: "server_initial_interviews_in_current_cabinet",
      opened: 4,
      answered: rate(3, 4),
      reachedReview: rate(2, 4),
      confirmed: rate(2, 4),
      submitted: rate(2, 4),
      openToConfirmation: { sampleCount: 2, averageMs: 900_000, medianMs: 900_000, maximumMs: 1_200_000 },
      inProgress: 1,
      stalledByStep: { opened: 1, answering: 0, review: 0, confirmed: 0 },
      structuredFallback: { selected: rate(1, 4), completed: rate(1, 1) },
      statement: "x",
    },
    applicantComprehension: {
      checks: 2,
      byTopic: {
        amount_now: { answered: 2, correct: 2, ratio: 1 },
        fee: { answered: 2, correct: 1, ratio: 0.5 },
        payer_and_maturity: { answered: 1, correct: 1, ratio: 1 },
        recourse: { answered: 2, correct: 0, ratio: 0 },
      },
      statement: "x",
    },
    applicantHelp: {
      requests: 2,
      answered: 1,
      byStep: { quote: 2 },
      requestToReply: { sampleCount: 1, averageMs: 300_000, medianMs: 300_000, maximumMs: 300_000 },
    },
    unavailable: [{ metric: "seeded_error_detection", reason: "Cases carry no seeded-error ground truth." }],
    antiMetrics: ["approval_percentage", "chat_volume"],
  };
}

describe("Outcomes", () => {
  it("shows the applicant journey, understanding, help and review with counts, and what is not measured", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/outcome-report": () => json(report()) }));
    const { page } = await renderWithProviders(<OutcomesPage />, "/outcomes");
    const text = page.textContent ?? "";
    expect(text).toContain("Interviews opened4");
    expect(text).toContain("Submitted an application2 of 4 (50%)");
    expect(text).toContain("Continued without the assistant1 of 4 (25%)");
    expect(text).toContain("Recourse if the payer does not pay0 of 2 (0%)");
    expect(text).toContain("Answered1 of 2 (50%)");
    expect(text).toContain("Time from assessment to the operator's actionmedian 10 min");
    expect(text).toContain("Time until a second review startedno samples yet");
    expect(text).toContain("Seeded-error detection by reviewers · Cases carry no seeded-error ground truth.");
    expect(text).toContain("Approval percentage");
    expect(text).toContain("Synthetic demo data");
  });
});

describe("Help requests", () => {
  const view = {
    schemaVersion: "applicant-help-v1",
    requests: [
      {
        schemaVersion: "applicant-help-request-v1",
        requestId: "11111111-1111-4111-8111-111111111111",
        billId: "bitcrtFincaVerdeGT",
        caseId: null,
        mintQuoteId: "quote-1",
        holderRef: `bitcrt02${"a".repeat(64)}`,
        step: "quote",
        message: "¿Qué pasa si la cooperativa no paga?",
        requestedAt: "2026-10-27T12:00:00.000Z",
        reply: null,
        synthetic: true,
      },
    ],
  };

  it("lists open questions and sends one attributed reply", async () => {
    let posted: unknown;
    let current: unknown = view;
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/applicant-help": (init) => {
          if (init?.method === "POST") {
            posted = requestBody(init);
            current = {
              ...view,
              requests: [
                {
                  ...view.requests[0],
                  reply: { text: "La Mint puede reclamarle.", operatorId: "democat", repliedAt: "2026-10-27T12:05:00.000Z" },
                },
              ],
            };
          }
          return json(current);
        },
      })
    );
    const { page } = await renderWithProviders(<ApplicantHelpPage />, "/help-requests");
    expect(page.textContent).toContain("Waiting for a reply (1)");
    expect(page.textContent).toContain("¿Qué pasa si la cooperativa no paga?");
    act(() => getByRole(page, "button", { name: "Reply" }).click());
    await flush();
    const field = getByLabelText(page, "Your reply to the applicant");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(field, "La Mint puede reclamarle.");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => getByRole(page, "button", { name: "Send reply" }).click());
    await flush();
    expect(posted).toMatchObject({ action: "reply", requestId: view.requests[0]?.requestId, text: "La Mint puede reclamarle." });
    expect(page.textContent).toContain("Replied by operator democat");
  });

  it("tells the operator when help requests cannot be read on a quote", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/applicant-help": () => new Response(null, { status: 503 }) }));
    const { page } = await renderWithProviders(<ApplicantHelpCard billId="bitcrtFincaVerdeGT" />, "/quotes/quote-1");
    expect(page.textContent).toContain("Help requests");
    expect(getByRole(page, "alert").textContent).toContain("The Mint cannot serve this data right");
  });

  it("shows only this bill's requests on a quote and nothing for others", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/applicant-help": () => json(view) }));
    const { page } = await renderWithProviders(<ApplicantHelpCard billId="bitcrtOtherBi11" />, "/quotes/quote-2");
    expect(page.textContent).not.toContain("Applicant asked for help");
    cleanup();
    const shown = await renderWithProviders(<ApplicantHelpCard billId="bitcrtFincaVerdeGT" />, "/quotes/quote-1");
    expect(shown.page.textContent).toContain("Applicant asked for help");
  });
});

describe("Requote preview", () => {
  const terms = {
    effectiveFeeSat: "380000",
    feeRatioBps: 380,
    effectiveAnnualBps: 790,
  };

  it("states governed recalculations and the bound a refused amount breaks", async () => {
    const accepted = {
      schemaVersion: "operator-requote-preview-v1",
      decisionResultDigest: `sha256:${"1".repeat(64)}`,
      outcome: { ok: true, terms },
    };
    const { page } = await renderWithProviders(
      <RequotePreview
        amount="9620000"
        isError={false}
        maxAnnualBps={1500}
        maxFeeRatioBps={3000}
        preview={accepted as unknown as OperatorRequotePreview}
      />
    );
    expect(page.textContent).toContain("Recalculated by the policy for 9,620,000 sat");
    expect(page.textContent).toContain(
      "Fee 380,000 sat (3.8% of the bill) · effective annual rate 7.9% · within the ceilings (15% a year, 30% of the bill)."
    );
    cleanup();
    const refused: OperatorRequotePreview = {
      schemaVersion: "operator-requote-preview-v1",
      decisionResultDigest: `sha256:${"1".repeat(64)}`,
      outcome: {
        ok: false,
        reasonCode: "adjustment_above_effective_annual_ceiling",
        observed: { effectiveAnnualBps: "2100" },
        policy: { maximumEffectiveAnnualBps: 1500 },
      },
    };
    const second = await renderWithProviders(
      <RequotePreview amount="8000000" isError={false} maxAnnualBps={1500} maxFeeRatioBps={3000} preview={refused} />
    );
    expect(getByRole(second.page, "alert").textContent).toContain(
      "The effective annual rate would be 21%, above the policy ceiling of 15%."
    );
  });
});
