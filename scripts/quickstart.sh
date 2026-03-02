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

# Start dev servers
echo ""
echo "Starting development servers..."
echo "  Web (client):     http://localhost:3000"
echo "  Internal (dash):  http://localhost:3001"
echo ""
echo "Optional pipeline services (run in separate terminals):"
echo "  GSD Build Pipeline (web apps): ./scripts/start-build-pipeline.sh"
echo "  Mobile Build Pipeline (iOS/Android): ./scripts/start-mobile-pipeline.sh"
echo "  Repo Surgery (Qdrant for code modification): ./scripts/start-repo-surgery-services.sh"
echo ""
echo "Press Ctrl+C to stop"
echo ""

pnpm dev
