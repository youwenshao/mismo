# Runbook: System Startup

This guide provides the necessary steps to bring the Mismo system from a cold state to fully operational.

---

## 🚀 Checklist: Cold Boot Sequence

Follow these steps in order to ensure correct dependency startup:

1.  **Tailscale Mesh** — Join all nodes to the network.
2.  **Control Plane (Studio 1)** — Start the main n8n instance and local microservices.
3.  **Execution Plane (Studio 2 & 3)** — Start n8n workers and execution microservices.
4.  **Farm Monitor** — Enable health tracking and auto-recovery.

---

## ⚙️ Step 1: Tailscale Mesh Network

Each Mac Studio must be connected to the Tailscale mesh with the appropriate tag (`admin` for Control Plane, `studio` for Execution Plane).

**On each node:**
```bash
# Run the setup script
./tailscale.sh <role: admin|studio> <auth_key>
```
Verification: `tailscale status` should show all 3-5 nodes.

---

## ⚙️ Step 2: Control Plane Startup (Studio 1)

Navigate to the HA Docker directory and start the main services.

```bash
cd docker/n8n-ha/
docker compose -f docker-compose.main.yml up -d
```

**Services started:**
- `postgres` (n8n metadata)
- `redis` (BullMQ job queue)
- `n8n-main` (Web UI and API)
- `bmad-validator` (Pre-flight validation)
- `gsd-dependency` (Topological sort service)
- `farm-monitor` (System watchdog)

**Verification:**
- Visit `https://${N8N_HOST}/healthz`
- Check logs: `docker compose -f docker-compose.main.yml logs -f n8n-main`

---

## ⚙️ Step 3: Execution Plane Startup (Studio 2 & 3)

Workers must connect to the `MAIN_NODE_IP` advertised on Tailscale.

**On each Studio 2 and Studio 3:**
```bash
cd docker/n8n-ha/
# Ensure MAIN_NODE_IP is set in .env
docker compose -f docker-compose.worker.yml up -d
```

**Services started:**
- `n8n-worker` (25x concurrent jobs per node)
- `contract-checker` (Execution-time validation)

**Verification:**
- Check worker connectivity: `docker compose -f docker-compose.worker.yml logs -f n8n-worker`
- Verify in n8n UI: Settings -> Queue -> Active Workers

---

## ⚙️ Step 4: farm-monitor Verification

The `farm-monitor` service automatically detects and heals hung builds or crashed workers.

```bash
# On Studio 1
docker compose -f docker-compose.main.yml logs -f farm-monitor
```

**Key health metrics to check:**
- Kimi API latency
- Supabase REST connectivity
- Redis queue depth
