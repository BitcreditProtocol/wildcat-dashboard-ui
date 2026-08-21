import { afterEach, describe, expect, it, vi } from "vitest";

const loadEnv = async () => {
  const module = await import("./env");
  return module.env;
};

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("env runtime resolution", () => {
  it("prefers runtime env values when provided", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com");
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client");
    vi.stubEnv("VITE_ESPLORA_BASE_URL", "https://fallback-esplora.example.com");

    vi.stubGlobal("window", {
      __ENV__: {
        VITE_API_BASE_URL: "https://runtime.example.com",
        VITE_API_MOCKING_ENABLED: "true",
        VITE_KEYCLOAK_URL: "https://runtime-keycloak.example.com",
        VITE_KEYCLOAK_REALM: "runtime-realm",
        VITE_KEYCLOAK_CLIENT_ID: "runtime-client",
        VITE_ESPLORA_BASE_URL: "https://runtime-esplora.example.com",
        VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: "true",
      },
    });

    const env = await loadEnv();

    expect(env.apiBaseUrl).toBe("https://runtime.example.com");
    expect(env.apiMocksEnabled).toBe(true);
    expect(env.keycloakUrl).toBe("https://runtime-keycloak.example.com");
    expect(env.keycloakRealm).toBe("runtime-realm");
    expect(env.keycloakClientId).toBe("runtime-client");
    expect(env.esploraBaseUrl).toBe("https://runtime-esplora.example.com");
    expect(env.crowdinInContextToolingEnabled).toBe(true);
  });

  it("falls back to build-time env when runtime values are empty", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com");
    vi.stubEnv("VITE_API_MOCKING_ENABLED", "true");
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client");
    vi.stubEnv("VITE_ESPLORA_BASE_URL", "https://fallback-esplora.example.com");
    vi.stubEnv("VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING", "false");

    vi.stubGlobal("window", {
      __ENV__: {
        VITE_API_BASE_URL: "",
        VITE_API_MOCKING_ENABLED: "",
        VITE_KEYCLOAK_URL: "",
        VITE_KEYCLOAK_REALM: "",
        VITE_KEYCLOAK_CLIENT_ID: "",
        VITE_ESPLORA_BASE_URL: "",
        VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING: "",
      },
    });

    const env = await loadEnv();

    expect(env.apiBaseUrl).toBe("https://fallback.example.com");
    expect(env.apiMocksEnabled).toBe(true);
    expect(env.keycloakUrl).toBe("https://fallback-keycloak.example.com");
    expect(env.keycloakRealm).toBe("fallback-realm");
    expect(env.keycloakClientId).toBe("fallback-client");
    expect(env.esploraBaseUrl).toBe("https://fallback-esplora.example.com");
    expect(env.crowdinInContextToolingEnabled).toBe(false);
  });

  it("uses the browser origin for a same-origin API preview", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/");
    vi.stubEnv("VITE_KEYCLOAK_URL", "/");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "realm");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "client");
    vi.stubGlobal("window", { location: { origin: "http://localhost:62009" } });

    const env = await loadEnv();

    expect(env.apiBaseUrl).toBe("http://localhost:62009");
    expect(env.keycloakUrl).toBe("http://localhost:62009");
  });

  it("handles SSR where window is undefined", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://fallback.example.com");
    vi.stubEnv("VITE_KEYCLOAK_URL", "https://fallback-keycloak.example.com");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "fallback-realm");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "fallback-client");
    vi.stubEnv("VITE_ESPLORA_BASE_URL", "");

    vi.stubGlobal("window", undefined);

    const env = await loadEnv();

    expect(env.apiBaseUrl).toBe("https://fallback.example.com");
    expect(env.keycloakUrl).toBe("https://fallback-keycloak.example.com");
    expect(env.keycloakRealm).toBe("fallback-realm");
    expect(env.keycloakClientId).toBe("fallback-client");
    expect(env.esploraBaseUrl).toBe("https://esplora.minibill.tech");
  });

  it("throws a clear error when required env values are missing", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_KEYCLOAK_URL", "");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "");
    vi.stubGlobal("window", { __ENV__: {} });

    await expect(loadEnv()).rejects.toThrow(
      "Missing required environment variables: VITE_API_BASE_URL, VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID"
    );
  });

  it("accepts runtime required env values when build-time values are missing", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_KEYCLOAK_URL", "");
    vi.stubEnv("VITE_KEYCLOAK_REALM", "");
    vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "");

    vi.stubGlobal("window", {
      __ENV__: {
        VITE_API_BASE_URL: "https://runtime.example.com",
        VITE_KEYCLOAK_URL: "https://runtime-keycloak.example.com",
        VITE_KEYCLOAK_REALM: "runtime-realm",
        VITE_KEYCLOAK_CLIENT_ID: "runtime-client",
      },
    });

    const env = await loadEnv();

    expect(env.apiBaseUrl).toBe("https://runtime.example.com");
    expect(env.keycloakUrl).toBe("https://runtime-keycloak.example.com");
    expect(env.keycloakRealm).toBe("runtime-realm");
    expect(env.keycloakClientId).toBe("runtime-client");
  });
});
