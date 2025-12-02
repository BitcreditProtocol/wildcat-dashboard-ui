ARG NODE_ENV
ARG VITE_MODE

FROM node:24.2.0-slim@sha256:b30c143a092c7dced8e17ad67a8783c03234d4844ee84c39090c9780491aaf89 AS builder
ARG NODE_ENV
ARG VITE_MODE
ENV NODE_ENV=${NODE_ENV:-production}
ENV VITE_MODE=${VITE_MODE:-production}

WORKDIR /app

COPY package*.json ./

RUN npm install --no-fund --no-audit --include=dev

COPY . .

RUN npm run build -- --mode=${VITE_MODE}

FROM nginx:1.27.5-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10

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
