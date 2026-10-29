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
  label?: string;
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
  /** The model that answered, when the Mint records it. */
  model?: string;
}
/** The deployment's model allowlist; absent on Mints that offer one fixed model. */
export interface MintChatModels {
  default: string;
  options: string[];
}
export interface MintChat {
  schema: "mint-discussion-v1";
  records: MintChatRecord[];
  limits: { daily: number; usedToday: number };
  models?: MintChatModels;
}
export interface MintQuestion {
  requestId: string;
  threadId: string;
  question: string;
  model?: string;
}
const modelId = (value: unknown) => {
  const id = string(value);
  if (!/^[a-z0-9][a-z0-9._/-]{0,79}$/u.test(id)) throw new Error("Invalid model");
  return id;
};
/** `modelRoute` is "runner@version:model:effort:…"; only its model segment is shown. */
function recordModel(r: Record<string, unknown>): string | undefined {
  if (r.model !== undefined) return modelId(r.model);
  if (typeof r.modelRoute !== "string") return undefined;
  const segment = r.modelRoute.split(":")[1];
  return segment && /^[a-z0-9][a-z0-9._/-]{0,79}$/u.test(segment) ? segment : undefined;
}
function parseModels(value: unknown): MintChatModels | undefined {
  if (value === undefined) return undefined;
  const v = object(value);
  const options = array(v.options).map(modelId).slice(0, 8);
  const fallback = modelId(v.default);
  if (!options.includes(fallback)) throw new Error("Default model is not offered");
  return { default: fallback, options };
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
  const models = parseModels(v.models);
  return {
    schema: v.schema,
    limits: { daily: number(limits.daily), usedToday: number(limits.usedToday) },
    ...(models ? { models } : {}),
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
      const model = recordModel(r);
      if (model) record.model = model;
      if (r.status === "answered") {
        const a = object(r.answer);
        record.answer = {
          answer: string(a.answer),
          followUps: array(a.followUps).map(string),
          citations: array(a.citations).map((value) => {
            const c = object(value);
            return {
              kind: citationKind(c.kind),
              ...(c.ref === undefined ? {} : { ref: string(c.ref) }),
              ...(c.label === undefined ? {} : { label: string(c.label) }),
            };
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
