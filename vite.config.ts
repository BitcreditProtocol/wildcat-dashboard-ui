import path from "path";
import { defineConfig as defineViteConfig, loadEnv, mergeConfig } from "vite";
import { defineConfig as defineVitestConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
      react(),
      tailwindcss(),
      {
        name: "crowdin-in-context-tooling",
        transformIndexHtml(html: string) {
          if (env.VITE_BITCR_DEV_INCLUDE_CROWDIN_IN_CONTEXT_TOOLING === "true") {
            html = html.replace(
              "</head>",
              `<script type="text/javascript">
                            var inContextToolAllowedHosts = ['localhost', '127.0.0.1', 'dashboard.wildcat0.clowder-dev.minibill.tech', 'wildcat-dashboard.pages.dev'];
                            if (inContextToolAllowedHosts.indexOf(location.hostname) !== -1 && localStorage.getItem('live_translations') === 'enabled') {
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
  };

  return mergeConfig(viteConfig, vitestConfig);
});
