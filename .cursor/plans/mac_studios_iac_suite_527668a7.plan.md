---
name: Mac Studios IaC Suite
overview: A comprehensive Infrastructure-as-Code suite using Ansible, dotfiles, and bash scripts to provision, manage, monitor, and back up 3 Mac Studios from a central MacBook Pro control node.
todos:
  - id: create-structure-docs
    content: Create directory structure and README.md with manual steps
    status: completed
  - id: write-ansible
    content: Write Ansible inventory and setup-studio.yml playbook
    status: completed
  - id: write-dotfiles
    content: Create dotfiles (.zshrc, .tmux.conf, .gitconfig)
    status: completed
  - id: write-monitoring-scripts
    content: Write monitoring scripts (cluster-health.sh, build-status.sh)
    status: completed
  - id: write-backup-scripts
    content: Write backup automation scripts (supabase-backup.sh, n8n-backup.sh)
    status: completed
isProject: false
---

# Mac Studios Infrastructure-as-Code Suite

I will create a dedicated `mac-studios-iac` directory in your workspace to house the infrastructure code, scripts, and configurations. This ensures everything is organized and easily executable from your MacBook Pro.

## 1. Directory Structure

```text
mac-studios-iac/
├── README.md
├── ansible/
│   ├── inventory.ini
│   ├── ansible.cfg
│   └── setup-studio.yml
├── dotfiles/
│   ├── .zshrc
│   ├── .tmux.conf
│   └── .gitconfig
└── scripts/
    ├── monitoring/
    │   ├── cluster-health.sh
    │   └── build-status.sh
    └── backups/
        ├── supabase-backup.sh
        └── n8n-backup.sh
```

## 2. Ansible Playbook (`setup-studio.yml`)

The playbook will be idempotent and target the 3 Mac Studios.

- **Package Management**: Use Homebrew via Ansible to install Git, tmux, Tailscale, Node.js 20, and Docker (Cask).
- **Global npm Packages**: Install `n8n` CLI globally.
- **System Configuration**:
  - Set Hostname dynamically using `scutil` based on the inventory variable (`studio-1`, `studio-2`, `studio-3`).
  - Disable macOS auto-updates via `softwareupdate --schedule off`.
  - Configure SSH keys using the `ansible.posix.authorized_key` module.
  - Configure the macOS firewall (`pfctl`) to enable basic protection and start on boot.
  - Deploy the dotfiles to each machine.

## 3. Dotfiles Repository

- `**.zshrc`\*\*: Will include your requested aliases:
  - `n8n-logs`: Alias to tail n8n docker or pm2 logs.
  - `studio-ssh`: Helper function to quickly SSH into a specific studio.
  - `docker-clean`: Alias for `docker system prune -af`.
- `**.tmux.conf`\*\*: Configured with `set -g mouse on` and a customized status bar displaying CPU and RAM usage.
- `**.gitconfig**`: Configured for commit signing (`commit.gpgsign = true`) and standard aliases (`co`, `br`, `st`).

## 4. Monitoring Scripts

Runnable from the control node (MacBook Pro):

- `**cluster-health.sh**`: Loops through the Ansible inventory, SSHing into each Studio to run native macOS commands (`top`, `vm_stat`, `df -h`) and formats the output into a clean terminal table.
- `**build-status.sh**`: Connects to each Studio to query the n8n webhook/API or database to report the current workflow queue depth and execution status.

## 5. Backup Automation

- `**supabase-backup.sh**`: Script to execute `pg_dump` (or Supabase CLI) to dump the database and securely transfer (rsync/scp) the dump to the 1TB storage on Studio 3.
- `**n8n-backup.sh**`: Script to run `n8n export:workflow --all` on each Studio, commit the exported JSON files to a local git repository, and push them to your remote backup repository.

## 6. Documentation of Manual Steps (`README.md`)

I will thoroughly document the steps that _cannot_ be automated via Ansible:

1. Initial macOS setup (creating the initial admin user, enabling "Remote Login" in System Settings for initial SSH access).
2. Generating the initial SSH key on the MacBook Pro and using `ssh-copy-id` to bootstrap access.
3. Authenticating Tailscale (requires interactive browser login on each Mac).
4. Setting up `cron` or `launchd` jobs on the MacBook Pro/Studio 3 for the automated backup scripts.

---

_Does this architecture look good to you? Once confirmed, I will proceed with creating the files._
