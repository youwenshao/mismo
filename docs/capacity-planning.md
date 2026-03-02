# Capacity Planning: Mismo Build Farm

## Current Topology

| Studio | Hardware | Role | n8n Workers | Key Services |
|--------|----------|------|-------------|--------------|
| Studio 1 | M4 Max (128GB) | Control Plane | 0 | n8n-main, Redis, PostgreSQL, BMAD-Validator, GSD-Dependency, Farm-Monitor, Docker Registry |
| Studio 2 | M2 Ultra (192GB) | Worker | 25 | n8n-worker, Contract-Checker |
| Studio 3 | M2 Ultra (192GB) | Worker | 25 | n8n-worker, Contract-Checker |

**Total worker concurrency:** 50 slots across 2 Studios.

## Measured Capacity

> Run `scripts/load-test/concurrent-builds.ts` and `scripts/load-test/sequential-baseline.ts`
> to populate these numbers.

| Metric | Value | Notes |
|--------|-------|-------|
| Max concurrent builds sustained | _TBD_ | Target: 10 |
| Avg single-build duration | _TBD_ | From sequential baseline |
| 10-concurrent wall time | _TBD_ | From concurrent test |
| Speedup factor (seq/concurrent) | _TBD_ | Target: >3x |
| Estimated daily throughput | _TBD_ | = 86400 / avg_duration * concurrency_factor |

## Resource Utilization Per Build

| Resource | Avg Per Build | Peak Per Build | Notes |
|----------|---------------|----------------|-------|
| RAM | ~2-4 GB | ~6 GB | Kimi SDK + Docker build workspace |
| CPU time | ~5-15 min | ~30 min | Varies by archetype |
| Kimi tokens | Build.kimiqTokensUsed | 3x TOKEN_BUDGET_PER_FEATURE triggers alert | Budget = 100k tokens/feature |
| Disk I/O | ~500 MB | ~2 GB | Git clone + Docker layers |
| Network out | ~100 MB | ~500 MB | API calls + Docker push |

## Bottleneck Analysis (Ranked)

### 1. Kimi API Rate Limits (Primary)

The Moonshot API does not publish public rate limits for concurrent requests.
At 10 concurrent builds, each firing 3-5 parallel Kimi requests, the system
generates 30-50 simultaneous API calls.

**Mitigation:** `packages/ai/src/providers/rate-limiter.ts` implements a semaphore
capped at `KIMI_MAX_CONCURRENT` (default: 20) with exponential backoff on 429
responses. The farm-monitor auto-failover switches to DeepSeek when Kimi degrades.

### 2. Redis Throughput (Secondary)

Redis 7 on Studio 1 handles BullMQ queue operations for all builds. At 10
concurrent builds, queue operations are lightweight (LPUSH/BRPOP) but the
single-instance architecture is a SPOF.

**Metrics to watch:** `redis_ops_per_sec`, `redis_queue_depth` from the load
test monitor.

**Mitigation:** Redis `appendonly yes` ensures data persistence across restarts.
Workers reconnect within 30s (`QUEUE_BULL_REDIS_TIMEOUT`).

### 3. Database Connection Pool (Tertiary)

Supabase Supavisor (PgBouncer) on port 6543 pools connections. Each build
interacts with Supabase for status updates and data reads. At 10 builds,
connection usage stays well within typical Supabase limits (200-400 connections).

**Mitigation:** Prisma uses pooled `DATABASE_URL` (port 6543). No explicit
pool size override needed at current scale.

### 4. Disk I/O for Docker Builds

Each build may trigger Docker image creation. Without a shared registry, each
Studio rebuilds layers from scratch.

**Mitigation:** Local Docker Registry on Studio 1 (`registry:2` on port 5000)
enables cross-Studio layer caching with `--cache-from`.

### 5. Git Clone Bandwidth

Repo surgery clones use `--depth=1` (shallow) by default, reducing clone time
from ~30s to ~5s for typical repositories.

## Scaling Triggers

Automated alerts are configured in the farm-monitor via `CAPACITY_THRESHOLDS`
in `packages/shared/src/constants.ts`:

| Trigger | Threshold | Duration | Alert | Action |
|---------|-----------|----------|-------|--------|
| Queue depth high | >20 pending jobs | >1 hour sustained | P1 | Consider adding Studio 4 |
| Daily capacity warning | >40 builds/day | — | P2 | Review throughput trends |
| RAM pressure | >85% | >5 min | P1 | Auto-reduce worker concurrency to 10 |
| Build success rate | <80% | Rolling 1hr window | P0 | Investigate failures |

### When to Add Studio 4

**Trigger:** BullMQ queue depth exceeds 20 for more than 1 hour, recurring
across multiple business days.

**Recommendation:**
- Hardware: M2 Ultra (192GB) to match Studios 2/3
- Role: Worker node
- Configuration: Deploy `docker-compose.worker.yml` pointing at Studio 1
- Expected capacity increase: +25 worker slots (+50% throughput)
- Estimated cost: $4,000 hardware + $50/month power/network

**Decision matrix:**

| Queue Depth (1hr avg) | Daily Build Volume | Action |
|-----------------------|-------------------|--------|
| <10 | <30 | No action needed |
| 10-20 | 30-50 | Monitor; optimize build durations |
| >20 sustained | >50 | Add Studio 4 |
| >40 sustained | >80 | Add Studio 4 + 5; consider Redis cluster |

## Failover Scenarios

### Studio 2 Failure

- **Impact:** 25 worker slots lost; builds in-flight will timeout
- **Recovery:** BullMQ redistributes pending jobs to Studio 3 automatically
- **Detection:** Farm-monitor detects via SSH health + stuck build checks (30s interval)
- **Time to recovery:** Stuck builds marked FAILED after `BUILD_STUCK_TIMEOUT_MS` (1hr)
- **Test:** `scripts/load-test/failover-worker-kill.ts`

### Studio 1 (Control Plane) Failure

- **Impact:** Queue paused; no new builds accepted; workers disconnect
- **Recovery:** Redis AOF persistence; workers auto-reconnect within 30s of restart
- **Test:** `scripts/load-test/failover-control-plane.ts`

### Internet Outage

- **Impact:** Kimi/GitHub/Supabase calls fail; builds cannot proceed
- **Recovery:** Farm-monitor triggers Kimi->DeepSeek failover; local queue persists
- **Test:** `scripts/load-test/failover-network.ts`

## Load Test Runbook

### Concurrent Build Test

```bash
# Terminal 1: Start the monitor
REDIS_HOST=192.168.1.101 REDIS_PASSWORD=xxx \
  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  STUDIO_1_SSH_HOST=192.168.1.101 STUDIO_2_SSH_HOST=192.168.1.102 STUDIO_3_SSH_HOST=192.168.1.103 \
  tsx scripts/load-test/monitor.ts > load-test-metrics.csv

# Terminal 2: Run the concurrent test
SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  N8N_WEBHOOK_BASE=http://192.168.1.101:5678/webhook \
  tsx scripts/load-test/concurrent-builds.ts
```

### Sequential Baseline

```bash
SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  N8N_WEBHOOK_BASE=http://192.168.1.101:5678/webhook \
  tsx scripts/load-test/sequential-baseline.ts
```

### Pass/Fail Criteria

| Metric | Threshold |
|--------|-----------|
| Total concurrent wall time | <2x single-build average |
| Redis queue depth | Never exceeds 50 |
| DB connections | <80% of Supavisor limit |
| Kimi API errors | <5% of total requests |
| Build success rate | 100% (all 10 complete) |
| RAM per Studio | <85% (no auto-reduction triggered) |

## Appendix: Configuration Reference

| Constant | Value | Source |
|----------|-------|--------|
| `QUEUE_DEPTH_SCALE_TRIGGER` | 20 | `packages/shared/src/constants.ts` |
| `QUEUE_DEPTH_SCALE_DURATION_MS` | 3,600,000 (1hr) | `packages/shared/src/constants.ts` |
| `DAILY_BUILD_CAPACITY_WARNING` | 40 | `packages/shared/src/constants.ts` |
| `BUILD_STUCK_TIMEOUT_MS` | 3,600,000 (1hr) | `packages/shared/src/constants.ts` |
| `KIMI_MAX_CONCURRENT` | 20 (env override) | `packages/ai/src/providers/rate-limiter.ts` |
| `QUEUE_BULL_REDIS_TIMEOUT` | 30,000 (30s) | `docker/n8n-ha/.env.example` |
| Worker concurrency per Studio | 25 | `docker/n8n-ha/docker-compose.worker.yml` |
