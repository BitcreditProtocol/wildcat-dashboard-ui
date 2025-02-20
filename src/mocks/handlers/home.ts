import { http, delay, HttpResponse } from "msw"
import { BALANCES } from "@/constants/endpoints"

export const getBalances = http.get(BALANCES, async () => {
  await delay(1000)

  return HttpResponse.json({
  })
})
