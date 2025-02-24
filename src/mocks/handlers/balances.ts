import { http, delay, HttpResponse } from "msw"
import { API_URL } from "@/constants/api"
import type { BalancesResponse } from "@/lib/api"
import { BALANCES } from "@/constants/endpoints"

export const fetchBalances = http.get<never, never, BalancesResponse>(`${API_URL}${BALANCES}`, async () => {
  await delay(1_000)

  return HttpResponse.json({
    bitcoin: {
      value: "42.12345678",
      currency: "BTC",
    },
    eiou: {
      value: "1.12345678",
      currency: "BTC",
    },
    debit: {
      value: "0.12345678",
      currency: "BTC",
    },
    credit: {
      value: "0.00000042",
      currency: "BTC",
    },
  })
})
