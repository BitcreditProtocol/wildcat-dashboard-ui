import { client as heyApiClient } from "@/generated/client/client.gen"
import * as sdk from "@/generated/client/sdk.gen"

heyApiClient.setConfig({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
})

// Add the auth token interceptor
heyApiClient.interceptors.request.use((request) => {
  const token = localStorage.getItem("token")

  if (token) {
    let headers = request.headers
    if (!(headers instanceof Headers)) {
      headers = new Headers(headers as HeadersInit)
    }
    headers.set("Authorization", `Bearer ${token}`)

    if (!(request.headers instanceof Headers)) {
      ;(request as any).headers = headers
    }
  }
  return request
})

export const client = heyApiClient
export { sdk }
