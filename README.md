# wildcat-dashboard-ui

## Development

Prerequisite: Node.js 24.22.1 LTS and npm 11.19.1 (bundled with Node.js).
Run `nvm install` and `nvm use` to select the version in `.nvmrc`, which is also
used by CI and Cloudflare deployments.

### Install

```
npm ci
```

### Run Development

```
npm run dev
```

### Run Docker

Copy `.env.example` to `.env` and adjust

```
just build
just run
```

Docker uses digest-pinned Node.js 24 LTS and nginx 1.31.8 images. When updating
Node.js, keep the Dockerfile, `.nvmrc`, package engines, and Node.js type definitions
aligned. Docker reads runtime settings from the container environment;
local `.env` files are excluded from the build context (Compose still reads
`.env`); the tracked `.env.development` and `.env.example` files remain available.

The `js-yaml` override keeps the OpenAPI generator's pinned parser dependency on
the patched 4.x release. Remove it once the upstream dependency requires 4.3.2 or
newer and `npm audit` remains clean.

### shadcn

Add a shadcn component:

```shell
npx shadcn@canary add button
```

## Configuration

`VITE_API_BASE_URL="http://localhost:4242"` needs to point to the Wildcat BFF Dashboard Envoy Service

```
VITE_KEYCLOAK_URL=http://localhost:8080/
VITE_KEYCLOAK_REALM=dev
VITE_KEYCLOAK_CLIENT_ID=bff-dashboard
```

These are the keycloak url and realm settings for the JWT tokens authenticated by the Wildcat Dashboard Envoy service.

## Resources

- React: https://react.dev/
- Vite: https://vite.dev/
- Tailwind: https://tailwindcss.com/
- Shadcn: https://ui.shadcn.com/docs/tailwind-v4
