#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Mismo Frontend Local Deployment Test"
echo "===================================="

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
fi

# Ensure .env exists
if [ ! -f .env ]; then
  echo "Error: .env not found. Run 'pnpm quickstart' or copy .env.example to .env"
  exit 1
fi

echo "Building frontend apps..."
pnpm --filter @mismo/web build
pnpm --filter @mismo/internal build

echo "Starting frontend apps in production mode..."
echo "  Web (client):       http://localhost:3000"
echo "  Internal (Mission Control): http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"

# Start both using concurrently or background jobs
pnpm --filter @mismo/web start &
PID1=$!

PORT=3001 pnpm --filter @mismo/internal start &
PID2=$!

trap "kill $PID1 $PID2" EXIT
wait
