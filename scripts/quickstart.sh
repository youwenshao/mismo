#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Mismo platform quickstart"
echo "========================="

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Ensure .env exists
if [ ! -f .env ]; then
  echo ""
  echo "No .env found. Copying from .env.example..."
  cp .env.example .env
  echo "Created .env. Please fill in your API keys and secrets before using the platform."
  echo "Required for full functionality: DATABASE_URL, OPENAI_API_KEY or ANTHROPIC_API_KEY"
  echo "For Repo Surgery: QDRANT_URL (run ./scripts/start-repo-surgery-services.sh)"
  echo "For Delivery Pipeline: GITHUB_TOKEN, GITHUB_DELIVERY_ORG"
  echo "For lifecycle comms: RESEND_API_KEY (status updates, delivery, feedback emails)"
  echo "For Mission Control financials: STRIPE_SECRET_KEY (revenue aggregation)"
  echo "For agent farm monitoring: SLACK_ALERT_WEBHOOK_URL, ALERT_PHONE_NUMBER, Twilio (P0 SMS/phone)"
  echo ""
else
  echo ""
  echo ".env found"
fi

# Generate Prisma client and push schema
echo ""
echo "Setting up database..."
pnpm --filter @mismo/db db:generate
pnpm --filter @mismo/db db:push --accept-data-loss
pnpm --filter @mismo/db db:seed
echo "  Optional: pnpm --filter @mismo/db db:seed-mission-control  # Demo data for Mission Control dashboard"

# Start dev servers
echo ""
echo "Starting development servers..."
echo "  Web (client):       http://localhost:3000"
echo "  Internal (Mission Control): http://localhost:3001"
echo ""
echo "Optional pipeline services (run in separate terminals):"
echo "  GSD Build Pipeline (web apps): ./scripts/start-build-pipeline.sh"
echo "  Mobile Build Pipeline (iOS/Android): ./scripts/start-mobile-pipeline.sh"
echo "  Repo Surgery (Qdrant for code modification): ./scripts/start-repo-surgery-services.sh"
echo "  Delivery Pipeline (runs via internal app on Commission COMPLETED; import delivery-pipeline.json to n8n)"
echo ""
echo "Hosting Transfer (deploy + ownership handoff):"
echo "  Set VERCEL_API_TOKEN, RAILWAY_API_TOKEN, or RENDER_API_KEY in .env as needed"
echo "  Import packages/n8n-nodes/workflows/hosting-monitor.json into n8n for 7-day post-transfer monitoring"
echo ""
echo "Agent Farm Monitoring (Mac Studios n8n HA):"
echo "  Farm-monitor runs on Studio 1 (docker-compose.main.yml)"
echo "  Deploy resource-watchdog: cd mac-studios-iac/ansible && ansible-playbook setup-monitoring.yml -K"
echo "  See docs/agent-farm-monitoring.md"
echo ""
echo "Press Ctrl+C to stop"
echo ""

pnpm dev
