# API: Webhook Specifications

This document defines the webhook interfaces for the Mismo platform, including security and payload examples.

---

## 🔒 Security: HMAC Verification

All internal webhook routes are protected by a shared secret (`COMMS_WEBHOOK_SECRET`).

**Verification Logic (Node.js/Next.js):**

```typescript
function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.COMMS_WEBHOOK_SECRET
  if (!secret) return true // Skips verification if secret is not set
  const provided = req.headers.get('x-webhook-secret')
  return provided === secret
}
```

**Required Header:**

- `x-webhook-secret`: The shared secret configured in `.env`.

---

## 📡 Webhook Route: `/api/comms/webhook`

Receives status changes from the `Build` and `Commission` tables in Supabase (via `pg_net`).

### Payload Type: `build_stage_change`

**Example:**

```json
{
  "type": "build_stage_change",
  "build_id": "clxxx",
  "commission_id": "clyyy",
  "old_status": "PENDING",
  "new_status": "RUNNING",
  "github_url": null,
  "vercel_url": null,
  "failure_count": 0
}
```

**Mapped Events:**

- `BUILD_STARTED`: `old_status=PENDING`, `new_status=RUNNING`.
- `BUILD_COMPLETE`: `new_status=SUCCESS`.
- `SUPPORT_REQUIRED`: `new_status=FAILED` and `failure_count >= 3`.

---

### Payload Type: `commission_status_change`

**Example:**

```json
{
  "type": "commission_status_change",
  "commission_id": "clyyy",
  "old_status": "CONTRACTED",
  "new_status": "COMPLETED"
}
```

**Mapped Events:**

- `FEEDBACK_REQUEST`: `new_status=COMPLETED`.
- `SUPPORT_REQUIRED`: `new_status=ESCALATED`.

---

## 📡 Webhook Route: `/api/delivery/pipeline`

The main entry point for the n8n delivery pipeline after a successful build.

**Example Payload:**

```json
{
  "buildId": "clxxx",
  "commissionId": "clyyy",
  "repoName": "client-project-abc",
  "workspaceDir": "/tmp/mismo-build/clxxx",
  "clientGithubUsername": "client-github-user",
  "prdJson": { "name": "Project ABC", "archTemplate": "MONOLITHIC_MVP" }
}
```

**Response:**

```json
{
  "status": "SUCCESS",
  "deliveryId": "dlzzz",
  "repoUrl": "https://github.com/mismo-agency/client-project-abc"
}
```

---

## 📡 Webhook Route: `/api/maintenance/check`

Used by the monthly maintenance cron to audit repository health.

**Example Payload:**

```json
{
  "githubUrl": "https://github.com/client/repo",
  "branch": "main",
  "autoCreatePrs": true
}
```

**Response:**

```json
{
  "vulnerabilities": 2,
  "outdatedPackages": 5,
  "prsCreated": 1
}
```

---

## Decidendi Internal Routes

### POST /api/decidendi/milestone

Relays build or delivery milestone completion to the Decidendi smart contracts (when `ENABLE_DECIDENDI=true`). Used by the n8n pipeline after build success or delivery completion.

**Security:** Header `x-internal-secret` must equal `DECIDENDI_INTERNAL_SECRET`.

**Body:**

```json
{
  "commissionId": "clxxx",
  "milestone": "BUILD_COMPLETE",
  "deliveryHash": "0x1234..."
}
```

- `milestone`: `BUILD_COMPLETE` or `DELIVERED`
- `deliveryHash`: Optional; auto-generated for `DELIVERED` if omitted

**Response:**

```json
{
  "success": true,
  "onChain": true,
  "txHash": "0x...",
  "milestone": "BUILD_COMPLETE",
  "explorerUrl": "https://basescan.org/tx/0x..."
}
```

### GET /api/cron/decidendi-release

Cron endpoint to auto-release final payments after the 3-day grace period. Intended for hourly execution (Vercel Cron or external scheduler).

**Security:** Header `Authorization: Bearer <CRON_SECRET>`.

**Response:**

```json
{
  "released": 2,
  "total": 2,
  "errors": []
}
```
