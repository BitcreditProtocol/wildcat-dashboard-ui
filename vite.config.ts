import path from "path";
import { defineConfig as defineViteConfig, loadEnv, mergeConfig, type ViteDevServer } from "vite";
import { defineConfig as defineVitestConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { operatorBasicAuthMatches, operatorBasicAuthRequiredForPath } from "./operator-dev-auth";

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

  const viteConfig = {
    plugins: [
      {
        name: "operator-dev-auth",
        configureServer(server: ViteDevServer) {
          server.middlewares.use((request, response, next) => {
            const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
            if (
              !operatorBasicAuthRequiredForPath(pathname) ||
              operatorBasicAuthMatches(request.headers.authorization, env.AI_CREDIT_OPERATOR_TOKEN)
            ) {
              next();
              return;
            }
            response.statusCode = 401;
            response.setHeader("cache-control", "no-store");
            response.setHeader("www-authenticate", 'Basic realm="AI Credit operator", charset="UTF-8"');
            response.end("Operator authentication required");
          });
        },
      },
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
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api/ai-credit/workbench-decisions": {
          target: "http://127.0.0.1:8787",
          headers: { "x-ai-credit-operator-token": env.AI_CREDIT_OPERATOR_TOKEN || "" },
        },
        "/api/ai-credit/operator-decisions": {
          target: "http://127.0.0.1:8787",
          headers: { "x-ai-credit-operator-token": env.AI_CREDIT_OPERATOR_TOKEN || "" },
        },
        // Borrower routes carry no operator credential.
        "/api/ai-credit": "http://127.0.0.1:8787",
        // Whatever is serving the admin API locally, same-origin so no CORS is involved:
        // :4242 the BFF Envoy (real Keycloak token required), :4243 the admin aggregator directly
        // (no auth — Envoy is where auth lives), or the mint stub on :4242. Default is the BFF.
        "/v1/admin": env.VITE_BITCR_DEV_ADMIN_PROXY_TARGET || "http://127.0.0.1:4242",
      },
    },
  };

  return mergeConfig(viteConfig, vitestConfig);
});
