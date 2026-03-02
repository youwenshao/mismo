#!/usr/bin/env bash
# Start all Mobile Build Pipeline microservices for local development.
# Services: Mobile Scaffold, Mobile Feature, Mobile Build Engineer, Store Submission.
#
# Usage: ./scripts/start-mobile-pipeline.sh
# Stop:  ./scripts/stop-mobile-pipeline.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm"
  exit 1
fi

# Check for .env
if [ ! -f .env ]; then
  echo "Error: .env not found. Run 'pnpm quickstart' or copy .env.example to .env"
  exit 1
fi

# Ensure Prisma client is generated (agents depend on it)
echo "Ensuring Prisma client is generated..."
pnpm --filter @mismo/db db:generate

PIDFILE="$ROOT/.mobile-pipeline.pids"
> "$PIDFILE"

start_service() {
  local name="$1"
  local filter="$2"
  local port="$3"
  echo "Starting $name on port $port..."
  PORT="$port" pnpm --filter "$filter" dev >> "$ROOT/.mobile-pipeline-$name.log" 2>&1 &
  echo $! >> "$PIDFILE"
}

# Mobile Agents
start_service "mobile-scaffold" "@mismo/agent-mobile-scaffold" 3020
sleep 1
start_service "mobile-feature" "@mismo/agent-mobile-feature" 3021
sleep 1
start_service "mobile-build-engineer" "@mismo/agent-mobile-build-engineer" 3022
sleep 1
start_service "store-submission" "@mismo/agent-store-submission" 3023

echo ""
echo "Mobile Build Pipeline services started."
echo ""
echo "Ports:"
echo "  Mobile Scaffold:       http://localhost:3020"
echo "  Mobile Feature:        http://localhost:3021"
echo "  Mobile Build Engineer: http://localhost:3022"
echo "  Store Submission:      http://localhost:3023"
echo ""
echo "Logs: .mobile-pipeline-<service>.log"
echo "PIDs: $PIDFILE"
echo ""
echo "To stop: ./scripts/stop-mobile-pipeline.sh"
echo ""
