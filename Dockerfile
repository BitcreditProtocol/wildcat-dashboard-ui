ARG NODE_ENV
ARG VITE_MODE

FROM node:26-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS builder
ARG NODE_ENV
ARG VITE_MODE
ENV NODE_ENV=${NODE_ENV:-production}
ENV VITE_MODE=${VITE_MODE:-production}

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-fund --no-audit --include=dev

COPY . .

RUN npm run build -- --mode=${VITE_MODE}

FROM nginx:1.31.8-alpine@sha256:785835ea65db4bba6f021acc0f3be91b0fef76a53fe41f8588c6698d2aed0606

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
