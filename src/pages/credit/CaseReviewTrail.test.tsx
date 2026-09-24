import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { CaseReviewTrail } from "./CaseReviewTrail";
import type { InterviewTranscript, LiveInterviewProgress, ServerClarificationObservation } from "./decision-types";
import { countAnswerReviewFollowUps } from "./decision-types";
import type { ServerInitialObservation } from "@bitcredit/ai-credit-shared";

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
const serverDialogue: ServerClarificationObservation = {
  source: "server_interview",
  billId: liveInterview.billId,
  caseId: liveInterview.caseId,
  requestId: liveInterview.requestId,
  snapshotDigest: liveInterview.snapshotDigest,
  resultDigest: liveInterview.resultDigest,
  dialogueId: "627af9db-148a-46db-b775-7a8eb518be7f",
  revision: 2,
  updatedAt: "2026-09-22T08:30:00.000Z",
  language: "en",
  questionGraphVersion: "server-clarification-v1",
  promptVersion: "server-clarification-v1",
  modelId: "live-interviewer",
  status: "interviewing",
  messages: [
    {
      messageId: "server-question",
      role: "assistant",
      templateId: "aiCredit.interview.governedClarification",
      text: "Does the buyer confirm payment before the bill is due?",
      governedClarification: {
        schemaVersion: "credit-clarification-request-v1",
        requestId: liveInterview.requestId,
        caseId: liveInterview.caseId,
        snapshotDigest: liveInterview.snapshotDigest,
        resultDigest: liveInterview.resultDigest,
        reasonCode: "repayment",
        requiredItems: ["Explain when repayment funds become available."],
        availableActions: ["correct_answer", "upload_supporting_document"],
        requestedAt: "2026-09-22T08:00:00.000Z",
        synthetic: true,
      },
    },
    { messageId: "server-answer", role: "applicant", text: "We only have an estimated date." },
  ],
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
  it("shows an unfinished initial conversation without an assessment, invented request, or financial controls", () => {
    const application: ServerInitialObservation = {
      source: "server_interview",
      billId: "bill-1",
      caseId: "case-1",
      mintQuoteId: "quote-1",
      dialogueId: "initial-1",
      revision: 2,
      updatedAt: serverDialogue.updatedAt,
      language: "en",
      modelId: "live-interviewer",
      promptVersion: "initial-v1",
      questionGraphVersion: "initial-v1",
      status: "processing",
      messages: transcript.messages,
    };
    const page = render({ serverInitialApplication: application, updatesStatus: "live" });
    expect(page.textContent).toContain("Application conversation · Interviewer responding");
    expect(page.textContent).toContain("When will your buyer pay?");
    expect(page.textContent).toContain("Interviewer · server-recorded");
    expect(page.textContent).toContain("Not submitted · no credit decision");
    expect(page.textContent).toContain("Live updates");
    expect(page.textContent).not.toContain("Full conversation not recorded");
    expect(page.textContent).not.toContain("Request reference");
    expect(page.querySelector("textarea")).toBeNull();
    expect(page.textContent).not.toContain("Approve");
  });
  it("keeps submitted initial server wording with the same provenance and hides duplicated submitted copies", () => {
    const application: ServerInitialObservation = {
      source: "server_interview",
      billId: "bill-1",
      caseId: "case-1",
      mintQuoteId: "quote-1",
      dialogueId: "initial-1",
      revision: 2,
      updatedAt: serverDialogue.updatedAt,
      language: "en",
      modelId: "live-interviewer",
      promptVersion: "initial-v1",
      questionGraphVersion: "initial-v1",
      status: "submitted",
      messages: transcript.messages,
    };
    const page = render({ serverInitialApplication: application, transcript, updatesStatus: "unavailable" });
    expect(page.textContent).toContain("Application conversation · Submitted");
    expect(page.textContent).not.toContain("Live updates");
    expect(page.textContent).not.toContain("Not submitted · no credit decision");
    const serverSection = [...page.querySelectorAll("details")].find((item) =>
      item.querySelector("summary")?.textContent?.startsWith("Application conversation")
    );
    expect(serverSection?.open).toBe(false);
    expect(serverSection?.textContent).toContain("When will your buyer pay?");
  });
  it("shows exact server-recorded wording and request identity while retaining the legacy provenance boundary", () => {
    const page = render({ serverClarificationDialogues: [serverDialogue], liveInterview, updatesStatus: "live" });
    expect(page.textContent).toContain("Does the buyer confirm payment before the bill is due?");
    expect(page.textContent).toContain("Interviewer · server-recorded");
    expect(page.textContent).toContain("Server-recorded messages · claims unverified");
    expect(page.textContent).toContain(serverDialogue.requestId);
    expect(page.textContent).toContain("Live updates");
    expect(page.textContent).toContain("Not submitted · current assessment unchanged");
    expect(page.textContent).not.toContain("Unconfirmed clarification receipt");
    expect(page.textContent).not.toContain("Recorded prompt objective");
    expect(page.querySelector("textarea")).toBeNull();
  });

  it.each([
    ["processing", "Interviewer responding"],
    ["interrupted", "Interview interrupted"],
    ["review", "Awaiting answer confirmation"],
    ["confirmed", "Answers confirmed"],
  ] as const)("keeps %s distinct from submission or resolution", (status, label) => {
    const page = render({ serverClarificationDialogues: [{ ...serverDialogue, status }], updatesStatus: "live" });
    expect(page.textContent).toContain(label);
    expect(page.textContent).toContain("Not submitted · current assessment unchanged");
    expect(page.textContent).not.toContain("Evidence reviewed");
    expect(page.textContent).not.toContain("Approved");
  });

  it("keeps exact server conversation visible as saved history on reconnect and after submission", () => {
    const page = render({ serverClarificationDialogues: [{ ...serverDialogue, status: "processing" }], updatesStatus: "reconnecting" });
    expect(page.textContent).toContain("Reconnecting · showing last received record");
    expect(page.textContent).toContain("Last recorded: Interviewer responding");
    expect(page.textContent).not.toContain("Live updates");
    expect(page.textContent).toContain("We only have an estimated date.");
  });

  it("deduplicates exact submitted copies without relabelling different legacy text as server-authored", () => {
    const differentLegacyWording: InterviewTranscript["messages"][number] = {
      messageId: "server-question",
      role: "assistant",
      templateId: "aiCredit.interview.repayment",
      text: "Different applicant-carried wording",
    };
    const page = render({
      transcript: { ...transcript, modelId: "live-interviewer", messages: [differentLegacyWording, ...serverDialogue.messages] },
      serverClarificationDialogues: [{ ...serverDialogue, status: "submitted" }],
    });
    const conversations = [...page.querySelectorAll('ol[aria-label="Applicant interview"]')];
    expect(conversations[0]?.textContent).toContain("Different applicant-carried wording");
    expect(conversations[0]?.textContent).not.toContain("server-recorded");
    expect(conversations[0]?.textContent).not.toContain("We only have an estimated date.");
    const serverRecord = [...page.querySelectorAll("details")].find(
      (node) => node.querySelector("summary")?.textContent === "Clarification conversation · Submitted"
    );
    expect(serverRecord?.open).toBe(false);
    expect(serverRecord?.textContent).toContain("Does the buyer confirm payment before the bill is due?");
    expect(serverRecord?.textContent).toContain("We only have an estimated date.");
    expect(serverRecord?.textContent).not.toContain("Not submitted");
    const audit = [...page.querySelectorAll("details")].find(
      (node) => node.querySelector("summary")?.textContent === "Submission snapshots (1)"
    );
    expect(audit?.open).toBe(false);
    expect(audit?.textContent).toContain("We only have an estimated date.");
    expect(page.textContent).not.toContain("Live updates");
  });

  it("does not suppress a legacy receipt for a different request", () => {
    const page = render({
      serverClarificationDialogues: [serverDialogue],
      liveInterview: { ...liveInterview, requestId: "different-request" },
    });
    expect(page.textContent).toContain("Unconfirmed clarification receipt");
    expect(page.textContent).toContain("The corrected invoice is attached.");
    expect(page.textContent).toContain("Interviewer · server-recorded");
  });

  it("renders the exact server request once when its wording already contains the requirements", () => {
    const request = serverDialogue.messages[0];
    if (request?.role !== "assistant") throw new Error("Expected server question");
    const requirement = "Explain when repayment funds become available.";
    const page = render({
      serverClarificationDialogues: [
        { ...serverDialogue, messages: [{ ...request, text: `The Mint requested the following information:\n• ${requirement}` }] },
      ],
    });
    expect(page.textContent?.split(requirement)).toHaveLength(2);
    expect(page.querySelector('ol[aria-label="Applicant interview"] ul')).toBeNull();
  });

  it("preserves a governed requirement when the recorded server wording does not contain it", () => {
    const page = render({ serverClarificationDialogues: [serverDialogue] });
    expect(page.textContent).toContain("Explain when repayment funds become available.");
  });

  it("keeps carried answers with their original questions and starts the server view at the current request", () => {
    const carriedAnswer = transcript.messages[1];
    if (carriedAnswer === undefined) throw new Error("Expected earlier answer");
    const page = render({
      transcript,
      serverClarificationDialogues: [{ ...serverDialogue, messages: [carriedAnswer, ...serverDialogue.messages] }],
    });
    const conversations = [...page.querySelectorAll('ol[aria-label="Applicant interview"]')];
    expect(conversations[0]?.textContent).toContain("When will your buyer pay?");
    expect(conversations[0]?.textContent).toContain("In December, after the harvest.");
    expect(conversations[1]?.textContent).not.toContain("In December, after the harvest.");
    expect(conversations[1]?.children[0]?.textContent).toContain("Does the buyer confirm payment before the bill is due?");
    expect(conversations[1]?.textContent).toContain("We only have an estimated date.");
  });

  it("keeps a superseded dialogue collapsed and unsubmitted without implying active updates", () => {
    const page = render({ serverClarificationDialogues: [{ ...serverDialogue, status: "superseded" }], updatesStatus: "live" });
    const record = [...page.querySelectorAll("details")].find(
      (node) => node.querySelector("summary")?.textContent === "Clarification conversation · Superseded"
    );
    expect(record?.open).toBe(false);
    expect(record?.textContent).toContain("Not submitted · current assessment unchanged");
    expect(record?.textContent).toContain("We only have an estimated date.");
    expect(page.textContent).not.toContain("Live updates");
    expect(page.textContent).not.toContain("Clarification conversation · Submitted");
  });

  it("keeps the latest Mint request with its replies beyond the recent-message limit", () => {
    const request: InterviewTranscript["messages"][number] = {
      messageId: "mint-request",
      role: "assistant",
      templateId: "aiCredit.interview.governedClarification",
      text: "Please clarify the payment date.",
      governedClarification: {
        schemaVersion: "credit-clarification-request-v1",
        requestId: `sha256:${"a".repeat(64)}`,
        caseId: "case-1",
        snapshotDigest: `sha256:${"b".repeat(64)}`,
        resultDigest: `sha256:${"c".repeat(64)}`,
        reasonCode: "repayment",
        requiredItems: ["Explain when repayment funds become available."],
        availableActions: ["correct_answer", "upload_supporting_document"],
        requestedAt: "2026-09-04T13:00:00.000Z",
        synthetic: true,
      },
    };
    const page = render({
      transcript: {
        ...transcript,
        messages: [
          ...transcript.messages,
          request,
          ...Array.from({ length: 12 }, (_, index) => ({
            messageId: `reply-${index}`,
            role: "applicant" as const,
            text: `Clarification answer ${index}`,
          })),
        ],
      },
    });
    const conversation = page.querySelector('ol[aria-label="Applicant interview"]');
    expect(conversation?.children).toHaveLength(13);
    expect(conversation?.textContent).toContain("Please clarify the payment date.");
    expect(conversation?.textContent).toContain("Clarification answer 11");
    const earlier = [...page.querySelectorAll("button")].find((button) => button.textContent === "Show 2 earlier messages");
    expect(earlier?.getAttribute("aria-controls")).toBe(conversation?.id);
  });
  it("opens long multi-round conversations at recent messages and reveals exact earlier history on demand", () => {
    const history: InterviewTranscript = {
      ...transcript,
      preparedInputId: "earlier",
      messages: Array.from({ length: 16 }, (_, index) => ({
        messageId: `earlier-${index}`,
        role: "applicant",
        text: `Earlier answer ${index}`,
      })),
    };
    const page = render({ transcript, interviewHistory: [history, { ...history, preparedInputId: "carried-history" }] });
    const conversation = page.querySelector('ol[aria-label="Applicant interview"]');
    expect(conversation?.children).toHaveLength(10);
    expect(conversation?.textContent).toContain("In December, after the harvest.");
    expect(conversation?.textContent).not.toContain("Earlier answer 0");
    const earlier = [...page.querySelectorAll("button")].find((button) => button.textContent === "Show 8 earlier messages");
    expect(earlier).toBeDefined();
    act(() => earlier?.click());
    expect(conversation?.children).toHaveLength(18);
    expect(conversation?.textContent).toContain("Earlier answer 0");
    expect(conversation?.textContent?.match(/Earlier answer 0/g)).toHaveLength(1);
    expect(earlier?.getAttribute("aria-expanded")).toBe("true");
    act(() => earlier?.click());
    expect(conversation?.children).toHaveLength(10);
    const audit = [...page.querySelectorAll("details")].find(
      (node) => node.querySelector("summary")?.textContent === "Submission snapshots (3)"
    );
    expect(audit?.open).toBe(false);
    expect(audit?.textContent?.match(/Earlier answer 0/g)).toHaveLength(2);
  });
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
    expect(page.textContent).toContain("In December, after the harvest.");
    expect(page.textContent.indexOf("In December, after the harvest.")).toBeLessThan(
      page.textContent.indexOf("The corrected invoice is attached.")
    );
  });

  it("marks interrupted updates without discarding the last received conversation", () => {
    const page = render({ liveInterview, updatesUnavailable: true });
    expect(page.textContent).toContain("Updates unavailable · showing last received record");
    expect(page.textContent).toContain("The corrected invoice is attached.");
  });

  it("renders every submitted conversation as one oldest-first chronology without fabricating a time or resolution", () => {
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
    expect(page.textContent).toContain("Submission snapshots (2)");
    const snapshots = Array.from(page.querySelectorAll("details")).find(
      (node) => node.querySelector("summary")?.textContent === "Submission snapshots (2)"
    );
    expect(snapshots?.open).toBe(false);
    expect(page.textContent).toContain("The first budget was incomplete.");
    expect(page.textContent).toContain("In December, after the harvest.");
    expect(page.textContent.indexOf("The first budget was incomplete.")).toBeLessThan(
      page.textContent.indexOf("In December, after the harvest.")
    );
    expect(Array.from(page.querySelectorAll("h5"), (heading) => heading.textContent)).toEqual([
      "Submission 1 · Scripted interview",
      "Submission 2 · Scripted interview",
    ]);
    expect(page.textContent).not.toContain("Resolved");
  });

  it("shows carried answers once in the conversation but preserves both audit snapshots", () => {
    const page = render({ transcript, interviewHistory: [{ ...transcript, preparedInputId: "previous-input" }] });
    const conversation = page.querySelector('ol[aria-label="Applicant interview"]');
    expect(conversation?.textContent?.match(/In December, after the harvest\./g)).toHaveLength(1);
    const snapshots = Array.from(page.querySelectorAll("details")).find(
      (node) => node.querySelector("summary")?.textContent === "Submission snapshots (2)"
    );
    expect(snapshots?.textContent?.match(/In December, after the harvest\./g)).toHaveLength(2);
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
