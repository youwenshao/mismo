---
name: Automate Env Var Distribution
overview: Centralize environment variable management on the MacBook Pro and automate secure distribution to all Mac Studios using Ansible.
todos:
  - id: generate-secrets
    content: Generate secure random secrets and create `docker/n8n-ha/.env` on the MBP
    status: completed
  - id: create-template
    content: Create the Jinja2 template `mac-studios-iac/ansible/templates/n8n-env.j2`
    status: completed
  - id: create-playbook
    content: Create the Ansible playbook `mac-studios-iac/ansible/deploy-env.yml`
    status: completed
  - id: run-playbook
    content: Run the Ansible playbook to distribute the `.env` files
    status: completed
  - id: restart-services
    content: Restart Docker Compose services on all studios to apply changes
    status: completed
isProject: false
---

# Automate Environment Variable Distribution

We will fix the manual `.env` setup by using your MacBook Pro (Control Node) as the single source of truth and automating the distribution with Ansible. This ensures consistency and prevents manual copy-paste errors across the cluster.

## 1. Generate Shared Secrets

I will generate secure, random values for the required n8n High-Availability secrets (`N8N_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, and admin credentials) and save them to a new `[docker/n8n-ha/.env](docker/n8n-ha/.env)` file on your MacBook Pro.

## 2. Create Ansible Template

I will create a Jinja2 template (`[mac-studios-iac/ansible/templates/n8n-env.j2](mac-studios-iac/ansible/templates/n8n-env.j2)`) that dynamically generates the correct environment variables based on the machine's role:

- **For Studio 1 (Control Plane)**: It will include all variables needed for `docker-compose.main.yml`, mapping root variables like `NEXT_PUBLIC_SUPABASE_URL` to the expected `SUPABASE_URL`.
- **For Studios 2 & 3 (Execution Plane)**: It will automatically inject the `MAIN_NODE_IP` (reading Studio 1's IP from the Ansible inventory) and the shared database/Redis credentials needed for `docker-compose.worker.yml`.

## 3. Create Deployment Playbook

I will create a new Ansible playbook (`[mac-studios-iac/ansible/deploy-env.yml](mac-studios-iac/ansible/deploy-env.yml)`) with two main tasks:

- **Sync Root `.env`**: Securely copy the root `[.env](.env)` file from your MBP to `/Users/admin/Projects/mismo/.env` on all studios.
- **Deploy n8n `.env`**: Use the Jinja2 template to generate and deploy `/Users/admin/Projects/mismo/docker/n8n-ha/.env` to all studios.

## 4. Execute and Restart

Once the files are distributed, I will run the playbook and then restart the Docker Compose services on the studios so they pick up the new environment variables, completing Phase 5 of your setup.
