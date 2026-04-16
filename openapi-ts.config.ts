import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "opt/wildcat/openapi.json",
  output: {
    format: "biome",
    lint: "eslint",
    path: "./src/generated/client",
  },
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/sdk",
    /* '@hey-api/schemas', {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },*/
    "@tanstack/react-query",
  ],
});
