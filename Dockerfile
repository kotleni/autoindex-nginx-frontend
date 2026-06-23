FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM nginx:alpine

COPY --from=build /app/dist /var/www/
COPY nginx.conf /etc/nginx/conf.d/default.conf
