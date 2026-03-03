---
name: Fix n8n and Farm Monitor
overview: Resolve the n8n encryption key mismatch and fix the Farm Monitor's SSH key mounting and Supabase connection issues.
todos:
  - id: get-n8n-key
    content: Retrieve existing n8n encryption key from Studio 1
    status: completed
  - id: update-and-deploy-env
    content: Update MBP .env and re-deploy to all studios
    status: completed
  - id: deploy-ssh-key
    content: Deploy private SSH key to Studio 1 for Farm Monitor
    status: completed
  - id: verify-fix
    content: Verify n8n and Farm Monitor status
    status: completed
isProject: false
---

# Fix n8n and Farm Monitor

We need to address two critical issues: n8n failing to start due to an encryption key mismatch, and the Farm Monitor failing because it lacks the necessary SSH keys and has a Supabase connection error.

## 1. Fix n8n Encryption Key Mismatch

The n8n container on Studio 1 is stuck in a restart loop because the `N8N_ENCRYPTION_KEY` in the new `.env` file does not match the key stored in its existing configuration volume.

- **Action**: I will use Ansible to retrieve the existing encryption key from `/Users/admin/.n8n/config` on Studio 1.
- **Action**: I will update the `[docker/n8n-ha/.env](docker/n8n-ha/.env)` on your MBP with this existing key.
- **Action**: I will re-run the `[mac-studios-iac/ansible/deploy-env.yml](mac-studios-iac/ansible/deploy-env.yml)` playbook to sync the correct key to all nodes and restart n8n.

## 2. Fix Farm Monitor SSH Key Mounting

The Farm Monitor is failing with `config.privateKeyPath does not exist` because it expects an SSH key at `/home/app/.ssh/id_ed25519` inside the container, but the host path `~/.ssh` being mounted on Studio 1 only contains `authorized_keys`.

- **Action**: I will update the `[mac-studios-iac/ansible/deploy-env.yml](mac-studios-iac/ansible/deploy-env.yml)` playbook to securely copy your private key (`~/.ssh/mismo_ed25519`) from your MBP to `/Users/admin/.ssh/id_ed25519` on Studio 1.
- **Action**: I will ensure the file permissions on Studio 1 are set to `0600` for the private key.

## 3. Fix Farm Monitor Supabase Connection

The Farm Monitor is reporting a `HTTP 403` when connecting to Supabase. This is likely due to an incorrect `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` being passed to the container.

- **Action**: I will verify the Supabase credentials in the root `[.env](.env)` and ensure they are correctly mapped in the `[mac-studios-iac/ansible/templates/n8n-env.j2](mac-studios-iac/ansible/templates/n8n-env.j2)` template (which is used for the Farm Monitor's environment).

## 4. Verification

- **Action**: Verify n8n is running and accessible at `http://100.124.80.81:5678`.
- **Action**: Check Farm Monitor logs to ensure it can now SSH into all studios and connect to Supabase.
