import { client as heyApiClient } from "@/generated/client/client.gen";
import * as sdk from "@/generated/client/sdk.gen";
import { normalizeApiError } from "@/lib/api-error";
import { env } from "@/lib/env";
import keycloak from "../keycloak";

heyApiClient.setConfig({
  baseUrl: env.apiBaseUrl,
  throwOnError: true,
});

heyApiClient.interceptors.error.use((error, response) =>
  normalizeApiError(error, {
    status: (response as Response | undefined)?.status,
  })
);

// Add the auth token interceptor
heyApiClient.interceptors.request.use(async (request) => {
  try {
    await keycloak.updateToken(30);
  } catch (error) {
    console.error("Failed to refresh token:", error);
  }

  const token = keycloak.token;
  if (!token) {
    return request;
  }

  let headers = request.headers;
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers as HeadersInit);
  }
  headers.set("Authorization", `Bearer ${token}`);

  return new Request(request, { headers });
});

export const client = heyApiClient;
export { sdk };
