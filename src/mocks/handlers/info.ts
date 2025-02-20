import { http, delay, HttpResponse } from "msw"
import { INFO } from "@/constants/endpoints"
import type { InfoResponse } from "@/lib/api"

export const fetchInfo = http.get<never, never, InfoResponse>(INFO, async () => {
  await delay(1000)

  return HttpResponse.json({
    version: '0.1.0-dev'
  })
})
