# Mismo Internal Dashboard

Internal development and operations dashboard for the Mismo agentic agency. Requires ADMIN or ENGINEER role.

## Running

```bash
pnpm dev
# or from repo root:
pnpm --filter @mismo/internal dev
```

Runs on **http://localhost:3001**. Auth redirects unauthenticated users to the main app login.

## Mission Control

| Route | Description |
|-------|-------------|
| `/` | Overview — active projects, pending reviews, total clients |
| `/fleet` | Fleet status — Studio 1–3 metrics, CPU/RAM/Disk, active builds, queue depth |
| `/commissions` | Commission pipeline — kanban (Interview → Queued → Building → Testing → Delivered), drag-and-drop |
| `/commissions/[id]` | Commission detail — PRD summary, risk panel, build history, verification status, ETA |
| `/commissions/[id]/graph` | GSD dependency graph — DAG visualization, critical path, parallelization suggestions |
| `/agents` | Agent performance — success rate, build time by archetype, error heatmap, quality scores |
| `/financials` | Financial telemetry — revenue, cost breakdown, profit by archetype, cost alerts |
| `/alerts` | Alert history — critical path blocked, architecture drift, cost overrun |

## Requirements

- Supabase auth (user with ADMIN or ENGINEER role)
- Database with migrations applied (StudioMetrics, AuditLog, Commission.feasibilityScore)
- `STRIPE_SECRET_KEY` for Financials page (optional; uses tier pricing fallback)

## Seed Demo Data

```bash
pnpm --filter @mismo/db db:seed-mission-control
```

## Stack

- Next.js 16 (App Router)
- Supabase Auth + Realtime
- Prisma (via @mismo/db)
- Recharts, @xyflow/react, @dnd-kit
- Tailwind CSS

## Documentation

See [docs/mission-control-dashboard.md](../../docs/mission-control-dashboard.md) for API routes, alert conditions, and data sources.
