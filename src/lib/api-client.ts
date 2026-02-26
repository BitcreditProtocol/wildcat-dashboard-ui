import { client as heyApiClient } from "@/generated/client/client.gen"
import * as sdk from "@/generated/client/sdk.gen"
import { env } from "@/lib/env"
import keycloak from "../keycloak"

heyApiClient.setConfig({
  baseUrl: env.apiBaseUrl,
})

// Add the auth token interceptor
heyApiClient.interceptors.request.use(async (request) => {
  try {
    await keycloak.updateToken(30)
  } catch (error) {
    console.error("Failed to refresh token:", error)
  }

  const token = keycloak.token
  if (!token) {
    return request
  }

  let headers = request.headers
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers as HeadersInit)
  }
  headers.set("Authorization", `Bearer ${token}`)

  if (!(request.headers instanceof Headers)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    ;(request as any).headers = headers
  }

  return request
})

export const client = heyApiClient
export { sdk }
