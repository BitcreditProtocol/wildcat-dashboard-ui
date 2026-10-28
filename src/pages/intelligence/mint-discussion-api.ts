import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { array, object, string, number } from "@/pages/home/operator-api";
export type CitationKind =
  | "intelligence-note"
  | "policy"
  | "outcomes"
  | "portfolio"
  | "queue"
  | "federation"
  | "capacity"
  | "general-knowledge";
export interface MintCitation {
  kind: CitationKind;
  ref?: string;
}
export interface MintAnswer {
  answer: string;
  citations: MintCitation[];
  followUps: string[];
}
export interface MintChatRecord {
  requestId: string;
  threadId: string;
  question: string;
  status: "pending" | "answered" | "failed";
  requestedAt: string;
  answer?: MintAnswer;
}
export interface MintChat {
  schema: "mint-discussion-v1";
  records: MintChatRecord[];
  limits: { daily: number; usedToday: number };
}
export interface MintQuestion {
  requestId: string;
  threadId: string;
  question: string;
}
const kinds: readonly string[] = [
  "intelligence-note",
  "policy",
  "outcomes",
  "portfolio",
  "queue",
  "federation",
  "capacity",
  "general-knowledge",
];
function citationKind(value: unknown): CitationKind {
  if (typeof value !== "string" || !kinds.includes(value)) throw new Error("Invalid citation");
  return value as CitationKind;
}
export function parseMintChat(value: unknown): MintChat {
  const v = object(value);
  if (v.schema !== "mint-discussion-v1") throw new Error("Unknown chat version");
  const limits = object(v.limits);
  return {
    schema: v.schema,
    limits: { daily: number(limits.daily), usedToday: number(limits.usedToday) },
    records: array(v.records).map((value) => {
      const r = object(value);
      if (r.status !== "pending" && r.status !== "answered" && r.status !== "failed") throw new Error("Invalid chat state");
      const record: MintChatRecord = {
        requestId: string(r.requestId),
        threadId: string(r.threadId),
        question: string(r.question),
        status: r.status,
        requestedAt: string(r.requestedAt),
      };
      if (r.status === "answered") {
        const a = object(r.answer);
        record.answer = {
          answer: string(a.answer),
          followUps: array(a.followUps).map(string),
          citations: array(a.citations).map((value) => {
            const c = object(value);
            return { kind: citationKind(c.kind), ...(c.ref === undefined ? {} : { ref: string(c.ref) }) };
          }),
        };
      }
      return record;
    }),
  };
}
export class MintChatError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(code);
  }
}
const key = ["ai-credit", "mint-discussion"];
async function request(input?: MintQuestion) {
  const response = await authenticatedFetch("/api/ai-credit/mint-discussion", {
    ...(input ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) } : {}),
    signal: AbortSignal.timeout(70_000),
    cache: "no-store",
  });
  if (!response.ok) {
    let code = "unavailable";
    try {
      const body = object(await response.json());
      if (typeof body.code === "string") code = body.code;
    } catch {
      /* Translate a bounded client message, never expose a server error body. */
    }
    throw new MintChatError(code, response.status);
  }
  return parseMintChat(await response.json());
}
export function useMintDiscussion() {
  return useQuery({
    queryKey: key,
    queryFn: () => request(),
    retry: false,
    refetchInterval: (query) => (query.state.data?.records.some((r) => r.status === "pending") ? 3000 : false),
  });
}
export function useAskMint() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MintQuestion) => request(input),
    onSuccess: async (result) => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, result);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
export function citationLocation(c: MintCitation): string | null {
  switch (c.kind) {
    case "intelligence-note":
      return c.ref ? `/intelligence#note-${encodeURIComponent(c.ref)}` : null;
    case "policy":
      return c.ref ? `/policy#policy-${encodeURIComponent(c.ref)}` : null;
    case "portfolio":
      return c.ref && c.ref !== "summary" ? `/quotes/${encodeURIComponent(c.ref)}` : "/";
    case "outcomes":
      return "/outcomes";
    case "federation":
      return "/network";
    case "queue":
      return "/#action-queue";
    case "capacity":
      return "/#capacity";
    case "general-knowledge":
      return null;
  }
}
