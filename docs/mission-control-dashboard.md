# Mission Control Dashboard

The Mission Control Dashboard is an internal operations view for managing the agentic agency. It runs in `apps/internal` (port 3001) and requires ADMIN or ENGINEER role.

## Overview

| Feature             | Route                     | Description                                                                                                                                                                   |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fleet Status        | `/fleet`                  | Studio grid (Main, Build, QA), CPU/RAM/Disk gauges, active builds, queue depth. See [fleet-dashboard-reference.md](./fleet-dashboard-reference.md) for status interpretation. |
| Commission Pipeline | `/commissions`            | Kanban board with drag-and-drop status changes                                                                                                                                |
| Commission Detail   | `/commissions/[id]`       | PRD summary, build history, risk panel, verification status, ETA prediction                                                                                                   |
| Dependency Graph    | `/commissions/[id]/graph` | GSD task DAG visualization with critical path                                                                                                                                 |
| Agent Performance   | `/agents`                 | Success rate by type, build time by archetype, error heatmap, quality scores                                                                                                  |
| Financials          | `/financials`             | Revenue, cost breakdown, profit margins, cost alerts                                                                                                                          |
| Alerts              | `/alerts`                 | Active alert history (critical path blocked, architecture drift, cost overrun)                                                                                                |

## Prerequisites

- Supabase auth with at least one user in `ADMIN` or `ENGINEER` role
- Database: Run migrations (or `db:push`) so `StudioMetrics`, `AuditLog`, and `Commission.feasibilityScore`/`riskAssessment` exist
- `STRIPE_SECRET_KEY` in `.env` for Financials page (revenue aggregation)
- `NEXT_PUBLIC_SUPABASE_*` for Realtime subscriptions

## Data Sources

| Data           | Source                                                                                |
| -------------- | ------------------------------------------------------------------------------------- |
| Studio metrics | `StudioMetrics` table (populated by metrics agent or seed)                            |
| Active builds  | `Build` where `status = 'RUNNING'`                                                    |
| Queue depth    | `StudioMetrics.queueDepth` (or Redis when metrics agent pushes)                       |
| Revenue        | Approximated from tier pricing (`SERVICE_TIER_PRICING`) and `Commission.paymentState` |
| Costs          | `Build.kimiqTokensUsed` × cost/1k tokens + infrastructure overhead                    |
| GSD graph      | `Commission.prdJson.gsd_decomposition.tasks` or default task graph                    |

## Seed Data

To populate sample studio metrics and commissions for development:

```bash
pnpm --filter @mismo/db db:seed-mission-control
```

This creates:

- `StudioMetrics` readings for Studios 1–3 (30 points each)
- Sample commissions in various statuses
- Builds, deliveries, agents, archetypes
- Build logs for error heatmap

## API Routes

| Route                          | Method   | Purpose                                                   |
| ------------------------------ | -------- | --------------------------------------------------------- |
| `/api/fleet/metrics`           | GET      | Studio metrics, active builds, queue history              |
| `/api/commissions/[id]/status` | PATCH    | Update commission status (with audit log)                 |
| `/api/financials`              | GET      | Revenue, cost breakdown, profit by archetype, cost alerts |
| `/api/gsd/[id]/graph`          | GET      | GSD task graph nodes/edges for DAG visualization          |
| `/api/alerts`                  | GET      | Evaluate and return active alerts                         |
| `/api/predictions/[id]`        | GET      | ETA prediction for running builds                         |
| `/api/audit`                   | GET/POST | Audit log read/write                                      |

## Realtime

Supabase Realtime subscriptions for:

- `Build` table (INSERT, UPDATE)
- `Commission` table (UPDATE)
- `StudioMetrics` table (INSERT)

Fleet and Commission pages refresh automatically when data changes.

## Alert Conditions

| Alert                       | Condition                                    | Severity |
| --------------------------- | -------------------------------------------- | -------- |
| Critical path blocked       | Build RUNNING >15 min with no progress       | error    |
| Expected risk materializing | `feasibilityScore < 80` AND build FAILED     | warning  |
| Architecture drift          | Any `Delivery.contractCheckPassed === false` | error    |
| Cost overrun                | Build tokens > 3× estimate                   | warning  |

Alerts appear in the layout `AlertBar` (polls every 30s) and on `/alerts`.

## Kanban Status Mapping

- **Interview**: DRAFT, DISCOVERY
- **Queued**: IN_PROGRESS (build not RUNNING)
- **Building**: IN_PROGRESS with RUNNING/PENDING build
- **Testing**: ESCALATED
- **Delivered**: COMPLETED

## BMAD Feasibility

- Kanban cards show a warning icon when `feasibilityScore < 80`
- Commission detail shows an expandable Risk Assessment panel from `riskAssessment.items`
- Token usage warning when tokens exceed 80% of `TOKEN_BUDGET_PER_FEATURE × feature_count`

## Contract Verification

For each delivery, the commission detail shows:

- **Secret Scan**: `delivery.secretScanPassed`
- **BMAD Checks**: `delivery.bmadChecksPassed`
- **API Contract**: `delivery.contractCheckPassed`

## ETA Prediction

When a build is RUNNING, the commission detail shows an Estimated Delivery card. Logic:

1. Load historical builds for the same archetype
2. Use median completion time
3. Subtract elapsed time from build start
4. Return remaining minutes and confidence (high/medium/low based on sample size)

## Dependencies

- `recharts` — charts (gauges, bar, line, area)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — kanban drag-and-drop
- `@xyflow/react` — GSD dependency graph
- `stripe` — financial revenue (optional; uses tier pricing fallback if unset)
