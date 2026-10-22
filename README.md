# wildcat-dashboard-ui

## Development

Prerequisite: Node.js 26.x and npm 11.x (validated with Node 26.12.1 / npm 11.20.0).
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

Docker uses digest-pinned Node.js 26 and nginx 1.31.8 images. `.nvmrc` tracks the
Node 26 release line; CI checks that the Docker tag uses the same major. Dependabot
refreshes the pinned image digest. Keep package engines and Node.js type
definitions aligned when changing major versions. Docker reads runtime settings
from the container environment;
local `.env` files are excluded from the build context (Compose still reads
`.env`); the tracked `.env.development` and `.env.example` files remain available.

Set `VITE_ESPLORA_BASE_URL` in `.env` to select a transaction explorer. Compose
passes it to the container and the entrypoint writes it into `/config.js` at
startup. Leave it empty to use the application's default explorer.

To run the container checks locally (Docker with Compose and Python 3 required):

```shell
docker build --pull -t wildcat-dashboard-ui:ci .
python3 .github/scripts/smoke_container.py wildcat-dashboard-ui:ci
```

The smoke test checks nginx configuration, page and asset serving, SPA routing,
and runtime settings with custom and empty explorer URLs. It uses temporary
containers on random localhost ports and removes them afterward.

The `js-yaml` override is scoped to `@hey-api/json-schema-ref-parser` and keeps
the OpenAPI generator's pinned parser dependency on the patched 4.x release.
Remove it once the upstream dependency requires 4.3.2 or
newer and `npm audit` remains clean.

### CI and deployments

Every pull request and push to `dev` runs application validation and a Docker
build and smoke test through CI. A push to `master` runs these checks once through
the deployment workflow, with Codecov uploads, before deployment. Standalone CI
does not also trigger on master pushes.

The reusable CI workflow gates all GitHub Actions Cloudflare deployments,
including manual and tag runs. Those jobs deploy the same commit SHA that passed
validation. Manual and tag runs skip Codecov uploads. Reusable CI receives only
the Codecov token, not deployment secrets. Invalid manual deployment targets fail
before CI starts. All Node setup steps use `.nvmrc`, so GitHub `NODE_VERSION`
variables do not control these workflows.
A newer deployment run for the same Git ref cancels the older run, including its
CI jobs, so slower checks cannot deploy an older commit afterward.

Nightly and release workflows build and publish images without rerunning the full
CI suite. Their existing nightly tests stay independent of deployment-gate tests,
which run in CI only. A failed Docker build prevents publishing.

Cloudflare Pages' native Git integration is separate: its automatic previews do
not wait for these GitHub Actions gates. To require CI for every deployment,
disable automatic Git deployments in the Cloudflare project settings and use the
gated GitHub Actions workflow. Repository workflow changes do not alter that
Cloudflare setting.

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
