# wildcat-dashboard-ui

## Development

Prerequisite: Node.js 26.x and npm 11.x (see `.nvmrc` and `packageManager` in
`package.json`). Run `nvm install` and `nvm use` to select the version in `.nvmrc`,
which CI also uses.

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

Docker uses digest-pinned Node.js and nginx images, updated by Dependabot.
CI checks that the Docker Node major matches `.nvmrc`. Local `.env` files are
excluded from the build context; Compose still reads `.env` for runtime settings.

Set `VITE_ESPLORA_BASE_URL` in `.env` to select a transaction explorer. Compose
passes it into `/config.js` at startup; unset or empty values keep the default,
`https://esplora.minibill.tech`.

To build the image and validate its entrypoint and nginx configuration locally:

```shell
docker build --pull -t wildcat-dashboard-ui:ci .
docker run --rm wildcat-dashboard-ui:ci nginx -t
```

The scoped `js-yaml` override patches the OpenAPI parser dependency. Remove it
once the upstream dependency requires 4.3.2 or newer and `npm audit` stays clean.

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
