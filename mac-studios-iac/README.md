# Mac Studios Infrastructure-as-Code

This repository contains the IaC suite for managing 3 Mac Studios from a central MacBook Pro control node.

## Directory Structure

```text
mac-studios-iac/
├── README.md
├── ansible/
│   ├── inventory.ini
│   ├── ansible.cfg
│   ├── setup-studio.yml
│   └── setup-monitoring.yml
├── dotfiles/
│   ├── .zshrc
│   ├── .tmux.conf
│   └── .gitconfig
└── scripts/
    ├── monitoring/
    │   ├── cluster-health.sh
    │   ├── build-status.sh
    │   ├── resource-watchdog.sh
    │   └── com.mismo.resource-watchdog.plist
    └── backups/
        ├── supabase-backup.sh
        ├── n8n-backup.sh
        └── verify-backup.sh
```

## Manual Steps (Pre-requisites)

The following steps cannot be fully automated and must be performed manually before running the Ansible playbook:

### 1. Initial macOS Setup

On each of the 3 Mac Studios:

- Complete the initial macOS out-of-box experience.
- Create the primary admin user (ensure the username matches the `ansible_user` in the inventory file, e.g., `admin`).
- Go to **System Settings > General > Sharing** and enable **Remote Login** to allow SSH access.

### 2. SSH Key Setup

On your MacBook Pro (Control Node):

- If you don't have an SSH key, generate one:
  ```bash
  ssh-keygen -t ed25519 -C "your_email@example.com"
  ```
- Copy your SSH key to each Mac Studio to bootstrap passwordless access:
  ```bash
  ssh-copy-id admin@<IP_ADDRESS_OF_STUDIO_1>
  ssh-copy-id admin@<IP_ADDRESS_OF_STUDIO_2>
  ssh-copy-id admin@<IP_ADDRESS_OF_STUDIO_3>
  ```

### 3. Tailscale Authentication

The Ansible playbook will install Tailscale, but you must authenticate manually on each machine:

- Open Tailscale from the Applications folder or run `tailscale up` in the terminal.
- Follow the prompt to log in via your browser.

### 4. Scheduling Backups and Monitoring

**Option A: Use setup-monitoring.yml (Recommended)**

Deploy resource-watchdog and backup verification via Ansible:

```bash
cd ansible
ansible-playbook setup-monitoring.yml -K
```

This installs:

- **resource-watchdog** — Runs every 60s on all Studios via launchd; checks RAM/CPU/disk, sends alerts, triggers docker prune or concurrency reduction
- **Backup verification** — Runs daily at 3 AM on Studio 3; tests restore from latest backup and reports to farm-monitor

Ensure `FARM_MONITOR_URL` and `SLACK_ALERT_WEBHOOK_URL` are set in `/opt/mismo/.env` on each Studio so the watchdog can send alerts.

**Option B: Manual cron/launchd**

If not using setup-monitoring.yml, add entries to crontab (adjust paths as necessary):

```bash
# Daily Supabase dump at 2 AM
0 2 * * * /path/to/mac-studios-iac/scripts/backups/supabase-backup.sh >> /tmp/supabase-backup.log 2>&1

# Weekly n8n workflow export on Sunday at 3 AM
0 3 * * 0 /path/to/mac-studios-iac/scripts/backups/n8n-backup.sh >> /tmp/n8n-backup.log 2>&1
```

## Usage

1. Review and update `ansible/inventory.ini` with the correct IP addresses or hostnames.
2. Run the base setup playbook:
   ```bash
   cd ansible
   ansible-playbook setup-studio.yml -K
   ```
   _(The `-K` flag prompts for the sudo password required for some tasks like firewall configuration)._
3. (Optional) Deploy monitoring (resource-watchdog + backup verification):
   ```bash
   ansible-playbook setup-monitoring.yml -K
   ```

## Monitoring Scripts

| Script | Purpose |
|--------|---------|
| `scripts/monitoring/cluster-health.sh` | Ad-hoc: SSH to all Studios, report CPU/RAM/disk |
| `scripts/monitoring/build-status.sh` | Ad-hoc: n8n queue depth per Studio |
| `scripts/monitoring/resource-watchdog.sh` | Deployed via launchd; runs every 60s; RAM/CPU/disk checks + automated responses |
| `scripts/backups/verify-backup.sh` | Daily test-restore of latest backup (Studio 3); reports to farm-monitor |

See [docs/agent-farm-monitoring.md](../docs/agent-farm-monitoring.md) for the full monitoring architecture.
