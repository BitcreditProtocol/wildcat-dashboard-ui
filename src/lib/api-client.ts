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

const TOKEN_REFRESH_MAX_ATTEMPTS = 4;
const TOKEN_REFRESH_RETRY_DELAY_MS = 1000;

let isRedirectingToLogin = false;

const abortedRequest = (request: Request): Request => {
  const controller = new AbortController();
  controller.abort();
  return new Request(request, { signal: controller.signal });
};

async function authorizeRequest(request: Request): Promise<Request> {
  // Local-only escape hatch (VITE_API_MOCKING_ENABLED=true, previously a dead flag): send the
  // request unauthenticated instead of aborting it and redirecting to a login. Without this every
  // /v1/admin call dies inside this interceptor before it reaches the network, so no local stub or
  // MSW handler can ever answer one. Off by default, and never true in a deployed build.
  if (env.apiMocksEnabled) {
    return request;
  }

  if (isRedirectingToLogin) {
    return abortedRequest(request);
  }

  let refreshFailed = false;

  for (let attempt = 0; attempt < TOKEN_REFRESH_MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, TOKEN_REFRESH_RETRY_DELAY_MS));
      }
      await keycloak.updateToken(30);
      break;
    } catch (error) {
      logger.error(`Token refresh failed (attempt ${attempt + 1}/${TOKEN_REFRESH_MAX_ATTEMPTS}):`, error);

      if (attempt === TOKEN_REFRESH_MAX_ATTEMPTS - 1) {
        refreshFailed = true;
      }
    }
  }

  if (refreshFailed) {
    isRedirectingToLogin = true;
    void keycloak.login();
    return abortedRequest(request);
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
}

heyApiClient.interceptors.request.use(authorizeRequest);

/** Same authenticated BFF boundary for the small hand-written AI Credit surface. */
export async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(await authorizeRequest(new Request(new URL(path, env.apiBaseUrl), init)));
}

export const client = heyApiClient;
export { sdk };
