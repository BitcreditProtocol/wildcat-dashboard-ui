import path from "path";
import { defineConfig as defineViteConfig, loadEnv, mergeConfig, type ViteDevServer } from "vite";
import { defineConfig as defineVitestConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  operatorBasicAuthMatches,
  operatorBasicAuthRequiredForPath,
  operatorFormAuthMatches,
  operatorSafeReturnTo,
  operatorSessionCookie,
  operatorSessionMatches,
} from "./operator-dev-auth";

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
            const url = new URL(request.url ?? "/", "http://localhost");
            const pathname = url.pathname;
            if (pathname === "/__operator-login" && request.method === "GET") {
              const returnTo = operatorSafeReturnTo(url.searchParams.get("returnTo"));
              response.statusCode = 200;
              response.setHeader("cache-control", "no-store");
              response.setHeader("content-type", "text/html; charset=utf-8");
              response.end(
                `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Operator login</title><style>body{margin:0;background:#080704;color:#f5f2ed;font:16px system-ui;display:grid;min-height:100vh;place-items:center}form{display:grid;gap:16px;width:min(360px,calc(100vw - 48px));padding:28px;border:1px solid #555;border-radius:12px;background:#19191b}h1{margin:0;font-size:24px}label{display:grid;gap:6px}input,button{font:inherit;padding:11px 12px;border-radius:7px}input{color:#fff;background:#0f0f10;border:1px solid #666}button{border:0;background:#f59d20;color:#17110a;font-weight:600;cursor:pointer}p{margin:0;color:#aaa;font-size:13px}</style></head><body><form method="post" action="/__operator-login"><h1>Local operator login</h1><p>This loopback-only demo fails closed until the operator token is verified.</p><input type="hidden" name="returnTo" value="${returnTo.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"><label>Username<input name="username" autocomplete="username" required value="operator"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Continue</button></form></body></html>`
              );
              return;
            }
            if (pathname === "/__operator-login" && request.method === "POST") {
              const chunks: Buffer[] = [];
              let size = 0;
              request.on("data", (chunk: Buffer) => {
                size += chunk.length;
                if (size <= 4096) chunks.push(chunk);
              });
              request.on("end", () => {
                if (size > 4096) {
                  response.statusCode = 413;
                  response.end("Login request too large");
                  return;
                }
                const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
                const cookie = operatorSessionCookie(env.AI_CREDIT_OPERATOR_TOKEN);
                if (
                  !operatorFormAuthMatches(form.get("username") ?? "", form.get("password") ?? "", env.AI_CREDIT_OPERATOR_TOKEN) ||
                  cookie === null
                ) {
                  response.statusCode = 401;
                  response.setHeader("cache-control", "no-store");
                  response.end("Invalid operator credentials");
                  return;
                }
                response.statusCode = 303;
                response.setHeader("cache-control", "no-store");
                response.setHeader("set-cookie", `${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
                response.setHeader("location", operatorSafeReturnTo(form.get("returnTo")));
                response.end();
              });
              return;
            }
            if (
              !operatorBasicAuthRequiredForPath(pathname) ||
              operatorBasicAuthMatches(request.headers.authorization, env.AI_CREDIT_OPERATOR_TOKEN) ||
              operatorSessionMatches(request.headers.cookie, env.AI_CREDIT_OPERATOR_TOKEN)
            ) {
              next();
              return;
            }
            if (request.method === "GET" && request.headers.accept?.includes("text/html") === true) {
              response.statusCode = 303;
              response.setHeader("location", `/__operator-login?returnTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
              response.end();
              return;
            }
            response.statusCode = 401;
            response.setHeader("cache-control", "no-store");
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
          target: env.VITE_BITCR_DEV_AI_CREDIT_PROXY_TARGET || "http://127.0.0.1:8787",
          headers: { "x-ai-credit-operator-token": env.AI_CREDIT_OPERATOR_TOKEN || "" },
        },
        "/api/ai-credit/operator-decisions": {
          target: env.VITE_BITCR_DEV_AI_CREDIT_PROXY_TARGET || "http://127.0.0.1:8787",
          headers: { "x-ai-credit-operator-token": env.AI_CREDIT_OPERATOR_TOKEN || "" },
        },
        // Borrower routes carry no operator credential.
        "/api/ai-credit": env.VITE_BITCR_DEV_AI_CREDIT_PROXY_TARGET || "http://127.0.0.1:8787",
        // Whatever is serving the admin API locally, same-origin so no CORS is involved:
        // :4242 the BFF Envoy (real Keycloak token required), :4243 the admin aggregator directly
        // (no auth — Envoy is where auth lives), or the mint stub on :4242. Default is the BFF.
        "/v1/admin": env.VITE_BITCR_DEV_ADMIN_PROXY_TARGET || "http://127.0.0.1:4242",
      },
    },
  };

  return mergeConfig(viteConfig, vitestConfig);
});
