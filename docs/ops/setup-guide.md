# Mismo System Setup & Onboarding Guide

Welcome to Mismo. This guide walks you through the complete setup of our distributed infrastructure, consisting of one MacBook Pro (Control Node) and three Mac Studios (Control and Execution Planes).

---

## 🏗️ System Architecture & Roles

Before you begin, understand the role of each machine in our cluster:

| Machine | Role | Hostname | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **MacBook Pro** | **Control Node** | `mbp-control` | Development, IaC Orchestration (Ansible), Monitoring. |
| **Mac Studio 1** | **Control Plane** | `studio-1` | The "Brain": Main n8n instance, Postgres (metadata), Redis (queue), Farm Monitor. |
| **Mac Studio 2** | **Execution Plane** | `studio-2` | The "Muscles": n8n Workers, iOS Build Services. |
| **Mac Studio 3** | **Execution Plane** | `studio-3` | The "Muscles": n8n Workers, Android Build Services, Backup Verification. |

---

## 🛠️ Phase 1: Hardware & OS Preparation

Perform these steps on **all 4 machines** (MBP and all 3 Studios):

1.  **Initial macOS Setup**:
    - Complete the out-of-box experience.
    - Create a primary admin user named `admin`.
2.  **Network Connectivity**:
    - Connect all Mac Studios to power and high-speed Ethernet.
3.  **System Settings**:
    - **Disable Sleep**: Go to `System Settings > Displays > Advanced...` and enable "Prevent automatic sleeping when the display is off".
    - **Enable Remote Login**: Go to `System Settings > General > Sharing` and toggle **Remote Login** to ON. This allows SSH access.
    - **Set Sudo Password**: Ensure you know the `admin` password for all nodes.

---

## 💻 Phase 2: Control Node (MBP) Setup

The MacBook Pro orchestrates the rest of the cluster.

1.  **Install Homebrew**:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/mismo-agency/mismo.git
    cd mismo
    ```
3.  **Generate SSH Keys**:
    If you don't have an SSH key, generate one:
    ```bash
    ssh-keygen -t ed25519 -C "your_email@mismo.dev"
    ```
4.  **Bootstrap SSH Access**:
    Copy your key to each Mac Studio (replace `<IP>` with actual local IPs):
    ```bash
    ssh-copy-id admin@<STUDIO_1_IP>
    ssh-copy-id admin@<STUDIO_2_IP>
    ssh-copy-id admin@<STUDIO_3_IP>
    ```
5.  **Install Ansible**:
    ```bash
    brew install ansible
    ```

---

## 🌐 Phase 3: Network (Tailscale Mesh)

We use Tailscale for a secure, zero-trust mesh network.

1.  **On the MacBook Pro**:
    ```bash
    ./tailscale.sh admin <YOUR_TAILSCALE_AUTH_KEY>
    ```
2.  **On each Mac Studio**:
    SSH into the studio from your MBP and run the script:
    - **Studio 1**: `./tailscale.sh admin <KEY>`
    - **Studio 2 & 3**: `./tailscale.sh studio <KEY>`

*Note: The `studio` role applies strict firewall rules that block all outbound traffic except to approved services (Supabase, GitHub, etc.).*

---

## 🤖 Phase 4: Automated Provisioning (Ansible)

From your MacBook Pro, deploy the base configuration to all Studios.

1.  **Update Inventory**:
    Edit `mac-studios-iac/ansible/inventory.ini` with the correct local IP addresses.
2.  **Run Setup Playbook**:
    ```bash
    cd mac-studios-iac/ansible
    ansible-playbook setup-studio.yml -K
    ```
    *(The `-K` flag will prompt for your sudo password).*
3.  **Deploy Monitoring**:
    ```bash
    ansible-playbook setup-monitoring.yml -K
    ```

---

## 🐳 Phase 5: Software Stack (Docker & n8n)

### 1. Control Plane (Studio 1)
SSH into Studio 1 and start the main services:
```bash
cd docker/n8n-ha/
docker compose -f docker-compose.main.yml up -d
```
*Services: Postgres, Redis, n8n-main, farm-monitor.*

### 2. Execution Plane (Studio 2 & 3)
SSH into Studio 2 and 3. Ensure `MAIN_NODE_IP` (Studio 1's Tailscale IP) is in your `.env`, then:
```bash
cd docker/n8n-ha/
docker compose -f docker-compose.worker.yml up -d
```
*Services: n8n-worker (25x concurrency).*

---

## 🔑 Phase 6: Credentials & Environment Variables

Create a `.env` file on **every node** by copying `.env.example`. Key variables to set:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **AI Providers**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`.
- **GitHub**: `GITHUB_TOKEN` (with repo and workflow scopes).
- **Infrastructure**:
    - `MAIN_NODE_IP`: Tailscale IP of Studio 1.
    - `FARM_MONITOR_ALERT_WEBHOOK`: Slack/Discord webhook for alerts.
- **Mobile Builds**: `APPLE_TEAM_ID`, `EXPO_TOKEN` (required on Studio 2/3).

---

## ✅ Phase 7: Verification

1.  **Tailscale**: Run `tailscale status` on any node. You should see all 4 machines.
2.  **n8n UI**: Visit `http://<STUDIO_1_IP>:5678`. Go to `Settings > Queue` and verify that workers from Studio 2 and 3 are active.
3.  **Farm Monitor**: Check logs on Studio 1:
    ```bash
    docker logs -f farm-monitor
    ```
4.  **Firewall**: On Studio 2/3, verify zero-trust is active:
    ```bash
    sudo pfctl -s info
    ```

---

## 🆘 Troubleshooting

- **SSH Connection Refused**: Ensure "Remote Login" is enabled in System Settings.
- **n8n Worker can't connect**: Verify `MAIN_NODE_IP` in `.env` matches Studio 1's Tailscale IP and that Redis is running on Studio 1.
- **Docker Permission Denied**: Ensure your user is in the `docker` group (Ansible should handle this, but a logout/login may be required).

---
*Last Updated: 2026-03-03*
