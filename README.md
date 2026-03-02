# Mismo Platform

A hybrid human-AI software development platform that automates the entire lifecycle from idea to deployed application. Mismo combines AI agents with human oversight to deliver production-ready software.

## Overview

Mismo provides a complete agency platform with:

- **Mo (AI Interview Agent)**: Conducts structured interviews to extract project requirements
- **Automated PRD Generation**: Creates specifications with user stories, API contracts, and data models
- **Safety Classification**: 3-tier risk scoring for project compliance
- **AI-Powered Development**: Cursor-based automation with human review gates
- **n8n Workflow Pipeline**: Generate, test, and deploy n8n automations from PRD specs (Slack, Notion, Google Sheets, etc.)
- **Repo Surgery Pipeline**: Modify existing codebases with BMAD boundary mapping, contract extraction, semantic code search (Qdrant), and safe diff generation
- **Mobile Build Pipeline**: React Native + Expo builds for iOS/Android with BMAD feasibility scoring, EAS builds, and store submission automation
- **Project Lifecycle Communications**: Automated status updates (Resend/Slack), delivery packaging (ADR, how-to guide, walkthrough video), post-delivery feedback with escalation, and maintenance mode (npm outdated, automated PRs for security patches)
- **Hosting Transfer Pipeline**: Deploy and transfer ownership across Vercel, Railway/Render, AWS/GCP, or Self-Hosted—gated by Stripe payment, with 7-day post-transfer monitoring
- **Agent Farm Monitoring**: Resource alerts (RAM/CPU/disk), API health (Kimi→DeepSeek failover, Supabase queue, GitHub rate-limit pause), build recovery (3x escalation, stuck-build kill), security (SSH ban, credential rotation), P0/P1/P2 alerts via SMS, phone, Slack, email
- **Integrated Billing & Contracts**: Stripe payments with DocuSign e-signatures
- **Mission Control Dashboard**: Internal ops view — fleet status (Studios 1–3), commission kanban, agent performance, financial telemetry, GSD dependency graph, BMAD feasibility warnings, alerting, ETA prediction
- **Zero-Trust Infrastructure**: Tailscale mesh network for secure multi-node operations

## Architecture

### Monorepo Structure

```
mismo/
├── apps/
│   ├── web/                  # Next.js 15 - client-facing app (Mo chat, PRD editor, dashboards)
│   └── internal/             # Next.js 15 - internal dev team dashboard
├── packages/
│   ├── ai/                   # Mo agent logic, safety classifier, spec generator, n8n workflow generator
│   ├── db/                   # Prisma schema, migrations, seed data
│   ├── ui/                   # Shared UI components (shadcn/ui based)
│   ├── shared/               # Shared types, utils, constants
│   └── templates/            # Pre-audited architectural templates
├── docker/
│   ├── cursor-agent/         # Dockerfile for headless Cursor CLI execution
│   └── n8n-ha/               # n8n high-availability configuration
├── mac-studios-iac/          # Ansible playbooks for Mac Studio provisioning
├── docs/                     # Documentation and design systems
└── scripts/                  # Automation scripts
```

### Technology Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| **Monorepo**  | Turborepo + pnpm workspaces                                     |
| **Frontend**  | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui              |
| **Database**  | Supabase (PostgreSQL) + Prisma ORM + RLS                        |
| **Auth**      | Supabase Auth (OAuth, magic link, email)                        |
| **Real-time** | Supabase Realtime + LiveKit (WebRTC voice)                      |
| **AI**        | Vercel AI SDK (OpenAI, Anthropic, DeepSeek, Kimi, MiniMax, ZAI) |
| **Payments**  | Stripe (Checkout, Subscriptions)                                |
| **Contracts** | DocuSign eSignature API                                         |
| **CI/CD**     | GitHub Actions + Vercel                                         |
| **Security**  | StackHawk (DAST), Snyk (SCA), Playwright (E2E)                  |

### Network Architecture

The platform uses a **Zero-Trust Tailscale Mesh Network**:

- **Admin Nodes** (MacBooks): Full access to all nodes and ports
- **Studio Nodes** (Mac Studios): Restricted peer-to-peer communication on ports 22, 5432, 5678, 6379
- **External Internet Blocking**: macOS `pf` firewall blocks general outbound traffic, allowing only HTTPS (443), DNS (53), DHCP (67,68), NTP (123)

## Prerequisites

### Required Accounts & API Keys

1. **Tailscale Account**: For mesh network setup
2. **Supabase Project**: Database and authentication
3. **Stripe Account**: Payment processing
4. **DocuSign Developer Account**: Contract signatures
5. **AI Provider API Keys** (at least one):
   - OpenAI API Key
   - Anthropic API Key
   - DeepSeek API Key
   - Kimi API Key
   - MiniMax API Key
   - ZAI API Key
7. **LiveKit Account**: WebRTC voice capabilities (optional)
8. **GitHub Token**: For repository automation, bug reports, maintenance PRs

### System Requirements

- **Node.js**: 20.x or higher
- **pnpm**: 10.x or higher
- **Homebrew** (macOS): For Tailscale and dependencies
- **Docker**: For local n8n and cursor-agent
- **Ansible**: For Mac Studio provisioning (optional)

## Setup Instructions

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd mismo

# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Step 2: Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Required)
# Use pooled connection (port 6543) for app queries
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:6543/postgres?pgbouncer=true
# Use direct connection (port 5432) for migrations
DIRECT_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# AI Providers (At least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
KIMI_API_KEY=...
MINIMAX_API_KEY=...
ZAI_API_KEY=...

# Mo defaults
DEFAULT_MO_PROVIDER=deepseek
DEFAULT_MO_MODEL=deepseek-chat

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# DocuSign (Required for contracts)
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_SECRET_KEY=...
DOCUSIGN_ACCOUNT_ID=...

# LiveKit (Optional - for voice)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url

# GitHub (Required for CI/CD automation and Delivery Pipeline)
GITHUB_TOKEN=ghp_...
GITHUB_ORG=your-org
GITHUB_DELIVERY_ORG=mismo-agency

# Qdrant (Required for Repo Surgery; optional for Design DNA reference system)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Repo Surgery Pipeline
REPO_SURGERY_WORKSPACE=/tmp/mismo-surgery
# GITHUB_TOKEN=              # For PR creation (optional)
# SONARQUBE_URL=             # Optional: enhanced static analysis

# n8n Workflow Pipeline (Optional)
SLACK_ALERT_WEBHOOK_URL=          # Forward workflow failure alerts to Slack; also used by Hosting Transfer monitoring
SANDBOX_HOST=                     # Studio 3 hostname for remote sandbox (e.g. studio-3.tailxxxxx.ts.net)
SANDBOX_PORT=5679                 # Sandbox n8n port
N8N_MANAGED_URL=                  # For managed deployment (Option B)
N8N_MANAGED_API_KEY=              # For managed deployment (Option B)
N8N_MOBILE_PIPELINE_WEBHOOK_URL=  # Mobile build pipeline webhook (e.g. http://localhost:5678/webhook/mobile-build-pipeline)

# Hosting Transfer (Optional - for deployment and ownership handoff)
VERCEL_API_TOKEN=                 # Mismo's Vercel token (deploy to Mismo account, then transfer)
VERCEL_TEAM_ID=                   # Optional team ID
RAILWAY_API_TOKEN=                # For Railway deployments
RENDER_API_KEY=                   # For Render deployments

# Communication System (status updates, delivery, feedback)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=updates@mismo.dev
# SMTP_HOST=, SMTP_PORT=587, SMTP_USER=, SMTP_PASS=   # Fallback if Resend fails
COMMS_WEBHOOK_SECRET=                                 # Optional: verify pg_net webhook calls

# Agent Farm Monitoring (Mac Studios n8n HA)
# SLACK_ALERT_WEBHOOK_URL=                            # Also used by n8n workflow alerts
# ALERT_PHONE_NUMBER=                                 # Developer for P0 critical (SMS + phone)
# ALERT_EMAIL=                                        # Developer for P1 warnings
# TWILIO_ACCOUNT_SID=, TWILIO_AUTH_TOKEN=, TWILIO_FROM_NUMBER=   # P0 SMS and phone alerts

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTERNAL_APP_URL=http://localhost:3001
```

### Step 3: Database Setup

#### Option A: Using Quickstart Script (Recommended)

```bash
pnpm quickstart
```

This will:

1. Install dependencies
2. Copy `.env.example` to `.env` (if not exists)
3. Generate Prisma client
4. Push schema to database
5. Seed initial data
6. Start development servers

#### Option B: Manual Setup

```bash
# Generate Prisma client
pnpm --filter @mismo/db db:generate

# Push schema to database (creates tables)
pnpm --filter @mismo/db db:push

# Seed the database with initial data
pnpm --filter @mismo/db db:seed
```

#### Comms Triggers (Project Lifecycle)

For automatic Build-status notifications via pg_net, run migrations (instead of only `db:push`):

```bash
pnpm --filter @mismo/db db:migrate-deploy
```

Then set `app.comms_webhook_url` in Supabase:

```sql
ALTER DATABASE postgres SET app.comms_webhook_url = 'https://your-app.com/api/comms/webhook';
```

See [Project Lifecycle Communications](docs/project-lifecycle-communications.md).

#### Credential Encryption (n8n pipeline)

For the n8n workflow pipeline credential manager, enable pgsodium in Supabase → Database → Extensions, then run:

```bash
pnpm --filter @mismo/db db:setup-pgsodium
```

### Step 4: Configure Tailscale ACLs

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin) → **Access Controls**
2. Replace the default rules with the contents of `acl.hujson`:

```bash
cat acl.hujson
```

3. Save the changes

4. Generate auth keys:
   - Go to **Settings** → **Keys**
   - Create a reusable key for **tag:admin** (MacBooks)
   - Create a reusable key for **tag:studio** (Mac Studios)

### Step 5: Provision Network Nodes

#### On MacBooks (Admin):

```bash
./tailscale.sh admin <ts-auth-key-admin>
```

#### On Mac Studios (Studio):

```bash
./tailscale.sh studio <ts-auth-key-studio>
```

This script will:

- Install Tailscale via Homebrew
- Start the tailscaled daemon
- Authenticate with your Tailscale network
- Configure `pf` firewall rules (on Studios) to block external internet

### Step 6: Mac Studio Provisioning (Optional)

If managing Mac Studios via Ansible:

```bash
cd mac-studios-iac/ansible

# Update inventory.ini with your studio IPs
vim inventory.ini

# Run the playbook
ansible-playbook setup-studio.yml -K
```

See [mac-studios-iac/README.md](mac-studios-iac/README.md) for manual setup steps.

### Step 7: Start Development Servers

```bash
# Start all apps and packages in development mode
pnpm dev
```

This will start:

- **Web app**: http://localhost:3000 (client-facing)
- **Internal app**: http://localhost:3001 (dev team dashboard)

### Step 8: Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable desired providers (Email, Google OAuth, etc.)
4. Configure redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

### Step 9: Configure Stripe Webhooks (Optional)

For local development:

```bash
# Install Stripe CLI if not already
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local dev server (checkout, payment_intent for Hosting Transfer)
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Add the webhook signing secret to your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Project Structure Details

### Apps

| App             | Port | Description                                                     |
| --------------- | ---- | --------------------------------------------------------------- |
| `apps/web`      | 3000 | Public-facing platform (Mo chat, PRD editor, client dashboards) |
| `apps/internal` | 3001 | Internal Mission Control dashboard (fleet, commissions, agents, financials, alerts, GSD graph) |

### Packages

| Package              | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `packages/ai`        | Mo agent, safety classifier, spec generator, Cursor orchestrator, Design DNA enforcement, n8n workflow generator, Repo Surgery pipeline, Delivery pipeline |
| `packages/n8n-nodes` | Custom n8n nodes (BmadValidator, GsdDependencyChecker, ContractChecker, GsdRetryWrapper, agent nodes, ErrorLogger, Delivery pipeline nodes) |
| `packages/db`        | Prisma schema, migrations, database utilities                                        |
| `packages/ui`        | Shared React components (shadcn/ui + Design DNA navbars, heroes, content sections)  |
| `packages/shared`    | TypeScript types, constants, utilities                                               |
| `packages/farm-monitor` | Agent farm monitoring (resource, API health, build recovery, security); P0/P1/P2 alerts |
| `packages/templates` | Pre-audited architectural templates (Serverless SaaS, Monolithic MVP, Microservices) |
| `packages/gsd-dependency` | GSD topological sort, PRD parsing, cycle detection                         |
| `packages/bmad-validator` | BMAD PRD schema validation                                               |
| `packages/contract-checker` | API contract and type safety validation                                |
| `packages/error-logger` | Centralized failure logging, circuit breaker for build pipeline             |
| `packages/agents/db-architect` | Database Architect agent (SQL + Zod + TS from data contracts)      |
| `packages/agents/backend-engineer` | Backend Engineer agent (Next.js routes + OpenAPI)                 |
| `packages/agents/frontend-developer` | Frontend Developer agent (React components + typed API client)    |
| `packages/agents/devops` | DevOps agent (Vercel/Terraform config, env template, deploy script)           |
| `packages/agents/mobile-scaffold` | Mobile Scaffold agent (Expo project structure, app.json, navigation) |
| `packages/agents/mobile-feature` | Mobile Feature agent (React Native screens, RN Paper, native permissions) |
| `packages/agents/mobile-build-engineer` | Mobile Build Engineer agent (EAS builds via SSH, TestFlight/Play Console) |
| `packages/agents/store-submission` | Store Submission agent (store listings, Maestro screenshots, fastlane metadata) |

## Available Scripts

| Script                                | Description                        |
| ------------------------------------- | ---------------------------------- |
| `pnpm dev`                            | Start all apps in development mode |
| `pnpm build`                          | Build all apps and packages        |
| `pnpm lint`                           | Run ESLint across the monorepo     |
| `pnpm type-check`                     | Run TypeScript type checking       |
| `pnpm format`                         | Format code with Prettier          |
| `pnpm quickstart`                     | Full setup and start script        |
| `pnpm n8n:verify`                     | Verify n8n workflow pipeline and delivery API (requires dev servers) |
| `pnpm repo-surgery:cleanup`           | Remove expired Repo Surgery workspaces and Qdrant collections (30-day retention) |
| `pnpm --filter @mismo/db db:generate` | Generate Prisma client             |
| `pnpm --filter @mismo/db db:push`     | Push schema changes to database    |
| `pnpm --filter @mismo/db db:migrate`  | Run migrations                     |
| `pnpm --filter @mismo/db db:seed`     | Seed database with initial data    |
| `pnpm --filter @mismo/db db:seed-mission-control` | Seed Mission Control demo data (StudioMetrics, sample commissions) |
| `pnpm --filter @mismo/db db:setup-pgsodium` | Enable credential encryption for n8n pipeline |
| `./scripts/start-build-pipeline.sh`  | Start GSD build pipeline microservices |
| `./scripts/stop-build-pipeline.sh`   | Stop GSD build pipeline microservices |
| `./scripts/start-mobile-pipeline.sh` | Start Mobile build pipeline microservices (Scaffold, Feature, Build Engineer, Store Submission) |
| `./scripts/stop-mobile-pipeline.sh`  | Stop Mobile build pipeline microservices |
| `./scripts/start-repo-surgery-services.sh` | Start Qdrant (Docker) for Repo Surgery pipeline |
| `pnpm --filter @mismo/db db:migrate-deploy` | Deploy migrations (required for comms triggers; `db:push` does not run trigger SQL) |
| `./scripts/n8n-pipeline-verify.sh` | Verify n8n workflow generation and optionally delivery API (via `pnpm n8n:verify`) |
| Import `packages/n8n-nodes/workflows/hosting-monitor.json` into n8n | Hosting Transfer 5-min health checks (Vercel/Railway/Render/AWS/GCP) |

## Verification

### Network Verification

After setting up Tailscale, verify the mesh network:

```bash
# Check Tailscale status
tailscale status

# Test connectivity between nodes
ping studio-1.tailxxxxx.ts.net

# Test port restrictions (from Studio, should FAIL for port 8080)
nc -vz studio-2.tailxxxxx.ts.net 8080

# Test allowed ports (should SUCCEED)
nc -vz studio-2.tailxxxxx.ts.net 22
```

See [verification.md](verification.md) for complete verification steps.

### Application Verification

1. **Web App**: Visit http://localhost:3000
   - Landing page should load
   - "Start Building" CTA should open Mo chat
   - Authentication should work

2. **Internal Dashboard**: Visit http://localhost:3001
   - Should require authentication
   - Dev team features should be accessible

3. **Database**: Verify connection via Prisma Studio
   ```bash
   pnpm --filter @mismo/db db:studio
   ```

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy both `apps/web` and `apps/internal`

```bash
# Build locally to test
pnpm build
```

### Database Migrations (Production)

```bash
# Generate migration file
pnpm --filter @mismo/db db:migrate-dev --name your_migration_name

# Deploy migrations
pnpm --filter @mismo/db db:migrate-deploy
```

## Troubleshooting

### Database Issues

```bash
# Reset local database
pnpm --filter @mismo/db db:reset

# View Prisma Studio
pnpm --filter @mismo/db db:studio
```

### Tailscale Issues

```bash
# Restart Tailscale daemon
sudo brew services restart tailscale

# Check pf rules (Studios)
sudo pfctl -s rules

# Re-run setup script
./tailscale.sh <role> <auth-key>
```

### Build Issues

```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Network Connectivity

- **Cannot ping nodes**: Verify nodes are online in Tailscale Admin Console
- **MagicDNS not working**: Ensure MagicDNS is enabled in Tailscale DNS settings
- **Studio internet blocking not working**: Run `sudo pfctl -e` to enable pf

## Security Considerations

1. **Never commit `.env` files**: Use `.env.example` as template
2. **Rotate API keys regularly**: Especially Stripe and AI provider keys
3. **Use Row-Level Security**: All database tables have RLS enabled
4. **Service Role Key**: Only use server-side, never in client code
5. **Tailscale Tags**: Properly tag nodes to enforce ACL policies
6. **Studio Isolation**: Studios cannot access general internet (only HTTPS/DNS)

## Documentation

- [Project Lifecycle Communications](docs/project-lifecycle-communications.md) - Status updates (Resend/Slack), delivery packaging, feedback survey, maintenance mode
- [Agent Farm Monitoring](docs/agent-farm-monitoring.md) - Resource/API/build/security monitoring, automated recovery, P0/P1/P2 alerts (SMS, phone, Slack, email)
- [GSD Build Pipeline](docs/gsd-build-pipeline.md) - BMAD-contract build orchestration, agent swarm, contract validation
- [GitHub Delivery Pipeline](docs/delivery-pipeline.md) - Automated source code delivery, BMAD documentation, ownership transfer
- [Repo Surgery Pipeline](docs/repo-surgery-pipeline.md) - Modify existing codebases with BMAD boundaries, Qdrant vector search, validation gates
- [Mobile Build Pipeline](docs/mobile-build-pipeline.md) - React Native + Expo iOS/Android builds with feasibility scoring, EAS, store submission
- [n8n Workflow Pipeline](docs/n8n-workflow-pipeline.md) - Generate, test, and deploy n8n automations from PRD specs
- [Content Generation Pipeline](docs/content-generation-pipeline.md) - Fluff-free content validation for headlines, features, microcopy
- [Hosting Transfer Pipeline](docs/hosting-transfer-pipeline.md) - Deploy and transfer ownership (Vercel, Railway/Render, AWS/GCP, Self-Hosted), payment gating, 7-day monitoring |
- [Mission Control Dashboard](docs/mission-control-dashboard.md) - Fleet status, commission pipeline, agent performance, financials, GSD graph, alerting
- [Design DNA Enforcement](docs/design-dna-enforcement.md) - Design DNA schema, component library, enforcement agent
- [Design System](docs/mismo-design-system.md) - UI/UX guidelines
- [Verification Steps](verification.md) - Network testing procedures
- [Mac Studios IaC](mac-studios-iac/README.md) - Infrastructure provisioning
- Implementation plans: `.cursor/plans/`

## Contributing

1. Create a feature branch
2. Make changes following the existing code style
3. Run tests: `pnpm lint && pnpm type-check`
4. Submit a pull request

## License

[License information here]
