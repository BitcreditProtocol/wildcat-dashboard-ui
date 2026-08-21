import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig as defineViteConfig, loadEnv, mergeConfig } from "vite";
import { defineConfig as defineVitestConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const vitestConfig = defineVitestConfig({
  test: {
    environment: "jsdom",
    env: {
      VITE_API_BASE_URL: "https://api.test.example.com",
      VITE_KEYCLOAK_URL: "https://keycloak.test.example.com",
      VITE_KEYCLOAK_REALM: "test-realm",
      VITE_KEYCLOAK_CLIENT_ID: "test-client",
    },
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
    },
    exclude: [...configDefaults.exclude],
  },
});

// https://vite.dev/config/
export default defineViteConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const adminTarget = env.VITE_BITCR_DEV_ADMIN_PROXY_TARGET || "http://127.0.0.1:4242";
  const keycloakTarget = env.VITE_BITCR_DEV_KEYCLOAK_PROXY_TARGET || "http://127.0.0.1:8080";
  const keycloakProxy = { target: keycloakTarget, xfwd: true };
  const aiCreditProxy =
    env.VITE_API_MOCKING_ENABLED === "true"
      ? {
          target: env.VITE_BITCR_DEV_AI_CREDIT_PROXY_TARGET || "http://127.0.0.1:8787",
          // Explicit dev-only auth bypass; normal builds send the Keycloak bearer to Envoy.
          headers: { "x-ai-credit-operator-token": env.AI_CREDIT_OPERATOR_TOKEN || "" },
        }
      : adminTarget;
  const proxy = {
    "/api/ai-credit": aiCreditProxy,
    "/v1/admin": adminTarget,
    "/realms": keycloakProxy,
    "/resources": keycloakProxy,
  };

  const viteConfig = {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "crowdin-in-context-tooling",
        transformIndexHtml(html: string) {
          if (env.VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING === "true") {
            html = html.replace(
              "</head>",
              `<script type="text/javascript">
                            if (localStorage.getItem('live_translations') === 'enabled') {
                              var _jipt = [];
                              _jipt.push(['project', 'wildcat-dashboard']);
                      
                              var jiptScript = document.createElement('script');
                              jiptScript.type = 'text/javascript';
                              jiptScript.src = '//cdn.crowdin.com/jipt/jipt.js';
                              document.head.appendChild(jiptScript);
                            }
                          </script>
                        </head>`
            );
          }

          return html;
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    server: {
      // Whatever is serving the admin API locally, same-origin so no CORS is involved:
      // :4242 the BFF Envoy (real Keycloak token required), :4243 the admin aggregator directly
      // (no auth — Envoy is where auth lives), or the mint stub on :4242. Default is the BFF.
      proxy,
    },
    preview: { proxy },
  };

  return mergeConfig(viteConfig, vitestConfig);
});
