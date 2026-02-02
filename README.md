# wildcat-dashboard-ui

## Development

### Install
```
npm install
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
