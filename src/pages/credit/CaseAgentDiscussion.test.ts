import { describe, expect, it } from "vitest";
import { discussionAttempt, parseCaseDiscussion } from "./case-agent-discussion";

const record = {
  requestId: "question-1",
  resultDigest: "digest",
  question: "Why is approval unavailable?",
  status: "answered",
  answer: { answer: "The applicant has not replied.", sources: ["assessment"] },
};
const payload = (value: unknown) => ({ schemaVersion: "operator-discussion-v1", records: [value] });
describe("operator discussion rendering boundary", () => {
  it("reuses an attempt only for the same question AND immutable assessment", () => {
    const first = discussionAttempt(undefined, " Why? ", "digest-a");
    expect(discussionAttempt(first, "Why?", "digest-a")).toBe(first);
    const reassessed = discussionAttempt(first, "Why?", "digest-b");
    expect(reassessed.requestId).not.toBe(first.requestId);
    expect(reassessed.resultDigest).toBe("digest-b");
    expect(discussionAttempt(first, "What next?", "digest-a").requestId).not.toBe(first.requestId);
  });
  it("accepts plain explanations with allowlisted record links", () => {
    expect(parseCaseDiscussion(payload(record))[0]?.answer?.sources).toEqual(["assessment"]);
  });
  it("rejects missing answers, unbounded content and arbitrary model-provided links", () => {
    for (const changed of [
      { answer: undefined },
      { status: "verified" },
      { question: "x".repeat(501) },
      { answer: { answer: "x".repeat(3001), sources: [] } },
      { answer: { answer: "Checked", sources: ["https://invented.example"] } },
    ])
      expect(() => parseCaseDiscussion(payload({ ...record, ...changed }))).toThrow();
  });
  it("retains the original assessment binding for historical answers", () => {
    expect(parseCaseDiscussion(payload(record))[0]?.resultDigest).toBe("digest");
  });
});
