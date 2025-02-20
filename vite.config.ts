import path from "path"
import { defineConfig as defineViteConfig, mergeConfig } from "vite"
import { defineConfig as defineVitestConfig, configDefaults } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
const viteConfig = defineViteConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

const vitestConfig = defineVitestConfig({
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ['./vitest-setup.ts'],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
    },
    exclude: [...configDefaults.exclude],
  },
})

export default mergeConfig(viteConfig, vitestConfig)
