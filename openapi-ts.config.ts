import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'opt/wildcat/__dev_openapi.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/generated/client',
  },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/sdk',
    /* '@hey-api/schemas', {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },*/
    '@tanstack/react-query',
  ],
})
