import { authenticatedFetch } from "@/lib/api-client";

export const sources = {
  assessment: "#full-governed-assessment",
  bill: "#bill-record",
  applicant: "#case-conversation",
  invoice: "#documents-and-evidence",
  preparation: "#case-preparation",
} as const;
type Source = keyof typeof sources;
export interface Discussion {
  requestId: string;
  resultDigest: string;
  question: string;
  status: "pending" | "answered" | "failed";
  answer?: { answer: string; sources: Source[] };
}
export interface DiscussionAttempt {
  question: string;
  resultDigest: string;
  requestId: string;
}
/** A transport retry keeps its immutable assessment binding; a new assessment is a new question attempt. */
export function discussionAttempt(previous: DiscussionAttempt | undefined, question: string, resultDigest: string): DiscussionAttempt {
  const trimmed = question.trim();
  return previous?.question === trimmed && previous.resultDigest === resultDigest
    ? previous
    : { question: trimmed, resultDigest, requestId: crypto.randomUUID() };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseCaseDiscussion(value: unknown): Discussion[] {
  if (!object(value) || value.schemaVersion !== "operator-discussion-v1" || !Array.isArray(value.records) || value.records.length > 16)
    throw new Error("Invalid discussion response");
  return value.records.map((record: unknown) => {
    if (
      !object(record) ||
      typeof record.requestId !== "string" ||
      typeof record.resultDigest !== "string" ||
      typeof record.question !== "string" ||
      record.question.length > 500 ||
      !["pending", "answered", "failed"].includes(String(record.status))
    )
      throw new Error("Invalid discussion record");
    let answer: Discussion["answer"];
    if (record.status === "answered") {
      if (
        !object(record.answer) ||
        typeof record.answer.answer !== "string" ||
        record.answer.answer.length > 3000 ||
        !Array.isArray(record.answer.sources) ||
        record.answer.sources.length > 5
      )
        throw new Error("Invalid agent answer");
      const citations = record.answer.sources.map((source: unknown) => {
        const key = Object.keys(sources).find((key) => key === source);
        if (key === undefined) throw new Error("Unknown source");
        return key as Source;
      });
      answer = { answer: record.answer.answer, sources: citations };
    }
    return {
      requestId: record.requestId,
      resultDigest: record.resultDigest,
      question: record.question,
      status: record.status as Discussion["status"],
      ...(answer === undefined ? {} : { answer }),
    };
  });
}
export async function discussionRequest(body: object): Promise<Discussion[]> {
  const response = await authenticatedFetch("/api/ai-credit/operator-discussion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75_000),
  });
  if (!response.ok) throw new Error("Discussion unavailable");
  return parseCaseDiscussion(await response.json());
}
