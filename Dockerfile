ARG NODE_ENV
ARG VITE_MODE

FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS builder
ARG NODE_ENV
ARG VITE_MODE
ENV NODE_ENV=${NODE_ENV:-production}
ENV VITE_MODE=${VITE_MODE:-production}

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-fund --no-audit --include=dev

COPY . .

RUN npm run build -- --mode=${VITE_MODE}

FROM nginx:1.31.8-alpine@sha256:e2d97c2b8c016f12c2f1a27d095685063b2f281c4edf2babfde6001cf4fb77a8

RUN apk add --no-cache jq

COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker/entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh

COPY docker/nginx/snippets/proxy-params.conf /etc/nginx/snippets/proxy-params.conf
# each time nginx is started it will perform variable substition in all template
# files found in `/etc/nginx/templates/*.template`, and copy the results (without
# the `.template` suffix) into `/etc/nginx/conf.d/`.
COPY docker/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
