type RuntimeEnv = Partial<{
  VITE_API_BASE_URL: string;
  VITE_API_MOCKING_ENABLED: string;
  VITE_KEYCLOAK_URL: string;
  VITE_KEYCLOAK_REALM: string;
  VITE_KEYCLOAK_CLIENT_ID: string;
  VITE_ESPLORA_BASE_URL: string;
  VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: string;
}>;

const runtimeEnv: RuntimeEnv = typeof window !== "undefined" ? ((window as { __ENV__?: RuntimeEnv }).__ENV__ ?? {}) : {};

const fallbackEnv = import.meta.env as ImportMetaEnv & RuntimeEnv;

const normalizeEnvValue = <K extends keyof RuntimeEnv>(value: RuntimeEnv[K] | undefined): RuntimeEnv[K] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value;
};

const getEnvValue = <K extends keyof RuntimeEnv>(key: K): RuntimeEnv[K] | undefined => {
  const runtimeValue = normalizeEnvValue(runtimeEnv[key]);

  if (runtimeValue !== undefined) {
    return runtimeValue;
  }

  return normalizeEnvValue(fallbackEnv[key]);
};

const requiredEnvKeys = ["VITE_API_BASE_URL", "VITE_KEYCLOAK_URL", "VITE_KEYCLOAK_REALM", "VITE_KEYCLOAK_CLIENT_ID"] as const;

const missingRequiredEnvKeys = requiredEnvKeys.filter((key) => getEnvValue(key) === undefined);

if (missingRequiredEnvKeys.length > 0) {
  throw new Error(
    `Missing required environment variable${missingRequiredEnvKeys.length === 1 ? "" : "s"}: ${missingRequiredEnvKeys.join(", ")}`
  );
}

const getRequiredEnvValue = <K extends (typeof requiredEnvKeys)[number]>(key: K): string => {
  return getEnvValue(key) as string;
};

const configuredApiBaseUrl = getRequiredEnvValue("VITE_API_BASE_URL");
const configuredKeycloakUrl = getRequiredEnvValue("VITE_KEYCLOAK_URL");
const browserOrigin = (configured: string) => (configured === "/" && typeof window !== "undefined" ? window.location.origin : configured);

export const env = {
  devModeEnabled: fallbackEnv.DEV,
  // `/` keeps browser previews on their actual origin, including tools that expose Vite through
  // a random proxy port. Vite still owns the upstream API and Keycloak addresses.
  apiBaseUrl: browserOrigin(configuredApiBaseUrl),
  apiMocksEnabled: (getEnvValue("VITE_API_MOCKING_ENABLED") ?? "false") === "true",
  keycloakUrl: browserOrigin(configuredKeycloakUrl),
  keycloakRealm: getRequiredEnvValue("VITE_KEYCLOAK_REALM"),
  keycloakClientId: getRequiredEnvValue("VITE_KEYCLOAK_CLIENT_ID"),
  esploraBaseUrl: getEnvValue("VITE_ESPLORA_BASE_URL") ?? "https://esplora.minibill.tech",
  crowdinInContextToolingEnabled: (getEnvValue("VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING") ?? "false") === "true",
};
