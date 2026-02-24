# Mismo

Hybrid human-AI software development platform. Transform ideas into production-ready web applications through a "Vibe-to-Verified" pipeline.

## Architecture

Turborepo monorepo with pnpm workspaces.

| Package | Description |
|---------|-------------|
| `apps/web` | Client-facing Next.js app (Mo interview, PRD editor, dashboards) |
| `apps/internal` | Internal dev team dashboard |
| `packages/db` | Prisma schema, migrations, database client |
| `packages/ai` | Mo interview agent, safety classifier, spec generator |
| `packages/shared` | Shared TypeScript types and constants |
| `packages/ui` | Shared UI component library |
| `packages/templates` | Pre-audited project architecture templates |

## Getting Started

```bash
# Quickstart (install, generate Prisma, start dev servers)
pnpm quickstart
```

Or step by step:

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Fill in your environment variables

# Generate Prisma client
pnpm --filter @mismo/db db:generate

# Run development servers
pnpm dev
```

## Scripts

```bash
pnpm quickstart   # Install, generate Prisma, start dev servers
pnpm build        # Build all packages
pnpm dev          # Start all dev servers
pnpm lint         # Lint all packages
pnpm type-check   # Type check all packages
pnpm format       # Format all files with Prettier
```
