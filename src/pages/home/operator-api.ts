import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid operator response");
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== "string" || value.length > 6000) throw new Error("Invalid operator text");
  return value;
}
export function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid operator count");
  return value;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid operator flag");
  return value;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 512) throw new Error("Invalid operator list");
  return value;
}
function sat(value: unknown) {
  const result = string(value);
  if (!/^(0|[1-9][0-9]{0,30})$/.test(result)) throw new Error("Invalid satoshi amount");
  return result;
}
const nullableText = (value: unknown) => (value === null ? null : string(value));
export interface PortfolioQuote {
  quoteId: string;
  caseId: string | null;
  billId: string;
  amountSat: string;
  currency: "SAT";
  maturity: string;
  drawer: { ref: string; name: string };
  drawee: { ref: string; name: string };
  state: string;
  since: string | null;
  financed: boolean;
  exposure: boolean;
  paid: boolean | null;
}
export interface MintFinanceLock {
  quoteId: string;
  scope: "bill" | "invoice";
  state: "reserved" | "financed" | "released";
  expiresAt: number;
  delivered: boolean;
}
export interface MintSummary {
  financeLocks?: MintFinanceLock[] | null;
  schema: "operator-mint-summary-v1";
  observedAt: string;
  coverage: { complete: boolean; listed: number; scanned: number; limit: number; failures: number };
  portfolio: {
    quotes: PortfolioQuote[];
    financedSat: string;
    committedSat: string;
    outstandingSat: string | null;
    counterparties: { role: "drawer" | "drawee"; ref: string; name: string; usedSat: string; capSat: string | null }[];
  };
  queue: { quoteId: string; caseId: string | null; kind: "quote" | "buyer-confirmation"; since: string | null }[];
}
export function parseMintSummary(value: unknown): MintSummary {
  const v = object(value);
  if (v.schema !== "operator-mint-summary-v1") throw new Error("Unknown summary version");
  const c = object(v.coverage),
    p = object(v.portfolio);
  const party = (value: unknown) => {
    const p = object(value);
    return { ref: string(p.ref), name: string(p.name) };
  };
  return {
    schema: v.schema,
    observedAt: string(v.observedAt),
    financeLocks:
      v.financeLocks == null
        ? null
        : array(v.financeLocks).map((value) => {
            const l = object(value);
            if (
              (l.scope !== "bill" && l.scope !== "invoice") ||
              (l.state !== "reserved" && l.state !== "financed" && l.state !== "released")
            )
              throw new Error("Invalid finance lock");
            return {
              quoteId: string(l.quoteId),
              scope: l.scope,
              state: l.state,
              expiresAt: number(l.expiresAt),
              delivered: boolean(l.delivered),
            };
          }),
    coverage: {
      complete: boolean(c.complete),
      listed: number(c.listed),
      scanned: number(c.scanned),
      limit: number(c.limit),
      failures: number(c.failures),
    },
    portfolio: {
      financedSat: sat(p.financedSat),
      committedSat: sat(p.committedSat),
      outstandingSat: p.outstandingSat === null ? null : sat(p.outstandingSat),
      quotes: array(p.quotes).map((value) => {
        const q = object(value);
        if (q.currency !== "SAT") throw new Error("Non-SAT quote");
        return {
          quoteId: string(q.quoteId),
          caseId: nullableText(q.caseId),
          billId: string(q.billId),
          amountSat: sat(q.amountSat),
          currency: q.currency,
          maturity: string(q.maturity),
          drawer: party(q.drawer),
          drawee: party(q.drawee),
          state: string(q.state),
          since: nullableText(q.since),
          financed: boolean(q.financed),
          exposure: boolean(q.exposure),
          paid: q.paid === null ? null : boolean(q.paid),
        };
      }),
      counterparties: array(p.counterparties).map((value) => {
        const e = object(value);
        if (e.role !== "drawer" && e.role !== "drawee") throw new Error("Invalid exposure role");
        return {
          role: e.role,
          ref: string(e.ref),
          name: string(e.name),
          usedSat: sat(e.usedSat),
          capSat: e.capSat === null ? null : sat(e.capSat),
        };
      }),
    },
    queue: array(v.queue).map((value) => {
      const q = object(value);
      if (q.kind !== "quote" && q.kind !== "buyer-confirmation") throw new Error("Invalid queue kind");
      return { quoteId: string(q.quoteId), caseId: nullableText(q.caseId), kind: q.kind, since: nullableText(q.since) };
    }),
  };
}
export interface OperatorCapacity {
  schema: "operator-capacity-v1";
  observedAt: string;
  items: {
    id: string;
    label: string;
    used: number;
    limit: number;
    unit: "count" | "bytes";
    status: "ok" | "warning" | "full";
    detail?: string;
  }[];
}
export function parseCapacity(value: unknown): OperatorCapacity {
  const v = object(value);
  if (v.schema !== "operator-capacity-v1") throw new Error("Unknown capacity version");
  return {
    schema: v.schema,
    observedAt: string(v.observedAt),
    items: array(v.items).map((value) => {
      const i = object(value);
      if ((i.unit !== "count" && i.unit !== "bytes") || (i.status !== "ok" && i.status !== "warning" && i.status !== "full"))
        throw new Error("Invalid capacity item");
      return {
        id: string(i.id),
        label: string(i.label),
        used: number(i.used),
        limit: number(i.limit),
        unit: i.unit,
        status: i.status,
        ...(i.detail === undefined ? {} : { detail: string(i.detail) }),
      };
    }),
  };
}
export async function optionalRead<T>(path: string, parse: (value: unknown) => T): Promise<T | null> {
  const r = await authenticatedFetch(path, { signal: AbortSignal.timeout(15_000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Operator read failed (${r.status})`);
  return parse(await r.json());
}
export function useMintSummary() {
  return useQuery({
    queryKey: ["ai-credit", "operator-mint-summary"],
    queryFn: () => optionalRead("/api/ai-credit/operator-mint-summary", parseMintSummary),
    refetchInterval: 30_000,
    retry: false,
  });
}
export function useOperatorCapacity() {
  return useQuery({
    queryKey: ["ai-credit", "operator-capacity"],
    queryFn: () => optionalRead("/api/ai-credit/operator-capacity", parseCapacity),
    refetchInterval: 30_000,
    retry: false,
  });
}
