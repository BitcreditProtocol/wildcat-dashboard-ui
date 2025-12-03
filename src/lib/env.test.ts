import { afterEach, describe, expect, it, vi } from "vitest"

const loadEnv = async () => {
  const module = await import("./env")
  return module.env
}

afterEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("env runtime resolution", () => {
  it("prefers runtime env values when provided", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com")
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com")
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm")
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client")

    vi.stubGlobal("window", {
      __ENV__: {
        VITE_API_BASE_URL: "https://runtime.example.com",
        VITE_API_MOCKING_ENABLED: "true",
        VITE_KEYCLOAK_URL: "https://runtime-keycloak.example.com",
        VITE_KEYCLOAK_REALM: "runtime-realm",
        VITE_KEYCLOAK_CLIENT_ID: "runtime-client",
        VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: "true",
      },
    })

    const env = await loadEnv()

    expect(env.apiBaseUrl).toBe("https://runtime.example.com")
    expect(env.apiMocksEnabled).toBe(true)
    expect(env.keycloakUrl).toBe("https://runtime-keycloak.example.com")
    expect(env.keycloakRealm).toBe("runtime-realm")
    expect(env.keycloakClientId).toBe("runtime-client")
    expect(env.crowdinInContextToolingEnabled).toBe(true)
  })

  it("falls back to build-time env when runtime values are empty", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com")
    vi.stubEnv("VITE_API_MOCKING_ENABLED", "true")
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com")
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm")
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client")
    vi.stubEnv("VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING", "false")

    vi.stubGlobal("window", {
      __ENV__: {
        VITE_API_BASE_URL: "",
        VITE_API_MOCKING_ENABLED: "",
        VITE_KEYCLOAK_URL: "",
        VITE_KEYCLOAK_REALM: "",
        VITE_KEYCLOAK_CLIENT_ID: "",
        VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: "",
      },
    })

    const env = await loadEnv()

    expect(env.apiBaseUrl).toBe("https://fallback.example.com")
    expect(env.apiMocksEnabled).toBe(true)
    expect(env.keycloakUrl).toBe("https://fallback-keycloak.example.com")
    expect(env.keycloakRealm).toBe("fallback-realm")
    expect(env.keycloakClientId).toBe("fallback-client")
    expect(env.crowdinInContextToolingEnabled).toBe(false)
  })

  it("handles SSR where window is undefined", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com")
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com")
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm")
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client")

    vi.stubGlobal("window", undefined)

    const env = await loadEnv()

    expect(env.apiBaseUrl).toBe("https://fallback.example.com")
    expect(env.keycloakUrl).toBe("https://fallback-keycloak.example.com")
    expect(env.keycloakRealm).toBe("fallback-realm")
    expect(env.keycloakClientId).toBe("fallback-client")
  })
})
