# n8n Workflow Generation & Deployment Pipeline

Reference documentation for the n8n workflow generation, testing, and deployment pipeline that produces automation workflows from PRD specifications.

---

## Overview

The pipeline automates the creation, secure credential handling, sandbox testing, and deployment of n8n workflows. It consists of:

1. **Workflow Generator Agent** — AI-powered generator that produces valid n8n JSON from PRD trigger events + actions
2. **Credential Manager** — Encrypted storage via pgsodium; clients fill credentials via secure form; never stored in Git
3. **Testing Sandbox** — Temporary Docker n8n instance with mock data execution, trace capture, infinite-loop detection
4. **Deployment** — Self-hosted export, managed n8n push, or standalone Node.js package
5. **Monitoring** — Error Trigger nodes ping a webhook when production workflows fail

---

## Prerequisites

- **Docker** — Required for the testing sandbox
- **pgsodium** — Enable in Supabase Dashboard → Database → Extensions; run `pnpm --filter @mismo/db db:setup-pgsodium` (see [Credential Encryption](#credential-encryption))
- **AI Provider** — At least one AI key (e.g. `DEEPSEEK_API_KEY`) for the Workflow Generator agent
- **Studio 3 (optional)** — For remote sandbox over Tailscale; otherwise sandbox runs locally

---

## Components

### 1. Workflow Generator

**Location:** `packages/ai/src/n8n/generator.ts`

**Input (`WorkflowRequest`):**

| Field | Type | Description |
|-------|------|-------------|
| `projectName` | string | Project identifier |
| `commissionId` | string? | Links to commission for credentials |
| `trigger` | object | `{ type: "webhook" \| "schedule" \| "manual", config: {} }` |
| `actions` | array | `{ integration, operation, parameters }[]` |
| `errorHandling` | boolean | Inject Error Trigger + monitoring webhook |
| `monitoringWebhook` | string? | URL to receive failure alerts |

**Supported triggers:** Webhook, Schedule (cron), Manual  
**Supported integrations:** Slack, Notion, Google Sheets, Email (SMTP), Custom API (HTTP)

**Output:** `GeneratedWorkflowBundle` — workflow JSON, credentials list, mock data node, `.env` template

**API:** `POST /api/n8n/generate` (internal app, port 3001)

---

### 2. Credential Manager

**Location:** `apps/web/src/components/CredentialForm.tsx`, `apps/web/src/app/api/credentials/route.ts`

- Clients submit API keys via a secure form
- Credentials are encrypted at insert via pgsodium trigger on `Credential` table
- Plaintext **never** stored; `.env.example` templates generated instead of real tokens
- RLS ensures users can only access credentials for their own commissions

**API:** 
- `POST /api/credentials` — Save credentials (body: `{ commissionId, credentials: [{ service, token }] }`)
- `GET /api/credentials?commissionId=...` — List configured services (no plaintext returned)

#### Credential Encryption

pgsodium must be enabled and the trigger installed:

```bash
# 1. Enable pgsodium in Supabase Dashboard → Database → Extensions
# 2. Run setup script (loads .env from repo root)
pnpm --filter @mismo/db db:setup-pgsodium
```

---

### 3. Testing Sandbox

**Location:** `packages/ai/src/n8n/sandbox.ts`, `apps/internal/src/app/api/sandbox/*`

- Spins up a temporary n8n container (SQLite, tmpfs) via Docker Compose
- Imports workflow, runs execution, captures per-node input/output
- Validates: no infinite loops (60s timeout), error paths covered
- Tears down container and volumes after run

**Sandbox API:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sandbox/start` | POST | Start n8n container; returns `{ containerId, n8nUrl }` |
| `/api/sandbox/stop` | POST | Stop and remove container |
| `/api/sandbox/test` | POST | Import workflow, execute, return `SandboxResult` |

**Local sandbox:** Runs on the same machine as the internal app (Docker must be running).  
**Studio 3 sandbox:** Set `SANDBOX_HOST` to Studio 3 Tailscale hostname; internal app calls Studio 3 over the mesh.

---

### 4. Deployment Options

**Location:** `packages/ai/src/n8n/deploy.ts`

| Mode | Description |
|------|--------------|
| **Self-hosted (A)** | Exports `workflow.json`, `.env.example`, `README.md`, `credentials-template.json` for client's n8n |
| **Managed (B)** | Pushes workflow to Mismo n8n HA cluster via API; credentials injected at runtime |
| **Standalone (C)** | Generates Node.js package with n8n dependency, `index.js`, `Dockerfile` |

All modes inject an Error Trigger node when `monitoringWebhook` is set; failures POST to that URL.

**API:** `POST /api/n8n/deploy` (internal app)

---

### 5. Monitoring Webhook

**Location:** `apps/web/src/app/api/webhooks/n8n-alert/route.ts`

Receives POST when a production workflow fails. Payload:

```json
{
  "event": "workflow_error",
  "workflow": "Project Name Automation",
  "error": "Error message",
  "timestamp": "2025-03-02T..."
}
```

If `SLACK_ALERT_WEBHOOK_URL` is set in `.env`, alerts are forwarded to Slack.

---

### 6. Hosting Transfer Monitor Workflow

**Location:** `packages/n8n-nodes/workflows/hosting-monitor.json`

A **separate scheduled workflow** for post-transfer health monitoring (see [Hosting Transfer Pipeline](hosting-transfer-pipeline.md)):

- Runs **every 5 minutes** via Schedule Trigger
- Fetches active monitors from `GET /api/delivery/monitors/active`
- Health-checks each deployment URL
- Sends Slack alert if unhealthy (`statusCode !== 200`)

**Import:** In n8n, go to Workflows → Import from File → select `packages/n8n-nodes/workflows/hosting-monitor.json`, then activate the workflow.

Requires `NEXT_PUBLIC_APP_URL` (or `http://localhost:3000` for local) and `SLACK_ALERT_WEBHOOK_URL` for alerts.

---

## Quick Start

### Verify pipeline (local dev)

With dev servers running (`pnpm dev`):

```bash
pnpm n8n:verify
```

This checks internal app reachability, workflow generation, and optionally the Docker sandbox.

### Generate a workflow

```bash
curl -X POST http://localhost:3001/api/n8n/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "MyProject",
    "trigger": { "type": "webhook", "config": { "path": "/webhook" } },
    "actions": [
      { "integration": "slack", "operation": "send", "parameters": { "channel": "#alerts" } }
    ],
    "errorHandling": true,
    "monitoringWebhook": "https://your-app.com/api/webhooks/n8n-alert"
  }'
```

### Run full pipeline (generate → sandbox test → deploy)

```bash
curl -X POST http://localhost:3001/api/n8n/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "workflowRequest": { "projectName": "MyProject", "trigger": { "type": "manual", "config": {} }, "actions": [{ "integration": "slack", "operation": "send", "parameters": {} }] },
    "deploymentMode": "self-hosted",
    "sandboxHost": "localhost",
    "skipSandbox": false
  }'
```

### Save credentials (client portal)

```bash
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -H "Cookie: <session cookie>" \
  -d '{
    "commissionId": "clxxx",
    "credentials": [{ "service": "slackApi", "token": "xoxb-..." }]
  }'
```

---

## Maintenance Pipeline

A separate n8n workflow (`packages/n8n-nodes/workflows/maintenance-pipeline.json`) runs monthly to check opt-in repos for dependency updates:

- **Trigger:** Schedule node (1st of month, 09:00)
- **MaintenanceChecker node:** Calls `POST /api/maintenance/check` for each `MaintenancePlan` with `maintenanceOptIn = true`
- **Security patches:** Auto-create PR via GitHub API
- **Minor updates:** Auto-create PR with `needs-review` label
- **Major updates:** Create issue for client approval

Requires `GITHUB_TOKEN`, `NEXT_PUBLIC_APP_URL`, and `MaintenancePlan` records. See [Project Lifecycle Communications](project-lifecycle-communications.md).

---

## Environment Variables

| Variable | App | Description |
|----------|-----|-------------|
| `SLACK_ALERT_WEBHOOK_URL` | web | Optional; forwards n8n failure alerts to Slack |
| `RESEND_API_KEY` | web | Required for lifecycle emails (status, delivery, feedback) |
| `COMMS_WEBHOOK_SECRET` | web | Optional; verify pg_net webhook calls |
| `SANDBOX_HOST` | internal | Optional; Studio 3 hostname for remote sandbox |
| `SANDBOX_PORT` | internal | Optional; port for sandbox n8n (default 5679) |
| `N8N_MANAGED_URL` | internal | For managed deployment (Option B) |
| `N8N_MANAGED_API_KEY` | internal | For managed deployment (Option B) |
| `DEFAULT_MO_PROVIDER` | ai | AI provider for Workflow Generator (e.g. deepseek) |
| `DEEPSEEK_API_KEY` | ai | (or other AI provider key) |

---

## Delivery Pipeline Workflow

A separate n8n workflow (`packages/n8n-nodes/workflows/delivery-pipeline.json`) handles **source code delivery** when a Commission build succeeds. It is triggered by the `notify_n8n_commission_completed` Supabase trigger (pg_net) and runs:

- Pre-transfer validation (secret scan, BMAD acceptance, contract diff)
- Repo creation under agency org
- BMAD documentation generation
- Client invite and ownership transfer

Import this workflow alongside the workflow generation pipeline. See [Delivery Pipeline](delivery-pipeline.md) for details.

---

## Package Structure

```
packages/ai/src/n8n/
├── index.ts       # Exports
├── schema.ts      # Zod schemas, types
├── templates.ts   # Node builders (triggers, integrations, error handler)
├── generator.ts   # WorkflowGenerator
├── deploy.ts     # WorkflowDeployer
├── sandbox.ts    # WorkflowSandbox
└── pipeline.ts   # N8nPipeline orchestrator
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sandbox fails to start | Ensure Docker is running; check port 5679 is free |
| Credential save fails | Run `pnpm --filter @mismo/db db:setup-pgsodium`; verify pgsodium extension in Supabase |
| Workflow generation times out | Check AI provider key; reduce complexity |
| Managed deploy 401 | Verify `N8N_MANAGED_API_KEY` and n8n API version |
| Infinite loop detected | Review workflow structure; check for circular connections |
