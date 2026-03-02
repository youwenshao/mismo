#!/usr/bin/env bash
# Stop all Mobile Build Pipeline microservices started by start-mobile-pipeline.sh.
#
# Usage: ./scripts/stop-mobile-pipeline.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDFILE="$ROOT/.mobile-pipeline.pids"

if [ -f "$PIDFILE" ]; then
  echo "Stopping Mobile Build Pipeline services..."
  while read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm -f "$PIDFILE"
  echo "Done."
else
  # Fallback: kill by process pattern
  echo "No PID file found. Trying to stop by process pattern..."
  pkill -f "tsx watch.*packages/agents/mobile\|tsx watch.*packages/agents/store-submission" 2>/dev/null || true
  echo "Done."
fi
