FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/db ./packages/db
COPY packages/gsd-dependency ./packages/gsd-dependency
RUN pnpm install --frozen-lockfile
WORKDIR /app/packages/db
RUN pnpm db:generate
WORKDIR /app/packages/gsd-dependency
EXPOSE 3000
CMD ["pnpm", "start"]
