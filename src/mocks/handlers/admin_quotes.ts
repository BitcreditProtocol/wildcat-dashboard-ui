import { http, delay, HttpResponse, StrictResponse } from "msw"
import { API_URL } from "@/constants/api"
import { ADMIN_QUOTE_BY_ID, ADMIN_QUOTE_PENDING } from "@/constants/endpoints"
import { AdminLookupQuoteResponse, InfoReply, ListPendingQuotesResponse } from "@/generated/client"
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
