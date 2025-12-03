import { client as heyApiClient } from "@/generated/client/client.gen"
import * as sdk from "@/generated/client/sdk.gen"
import { env } from "@/lib/env"
import keycloak from "../keycloak"

heyApiClient.setConfig({
  baseUrl: env.apiBaseUrl,
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

const originalFetch = window.fetch
window.fetch = async function (...args) {
  try {
    console.log("Refreshing token...")
    await keycloak.updateToken(30)
  } catch (error) {
    console.error("Failed to refresh token:", error)
  }

  return originalFetch.apply(this, args)
}

export const client = heyApiClient
export { sdk }
