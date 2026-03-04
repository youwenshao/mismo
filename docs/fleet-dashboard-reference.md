# Fleet Dashboard Reference

Reference for interpreting the fleet status dashboard (Mission Control → `/fleet`), including studio roles, status meanings, and expected states.

## Architecture Overview

| Studio               | Role            | Hardware            | Purpose                                                                                                        |
| -------------------- | --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Studio 1 (Main)**  | `control-plane` | M4 Max, 48 GB RAM   | Runs n8n-main, PostgreSQL, Redis, Farm-Monitor, and other management services. **Does not run build workers.** |
| **Studio 2 (Build)** | `worker`        | M2 Ultra, 64 GB RAM | Dedicated build node. Runs n8n-worker + Contract-Checker.                                                      |
| **Studio 3 (QA)**    | `worker`        | M2 Ultra, 64 GB RAM | Dedicated build node. Runs n8n-worker + Contract-Checker.                                                      |

Configuration lives in `packages/shared/src/constants.ts` (`FLEET_CONFIG`).

## Worker Status Display

The dashboard shows one of three worker states per studio:

| Display         | Meaning                                        | When Shown                                         |
| --------------- | ---------------------------------------------- | -------------------------------------------------- |
| **No worker**   | Studio is not configured to run a build worker | `workerConcurrency === 0` (Studio 1)               |
| **Worker up**   | n8n-worker container is running                | Worker studio with container name containing `n8n` |
| **Worker down** | Worker studio but n8n-worker not detected      | Worker studio with no matching container           |

Studio 1 is a control-plane node, so it will always show **"No worker"**. This is expected, not an error.

## Container Counts

- **Studio 1**: Typically 7 containers (n8n-main, PostgreSQL, Redis, BMAD-Validator, GSD-Dependency, Farm-Monitor, Docker Registry).
- **Studios 2 & 3**: Typically 2 containers each (n8n-worker, Contract-Checker).

The farm-monitor counts containers via SSH: `docker ps --format '{{.Names}}' | wc -l`.

## Expected Idle State

When the system is idle (no builds in queue):

- **Studio 1**: Online, 7 containers, **"No worker"**, low CPU/RAM.
- **Studio 2**: Online, 2 containers, **"Worker up"**, low CPU/RAM.
- **Studio 3**: Online, 2 containers, **"Worker up"**, low CPU/RAM.
- **Queue depth**: 0.

## Queue Depth

Queue depth is a **fleet-wide** Redis value (`bull:n8n:wait`). All studios report the same number; the dashboard takes `Math.max(0, ...)` across studios rather than summing. The "Queue depth over time" chart displays this single value, with time labels in **Hong Kong time (GMT+8)**.

## Gauges and Colors

- **CPU, RAM, Disk**: Full-circle gauges. 100% = full circle.
- **Color gradient**: Green (low) → amber (medium) → red (high utilization).

## Key Implementation Files

| Component                                  | Path                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| Fleet config (roles, RAM, services)        | `packages/shared/src/constants.ts`                   |
| farm-monitor config (SSH hosts, intervals) | `packages/farm-monitor/src/config.ts`                |
| Resource collector (SSH, Docker metrics)   | `packages/farm-monitor/src/collectors/resource.ts`   |
| Dashboard studio card (worker status UI)   | `apps/internal/src/components/fleet/studio-card.tsx` |
| Fleet details API                          | `apps/internal/src/app/api/fleet/details/route.ts`   |

## Troubleshooting Notes

### farm-monitor startup

- **DbRetention**: The `./maintenance/db-retention` module was removed; it was causing `MODULE_NOT_FOUND`. DB retention is not currently run by farm-monitor.
- **Environment**: farm-monitor loads `.env` from the monorepo root via `packages/farm-monitor/src/env.ts`. Uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Config getters**: `ssh` and `supabase` in `config.ts` are getters so `process.env` is read at runtime after dotenv loads.

### SSH and Docker collection

- **Studio IPs**: `STUDIO_1_SSH_HOST`, `STUDIO_2_SSH_HOST`, `STUDIO_3_SSH_HOST` in `.env`.
- **SSH key**: Default `~/.ssh/mismo_ed25519`; `SSH_PASSPHRASE` empty if key is unencrypted.
- **Docker PATH**: Remote SSH sessions may not have `/usr/local/bin` in PATH. The resource collector prepends `export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin;` to Docker commands.
- **Container name**: Worker container is discovered dynamically via `docker ps --filter name=n8n-worker`. Restart count comes from `docker inspect <name> --format '{{.RestartCount}}'`.

### Queue depth

- Redis errors or timeouts return `0`, not `-1`. The dashboard clamps historical negative values to 0 for chart display.

## Related Documentation

- [agent-farm-monitoring.md](./agent-farm-monitoring.md) — Monitoring rules, alerts, auto-heal
- [mission-control-dashboard.md](./mission-control-dashboard.md) — Full Mission Control feature overview
