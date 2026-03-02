# Runbook: Maintenance & Initial Setup

This guide provides step-by-step instructions for the initial setup and recurring maintenance of the Mismo system.

---

## 🏗️ Initial Setup Checklist

Follow these steps for a fresh Mismo installation:

1.  **Hardware Prep**:
    - Ensure macOS nodes (Studio 1-5) are connected to power and Ethernet.
    - Set `sudo` password for all nodes.
    - Disable sleep in macOS System Settings.

2.  **Network Configuration**:
    - Install Tailscale: `brew install tailscale`.
    - Run `./tailscale.sh` with the correct role (`admin` or `studio`).
    - Verify zero-trust firewall rules are active: `sudo pfctl -s info`.

3.  **Environment Variables**:
    - Copy `.env.example` to `.env` on each node.
    - Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
    - Set `KIMI_API_KEY`, `GITHUB_TOKEN`.
    - Set `RESEND_API_KEY` for communications.

4.  **Docker & n8n**:
    - Install Docker Desktop or Colima.
    - Start Docker Compose: `docker-compose up -d`.
    - Log in to n8n and set up the `admin` account.
    - Import workflows from `packages/n8n-nodes/workflows/`.

---

## 🛠️ Recurring Maintenance

Regular maintenance ensures system stability and security.

### 📅 Daily Maintenance

1.  **Log Review**:
    - Check `farm-monitor` logs for alerts.
    - Review n8n execution failures.
2.  **Resource Health**:
    - Monitor Studio RAM and CPU via the Mismo Dashboard.
    - Verify all Tailscale nodes are reachable.

### 📅 Weekly Maintenance

1.  **Docker Prune**:
    - `docker system prune -f` on all execution nodes.
    - Clears dangling images and stopped containers from previous builds.
2.  **SSL Certificate Check**:
    - Verify `N8N_HOST` certificate validity.
3.  **Database Backups**:
    - Confirm Supabase automated backups are successful.
    - Run manual `pg_dump` of the n8n metadata database.

### 📅 Monthly Maintenance

1.  **Security Patches**:
    - Run `brew update && brew upgrade` on all nodes.
    - Pull latest Docker images: `docker compose pull && docker compose up -d`.
2.  **Dependency Updates**:
    - Run `pnpm update` in the Mismo repo.
    - Audit `packages/n8n-nodes` for version mismatches.
3.  **Audit Logs**:
    - Review the `AuditLog` table for unauthorized actions or suspicious activity.
    - Archive older logs to long-term storage if necessary.

---

## 🚨 Emergency Maintenance

In the event of a system-wide failure:

1.  **Halt All Builds**: Set all `Build` statuses to `FAILED` or `PAUSED`.
2.  **Restart Main Node**: `docker compose down && docker compose up -d`.
3.  **Reset Tailscale**: `sudo tailscale down && sudo tailscale up`.
4.  **Restore DB**: If Supabase is compromised, use the latest `pg_dump` to restore the schema and data.
