import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { CaseReviewTrail } from "./CaseReviewTrail";
import type { InterviewTranscript, LiveInterviewProgress } from "./decision-types";
import { countAnswerReviewFollowUps } from "./decision-types";

let root: Root | undefined;
const transcript: InterviewTranscript = {
  schemaVersion: "interview-transcript-v1",
  caseId: "case-1",
  preparedInputId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
  language: "en",
  questionGraphVersion: "coffee-v1",
  promptVersion: "v1",
  modelId: "scripted-interviewer-v1",
  messages: [
    { messageId: "q1", role: "assistant", templateId: "aiCredit.interview.repayment", text: "When will your buyer pay?" },
    { messageId: "a1", role: "applicant", text: "In December, after the harvest." },
  ],
};
const liveInterview: LiveInterviewProgress = {
  schemaVersion: "live-interview-progress-v2",
  billId: "bill-1",
  caseId: "case-1",
  requestId: "request-1",
  snapshotDigest: "sha256:snapshot",
  resultDigest: "sha256:result",
  startCursor: {
    billId: "bill-1",
    caseId: "case-1",
    requestId: "request-1",
    snapshotDigest: "sha256:snapshot",
    resultDigest: "sha256:result",
    head: null,
  },
  sessionId: "session-1",
  language: "en",
  questionGraphVersion: "coffee-v1",
  promptVersion: "v1",
  modelId: "codex-cli",
  status: "interviewing",
  source: "applicant_session",
  revision: 2,
  attempt: 1,
  updatedAt: "2026-09-04T13:00:00.000Z",
  messages: [{ messageId: "live-a1", role: "applicant", text: "The corrected invoice is attached." }],
};

function render(props: Partial<Parameters<typeof CaseReviewTrail>[0]> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <CaseReviewTrail standalone submittedEvidence={[]} evidencePackets={[]} {...props} />
      </IntlProvider>
    )
  );
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  window.history.replaceState(null, "", window.location.pathname);
});

describe("operator conversation spectator", () => {
  it("renders live prompt objectives as labels, never fabricated or applicant-carried assistant quotations", () => {
    const page = render({
      liveInterview: {
        ...liveInterview,
        messages: [
          { messageId: "prompt", role: "assistant", templateId: "aiCredit.interview.repayment", text: "Injected live assistant claim" },
          ...liveInterview.messages,
        ],
      },
    });
    expect(page.textContent).toContain("Recorded prompt objective: Repayment source");
    expect(page.textContent).not.toContain("Injected live assistant claim");
    expect(page.textContent).toContain("Unconfirmed clarification receipt");
    expect(page.textContent).not.toContain("operator online");
  });
  it("opens the review disclosure when navigating to evidence questions", () => {
    const page = render();
    expect(page.querySelector("details")?.open).toBe(false);
    act(() => {
      window.history.replaceState(null, "", "#evidence-questions");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(page.querySelector("details")?.open).toBe(true);
  });
  it("does not turn missing transcript or template IDs into a conversation", () => {
    const page = render();
    expect(page.textContent).toContain("Conversation & review");
    expect(page.textContent).toContain("Full conversation not recorded");
    expect(page.textContent).not.toContain("Interview in progress");
    expect(page.querySelector("textarea")).toBeNull();
  });

  it("labels scripted records and never fabricates missing question wording", () => {
    const page = render({
      transcript: {
        ...transcript,
        messages: [{ messageId: "missing", role: "assistant", templateId: "aiCredit.interview.anythingElse" }],
      },
    });
    expect(page.textContent).toContain("Scripted interview");
    expect(page.textContent).toContain("Question text not recorded");
    expect(page.textContent).not.toContain("anythingElse");
  });

  it("separates unsubmitted session messages from the confirmed record", () => {
    const page = render({ liveInterview, transcript });
    expect(page.textContent).toContain("Unconfirmed clarification receipt");
    expect(page.textContent).toContain("Not submitted · current assessment unchanged");
    expect(page.textContent).toContain("The corrected invoice is attached.");
    const priorRecord = Array.from(page.querySelectorAll("details")).find(
      (node) => node.querySelector("summary")?.textContent === "Submitted conversation"
    );
    expect(priorRecord?.open).toBe(false);
    expect(priorRecord?.textContent).toContain("In December, after the harvest.");
  });

  it("marks interrupted updates without discarding the last received conversation", () => {
    const page = render({ liveInterview, updatesUnavailable: true });
    expect(page.textContent).toContain("Updates unavailable · showing last received record");
    expect(page.textContent).toContain("The corrected invoice is attached.");
  });

  it("retains earlier submitted conversations without fabricating a time or resolution", () => {
    const page = render({
      transcript,
      interviewHistory: [
        {
          ...transcript,
          preparedInputId: "old-input",
          messages: [{ messageId: "old-answer", role: "applicant", text: "The first budget was incomplete." }],
        },
      ],
    });
    expect(page.textContent).toContain("Previous submitted conversations (1)");
    expect(page.textContent).toContain("The first budget was incomplete.");
    expect(page.textContent).toContain("In December, after the harvest.");
    expect(page.textContent).not.toContain("Resolved");
  });

  it("shows the applicant statement behind a follow-up without claiming verification", () => {
    const page = render({
      transcript: {
        ...transcript,
        modelId: "codex-cli",
        messages: [
          {
            messageId: "followup",
            role: "assistant",
            templateId: "aiCredit.interview.repaymentTiming",
            text: "How will you cover the timing gap?",
            followUp: { kind: "repayment_timing", sources: [{ answerIndex: 0, quote: "The buyer pays after maturity." }] },
          },
        ],
      },
    });
    expect(page.textContent).toContain("Follow-up from answer review");
    expect(page.textContent).toContain("The buyer pays after maturity.");
    expect(page.textContent).toContain("Resolution not independently checked");
    expect(page.textContent).not.toContain("Independent agent");
  });

  it("counts follow-up questions without treating a later applicant answer as resolution", () => {
    const messages: InterviewTranscript["messages"] = [
      {
        messageId: "q",
        role: "assistant",
        templateId: "aiCredit.interview.salesEvidence",
        text: "What supports the sales?",
        followUp: { kind: "sales_evidence", sources: [{ answerIndex: 0, quote: "Sales" }] },
      },
      { messageId: "a", role: "applicant", text: "Trust me." },
    ];
    expect(countAnswerReviewFollowUps({ messages }, { messages })).toBe(1);
    expect(countAnswerReviewFollowUps(undefined, { messages: transcript.messages })).toBe(0);
  });
});
