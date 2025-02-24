import { http, delay, HttpResponse } from "msw"
import { API_URL } from "@/constants/api"
import { ADMIN_QUOTE_PENDING } from "@/constants/endpoints"
import { ListPendingQuotesResponse } from "@/generated/client"
import { db } from "../db"

export const fetchAdminQuotePending = http.get<never, never, ListPendingQuotesResponse>(
  `${API_URL}${ADMIN_QUOTE_PENDING}`,
  async () => {
    await delay(1_000)

    const data = db.quotes.getAll().filter((it) => it.status === 'pending');

    return HttpResponse.json({
      quotes: data.map((it) => it.id),
    })
  },
)
