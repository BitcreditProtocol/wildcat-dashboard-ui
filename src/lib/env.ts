type RuntimeEnv = Partial<{
  VITE_API_BASE_URL: string
  VITE_API_MOCKING_ENABLED: string
  VITE_KEYCLOAK_URL: string
  VITE_KEYCLOAK_REALM: string
  VITE_KEYCLOAK_CLIENT_ID: string
  VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: string
}>

const runtimeEnv: RuntimeEnv =
  typeof window !== "undefined" ? (window as { __ENV__?: RuntimeEnv }).__ENV__ ?? {} : {}

const fallbackEnv = import.meta.env as ImportMetaEnv & RuntimeEnv

const getEnvValue = <K extends keyof RuntimeEnv>(key: K): RuntimeEnv[K] | undefined => {
  const value = runtimeEnv[key]

  if (value !== undefined && value !== null && value !== "") {
    return value
  }

  return fallbackEnv[key]
}

export const env = {
  devModeEnabled: fallbackEnv.DEV,
  apiBaseUrl: getEnvValue("VITE_API_BASE_URL") as string,
  apiMocksEnabled: (getEnvValue("VITE_API_MOCKING_ENABLED") ?? "false") === "true",
  keycloakUrl: getEnvValue("VITE_KEYCLOAK_URL") as string,
  keycloakRealm: getEnvValue("VITE_KEYCLOAK_REALM") as string,
  keycloakClientId: getEnvValue("VITE_KEYCLOAK_CLIENT_ID") as string,
  crowdinInContextToolingEnabled:
    (getEnvValue("VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING") ?? "false") === "true",
}
