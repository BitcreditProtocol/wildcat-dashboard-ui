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

heyApiClient.interceptors.request.use(async (request) => {
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
      console.error(`Token refresh failed (attempt ${attempt + 1}/${TOKEN_REFRESH_MAX_ATTEMPTS}):`, error);
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
});

export const client = heyApiClient;
export { sdk };
