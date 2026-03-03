---
name: 'Phase 6 and 7: Credentials and Verification'
overview: Complete Phase 6 (Credentials) by ensuring all required variables are set, and Phase 7 (Verification) by checking Tailscale, Farm Monitor, and Firewall statuses across the cluster.
todos:
  - id: verify-credentials
    content: Verify required credentials in root `.env` (Phase 6)
    status: completed
  - id: check-tailscale
    content: Check Tailscale status on cluster (Phase 7.1)
    status: completed
  - id: check-farm-monitor
    content: Verify Farm Monitor logs and Supabase connection (Phase 7.3)
    status: completed
  - id: check-firewall
    content: Verify Firewall (pf) status on Execution Plane nodes (Phase 7.4)
    status: completed
isProject: false
---

# Phase 6 & 7: Credentials and Verification

We will now finalize the setup by ensuring all required credentials are in place and verifying the health of the entire cluster according to the setup guide.

## Phase 6: Credentials & Environment Variables

We have already automated the distribution of the `.env` files in the previous steps. However, we need to verify that the specific keys mentioned in Phase 6 are populated in the root `.env` file on the Control Node (MBP), as these are synced to the studios.

- **Action**: I will read the root `[.env](.env)` file on the MBP to check for the presence of:
  - `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`
  - `GITHUB_TOKEN`
  - `FARM_MONITOR_ALERT_WEBHOOK`
  - `APPLE_TEAM_ID` & `EXPO_TOKEN`
- **Action**: If any critical variables are missing, I will ask you to provide them or confirm if they can be skipped for now.

## Phase 7: Verification

We will run the verification steps outlined in the guide across the cluster.

### 1. Tailscale Status

- **Action**: Run `tailscale status` on Studio 1 to ensure all 4 machines (MBP, Studio 1, 2, 3) are visible and connected in the mesh.

### 2. Farm Monitor Health

- **Action**: Check the logs of the `farm-monitor` container on Studio 1 (`docker logs n8n-ha-farm-monitor-1`).
- **Action**: We will specifically look to see if the Supabase `HTTP 403` error has been resolved (which depends on the `SUPABASE_SERVICE_ROLE_KEY` being correct).

### 3. Firewall Verification (Zero-Trust)

- **Action**: Run `sudo pfctl -s info` on Studio 2 and Studio 3 to verify that the `pf` firewall is enabled and actively filtering traffic as per the `studio` role.

### 4. Final Review

- **Action**: Summarize the findings and confirm if the cluster is fully operational.
