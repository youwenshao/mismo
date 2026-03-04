#!/usr/bin/env bash
# Start all GSD Build Pipeline microservices for local development.
# Services: GSD Dependency, BMAD Validator, Contract Checker, DB Architect,
#           Backend Engineer, Frontend Developer, DevOps Agent, Error Logger.
#
# Usage: ./scripts/start-build-pipeline.sh
# Stop:  pkill -f "tsx watch.*packages/(gsd-dependency|bmad-validator|contract-checker|agents|error-logger)"

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

PIDFILE="$ROOT/.build-pipeline.pids"
> "$PIDFILE"

start_service() {
  local name="$1"
  local filter="$2"
  local port="$3"
  echo "Starting $name on port $port..."
  PORT="$port" pnpm --filter "$filter" dev >> "$ROOT/.build-pipeline-$name.log" 2>&1 &
  echo $! >> "$PIDFILE"
}

# Validators (use distinct ports to run concurrently)
start_service "gsd-dependency" "@mismo/gsd-dependency" 3010
sleep 1
start_service "bmad-validator" "@mismo/bmad-validator" 3011
sleep 1
start_service "contract-checker" "@mismo/contract-checker" 3012
sleep 1

# Agents
start_service "db-architect" "@mismo/agent-db-architect" 3030
sleep 1
start_service "backend-engineer" "@mismo/agent-backend-engineer" 3031
sleep 1
start_service "frontend-developer" "@mismo/agent-frontend-developer" 3032
sleep 1
start_service "devops" "@mismo/agent-devops" 3033
sleep 1
start_service "error-logger" "@mismo/error-logger" 3034

echo ""
echo "GSD Build Pipeline services started."
echo ""
echo "Ports:"
echo "  GSD Dependency:     http://localhost:3010"
echo "  BMAD Validator:     http://localhost:3011"
echo "  Contract Checker:  http://localhost:3012"
echo "  DB Architect:      http://localhost:3030"
echo "  Backend Engineer:  http://localhost:3031"
echo "  Frontend Developer: http://localhost:3032"
echo "  DevOps Agent:      http://localhost:3033"
echo "  Error Logger:      http://localhost:3034"
echo ""
echo "Logs: .build-pipeline-<service>.log"
echo "PIDs: $PIDFILE"
echo ""
echo "To stop: ./scripts/stop-build-pipeline.sh"
echo ""
