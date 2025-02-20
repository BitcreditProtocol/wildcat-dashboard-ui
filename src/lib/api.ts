import { ADMIN_QUOTE_ACCEPTED, ADMIN_QUOTE_BY_ID, ADMIN_QUOTE_PENDING, INFO } from "@/constants/endpoints";
import { apiFetch } from "@/utils/api";

export interface InfoResponse {
  name?: string
  pubkey?: string
  version?: string
  description?: string
  description_long?: string
  contact?: {
    method?: string
    info?: string
  }[],
  motd?: string
  icon_url?: string
  urls?: string[],
  time?: number,
  nuts?: Record<string, {
      methods?: Record<string, unknown>[],
      disabled?: boolean
      supported?: boolean
  }>
}

export async function fetchInfo(): Promise<InfoResponse> {
  return apiFetch<InfoResponse>(INFO, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}


interface QuotePending {
  id: string
  bill: string
  endorser: string
  submitted: number
  suggested_expiration: number
}
interface QuoteAccepted {
  id: string
  bill: string
  endorser: string
  ttl: number
  signatures: unknown[]
}
interface QuoteDeclined {
  id: string
  bill: string
  endorser: string
}

export type QuoteInfoReply = QuotePending | QuoteAccepted | QuoteDeclined

export interface QuoteListResponse {
  quotes: string[]
}

export async function fetchAdminQuoteById(id: string): Promise<QuoteInfoReply> {
  return apiFetch<QuoteInfoReply>(ADMIN_QUOTE_BY_ID.replace(":id", id), {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
export async function fetchAdminQuotePending(): Promise<QuoteListResponse> {
  return apiFetch<QuoteListResponse>(ADMIN_QUOTE_PENDING, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
export async function fetchAdminQuoteAccepted(): Promise<QuoteListResponse> {
  return apiFetch<QuoteListResponse>(ADMIN_QUOTE_ACCEPTED, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
