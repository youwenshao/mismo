# Data Management and Retention

Comprehensive data management, retention, and self-maintenance for commercial-grade stability and long-term operation. This document covers DB pruning, in-memory state cleanup, write resilience, and automated retention.

## Overview

The system implements a layered approach to prevent unbounded growth:

1. **Database retention** — Automated pruning of time-series and log tables
2. **In-memory state pruning** — Farm-monitor alert cooldowns and commission failure tracking
3. **Write resilience** — Circuit breaker and timeouts for metrics writes
4. **Health self-check** — Liveness endpoint and staleness detection
5. **Redundancy** — Both GitHub Actions cron and inline farm-monitor retention

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Farm Monitor Process                                             │
│  • Resource / API / Build / Security collectors                  │
│  • Maintenance interval (10 min): prune sentAlerts, failures    │
│  • Staleness detection: P0 alert if any collector misses 3×     │
│  • Daily inline DB retention (belt-and-suspenders)              │
│  • /health HTTP endpoint (port 3006)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ MetricsWriter (with resilience)                                   │
│  • 10s write timeout per insert                                 │
│  • Circuit breaker: 5 failures → 60s cooldown                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Actions: data-retention.yml                                │
│  • Daily at 03:00 UTC                                            │
│  • Runs pnpm --filter @mismo/db db:retention                     │
│  • Slack notification on failure                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    PostgreSQL / Supabase
```

## Database Retention

### Retention Policy

| Table             | Retention             | Notes                            |
| ----------------- | --------------------- | -------------------------------- |
| BuildLog          | 90 days               | Build execution logs             |
| AuditLog          | 365 days              | User/action audit trail          |
| Credential        | 30 days post-delivery | From completed commissions       |
| StudioMetrics     | 30 days               | CPU/RAM/disk/queue metrics       |
| ApiHealthSnapshot | 30 days               | Kimi, Supabase, GitHub health    |
| MonitoringAlert   | 90 days               | Resolved alerts only             |
| TokenUsage        | 180 days              | Token spend tracking             |
| Notification      | 90 days               | Sent notification records        |
| InterviewSession  | 7 days post-expiry    | Completed, expired sessions only |

### Running Retention

**Manual run:**

```bash
pnpm --filter @mismo/db db:retention
```

**Automated:**

- **GitHub Actions:** `.github/workflows/data-retention.yml` runs daily at 03:00 UTC. Requires `DATABASE_URL`, `DIRECT_URL`, and optionally `SLACK_ALERT_WEBHOOK_URL` secrets.
- **Inline (farm-monitor):** Runs once per 24 hours from the farm-monitor process. Covers StudioMetrics, ApiHealthSnapshot, MonitoringAlert.

**Batch deletion:** Large tables use batch deletion (1000 rows per batch for Prisma script, 500 for Supabase) to avoid long-running transactions and table locks.

### Script Location

- **Full retention:** `packages/db/scripts/data-retention.ts`
- **Inline (farm-monitor):** `packages/farm-monitor/src/maintenance/db-retention.ts`

## Farm-Monitor Memory Management

### In-Memory Pruning

| Structure          | Pruning                                     | Interval            |
| ------------------ | ------------------------------------------- | ------------------- |
| sentAlerts         | Entries older than 2× priority cooldown     | Every 10 min        |
| commissionFailures | Entries older than 24 hours                 | Every 10 min        |
| recentResults      | Entries outside SUCCESS_RATE_WINDOW_MS      | Each build check    |
| workerRestarts     | Timestamps outside WORKER_RESTART_WINDOW_MS | Each resource check |

Cooldowns: P0 = 5 min, P1 = 15 min, P2 = 60 min.

### MetricsWriter Resilience

- **Write timeout:** 10 seconds per insert. Prevents hanging promises if the DB is slow.
- **Circuit breaker:** After 5 consecutive write failures, all writes are paused for 60 seconds. Logs a warning and auto-recovers afterward.

## Health Endpoint

Farm-monitor exposes a lightweight HTTP server for liveness checks:

```
GET http://<host>:3006/health
```

**Environment:** `FARM_MONITOR_HEALTH_PORT` (default: 3006)

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "memoryMb": { "heapUsed": 45, "heapTotal": 60, "rss": 80 },
  "sentAlerts": 12,
  "lastChecks": {
    "resource": "2026-03-04T10:00:00.000Z",
    "api": "2026-03-04T10:00:30.000Z",
    "build": "2026-03-04T10:00:30.000Z",
    "security": "2026-03-04T10:05:00.000Z"
  },
  "lastRetentionRun": "2026-03-04T03:00:00.000Z"
}
```

Use this for load balancer health checks, Kubernetes liveness probes, or external monitoring.

## Staleness Detection

If any collector (resource, api, build, security) does not complete a check within **3× its expected interval**, the farm-monitor:

1. Logs an error to stdout
2. Sends a P0 RESOURCE alert via the alert router

Intervals: resource 2 min, api 30s, build 30s, security 5 min. Thresholds: 6 min, 90s, 90s, 15 min respectively.

## Configuration

### Required Secrets (GitHub Actions)

| Secret                  | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| DATABASE_URL            | Prisma connection string                     |
| DIRECT_URL              | Direct Postgres connection for migrations    |
| SLACK_ALERT_WEBHOOK_URL | Optional; notified on retention cron failure |

### Farm-Monitor Environment

| Variable                 | Default | Purpose                 |
| ------------------------ | ------- | ----------------------- |
| FARM_MONITOR_HEALTH_PORT | 3006    | Health HTTP server port |

Supabase credentials for MetricsWriter and DbRetention use the same env vars as the rest of the farm-monitor (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or equivalents).

## Related Documentation

- [Agent Farm Monitoring](../agent-farm-monitoring.md) — Monitoring rules and alert routing
- [Maintenance & Setup](./maintenance-and-setup.md) — Recurring ops tasks
- [System Startup](./runbooks/system-startup.md) — Bringing up the stack
