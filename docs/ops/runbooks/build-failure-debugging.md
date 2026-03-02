# Runbook: Build Failure Debugging

This runbook provides step-by-step instructions for troubleshooting and resolving build issues within the Mismo agentic build system.

---

## 🔍 Troubleshooting Overview

Build failures are usually categorized as follows:

1.  **System Failures**: Infrastructural issues (Tailscale, n8n, Supabase).
2.  **External Failures**: LLM or third-party API issues (Kimi API, GitHub).
3.  **Agent Failures**: Logic errors within agent task execution.
4.  **Contract Failures**: BMAD or Contract-Checker validation failures.

---

## ⚙️ Step 1: Health Check

Verify the overall system health.

**Kimi API (Moonshot AI):**
- Check [Moonshot AI Status](https://status.moonshot.cn/)
- Manual check: `curl -H "Authorization: Bearer $KIMI_API_KEY" https://api.moonshot.cn/v1/models`

**Supabase:**
- Check [Supabase Status](https://status.supabase.com/)
- Check `prisma.user.findFirst()` connectivity.

**Tailscale Connectivity:**
- On Studio 1: `tailscale ping studio-2`
- On Studio 2: `tailscale ping studio-1`

---

## ⚙️ Step 2: farm-monitor Log Inspection

The `farm-monitor` service captures build-level failures.

```bash
docker compose -f docker-compose.main.yml logs -f farm-monitor
```

**Common Alert Patterns:**
- `ALERT: Kimi API latency > 5000ms`
- `ALERT: Studio 2 RAM > 90%`
- `ALERT: Hung build [buildId] detected (no progress for 30m)`

---

## ⚙️ Step 3: Agent Log Inspection (n8n)

When a specific build fails, inspect the execution logs in the n8n UI.

1.  Go to `Executions` in the n8n sidebar.
2.  Filter by `Workflow: GSD Build Pipeline`.
3.  Identify the failed node (e.g., `GsdDependencyChecker` or `FrontendDeveloperAgent`).
4.  Review the `Error Object` for stack traces.

---

## ⚙️ Step 4: Common Resolutions

| Issue | Resolution |
|-------|------------|
| **Kimi API Timeout** | `farm-monitor` auto-retries. If persistent, check billing at Moonshot AI. |
| **Worker Connectivity Loss** | `tailscale status`. Restart tailscaled if needed: `sudo brew services restart tailscale`. |
| **Docker Build Failures** | `docker system prune -f` on the failing worker node. |
| **BMAD Validation Failure** | Review the `bmad-validator` logs. Check for missing or ambiguous PRD requirements. |

---

## ⚙️ Step 5: Manual Build Recovery

If a build is stuck in `RUNNING` but has failed silently:

1.  Update the `Build` table in Supabase: `status = 'FAILED'`, `errorLogs = { "manual_reset": true }`.
2.  The `notify_n8n_commission_completed` trigger will fire, and the pipeline will either retry or alert.
3.  If a partial build exists on a worker node, clear it: `rm -rf /tmp/mismo-build/[buildId]`.
