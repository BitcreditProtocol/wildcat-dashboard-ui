ARG NODE_ENV
ARG VITE_MODE

FROM node:26-slim@sha256:36793bcbb160a6a16cede1e62b93f84e26b78a972a8a4c0b879c1c12f22761ec AS builder
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
