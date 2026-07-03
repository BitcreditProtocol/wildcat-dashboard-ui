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

const TOKEN_REFRESH_RETRIES = 3;
const TOKEN_REFRESH_RETRY_DELAY_MS = 1000;

heyApiClient.interceptors.request.use(async (request) => {
  let refreshFailed = false;

  for (let attempt = 0; attempt <= TOKEN_REFRESH_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, TOKEN_REFRESH_RETRY_DELAY_MS)
        );
      }
      await keycloak.updateToken(30);
      break;
    } catch (error) {
      console.error(
        `Token refresh failed (attempt ${attempt + 1}/${TOKEN_REFRESH_RETRIES + 1}):`,
        error
      );
      if (attempt === TOKEN_REFRESH_RETRIES) {
        refreshFailed = true;
      }
    }
  }

  if (refreshFailed) {
    void keycloak.login();
    return request;
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
