ARG NODE_ENV
ARG VITE_MODE

FROM node:24.2.0-slim AS builder
ARG NODE_ENV
ARG VITE_MODE
ENV NODE_ENV=${NODE_ENV:-production}
ENV VITE_MODE=${VITE_MODE:-production}

WORKDIR /app

COPY package*.json ./

RUN npm install --no-fund --no-audit --include=dev

COPY . .

RUN npm run build -- --mode=${VITE_MODE}

FROM nginx:1.27.5-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker/nginx/snippets/proxy-params.conf /etc/nginx/snippets/proxy-params.conf
# each time nginx is started it will perform variable substition in all template
# files found in `/etc/nginx/templates/*.template`, and copy the results (without
# the `.template` suffix) into `/etc/nginx/conf.d/`.
COPY docker/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
