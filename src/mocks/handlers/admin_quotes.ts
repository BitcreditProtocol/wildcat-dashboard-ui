import { http, delay, HttpResponse, StrictResponse } from "msw"
import { API_URL } from "@/constants/api"
import { ADMIN_QUOTE_BY_ID, ADMIN_QUOTE_PENDING, ADMIN_QUOTE } from "@/constants/endpoints"
import {
  AdminLookupQuoteResponse,
  InfoReply,
  ListPendingQuotesResponse,
  ListReplyLight,
  UpdateQuoteRequest,
  UpdateQuoteResponse,
} from "@/generated/client"
import { db } from "../db"

export const fetchAdminQuotePending = http.get<never, never, ListPendingQuotesResponse>(
  `${API_URL}${ADMIN_QUOTE_PENDING}`,
  async () => {
    await delay(1_000)

    const data = db.quotes.getAll().filter((it) => it.status === "pending")

    return HttpResponse.json({
      quotes: data.map((it) => it.id),
    })
  },
)

export const fetchAdminQuote = http.get<never, never, ListReplyLight>(
  `${API_URL}${ADMIN_QUOTE}`,
  async ({ request }) => {
    const url = new URL(request.url)
    await delay(1_000)
    let data = db.quotes.getAll()

    const states = url.searchParams.getAll("status")
    if (states.length !== 0) {
      data = data.filter((it) => states.includes(it.status?.toLowerCase() ?? ""))
    }

    return HttpResponse.json({
      quotes: data.map((it) => ({
        id: it.id,
        status: it.status ?? undefined,
      })),
    })
  },
)

export const fetchAdminLookupQuote = http.get<never, never, AdminLookupQuoteResponse>(
  `${API_URL}${ADMIN_QUOTE_BY_ID}`,
  async ({ params }) => {
    const { id } = params

    await delay(1_000)

    const data = db.quotes.getAll().filter((it) => it.id === id)
    if (data.length === 0) {
      return HttpResponse.json(null, { status: 404 }) as unknown as StrictResponse<InfoReply>
    }

    return HttpResponse.json(data[0] as InfoReply)
  },
)

export const updateAdminQuote = http.post<never, UpdateQuoteRequest>(
  `${API_URL}${ADMIN_QUOTE_BY_ID}`,
  async ({ params, request }) => {
    const { id } = params
    const body = await request.json()

    await delay(1_000)

    const data = db.quotes.getAll().filter((it) => it.id === id)
    if (data.length === 0) {
      return HttpResponse.json(null, { status: 404 }) as unknown as StrictResponse<InfoReply>
    }

    const quote = data[0]

    if (body.action === "deny") {
      quote.status = "denied"
    }
    if (body.action === "offer") {
      quote.status = "offered"
      quote.ttl = body.ttl ?? null
      // TODO: not yet impelemnted: quote.discount = body.discount ?? null
    }

    const updated = db.quotes.update({
      where: { id: { equals: quote.id } },
      data: quote,
    })

    return HttpResponse.json(updated as UpdateQuoteResponse)
  },
)
