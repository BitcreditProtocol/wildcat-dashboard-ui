import { client as heyApiClient } from "@/generated/client/client.gen"
import * as sdk from "@/generated/client/sdk.gen"
import keycloak from "../keycloak"

heyApiClient.setConfig({
  baseUrl: import.meta.env.VITE_API_BASE_URL as string,
})

// Add the auth token interceptor
heyApiClient.interceptors.request.use((request) => {
  if (keycloak.token!) {
    let headers = request.headers
    if (!(headers instanceof Headers)) {
      headers = new Headers(headers as HeadersInit)
    }
    headers.set("Authorization", `Bearer ${keycloak.token}`)

    if (!(request.headers instanceof Headers)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      ;(request as any).headers = headers
    }
  }
  return request
})

export const client = heyApiClient
export { sdk }
