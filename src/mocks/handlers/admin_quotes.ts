import { http, delay, HttpResponse } from "msw"
import { API_URL } from "@/constants/api"
import { ADMIN_QUOTE_PENDING } from "@/constants/endpoints"
import { ListPendingQuotesResponse } from "@/generated/client"

export const fetchAdminQuotePending = http.get<never, never, ListPendingQuotesResponse>(
  `${API_URL}${ADMIN_QUOTE_PENDING}`,
  async () => {
    await delay(1_000)

    return HttpResponse.json({
      quotes: [
        "63777d15-ce53-4cca-94bf-7726c7930aab",
        "cd3fc93c-4507-4154-b51b-215b6f360a53",
        "d20ab61f-03c5-479f-930b-b6aca608b1e6",
        "57330ad9-30b1-45a7-b900-a37be37005d3",
        "62ea00be-66f2-4b04-b2c4-257d7409ce9f",
        "597d3d44-4a65-4c87-8d50-628acda245f5",
        "0e96e7cc-4327-41c6-87bf-8096fd880117",
        "2f5bc589-9bca-4899-adbf-76c881a4e418",
      ],
    })
  },
)
