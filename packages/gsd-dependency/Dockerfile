FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/db ./packages/db
COPY packages/gsd-dependency ./packages/gsd-dependency
RUN pnpm install --frozen-lockfile
WORKDIR /app/packages/db
RUN pnpm db:generate

FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/gsd-dependency ./packages/gsd-dependency
USER app
EXPOSE 3000
WORKDIR /app/packages/gsd-dependency
CMD ["npx", "pnpm", "start"]
