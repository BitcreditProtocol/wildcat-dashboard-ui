import { client as heyApiClient } from "@/generated/client/client.gen";
import * as sdk from "@/generated/client/sdk.gen";
import { normalizeApiError } from "@/lib/api-error";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import keycloak from "../keycloak";

const logger = createLogger("api-client");

heyApiClient.setConfig({
  baseUrl: env.apiBaseUrl,
  throwOnError: true,
});

heyApiClient.interceptors.error.use((error, response) =>
  normalizeApiError(error, {
    status: response?.status,
  })
);

// Add the auth token interceptor
heyApiClient.interceptors.request.use(async (request) => {
  try {
    await keycloak.updateToken(30);
  } catch (error) {
    logger.error("Failed to refresh token", error);
  }

  const token = keycloak.token;
  if (!token) {
    return request;
  }

  let headers = request.headers;
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers);
  }
  headers.set("Authorization", `Bearer ${token}`);

  return new Request(request, { headers });
});

export const client = heyApiClient;
export { sdk };
