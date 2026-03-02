#!/usr/bin/env bash
# Stop all GSD Build Pipeline microservices started by start-build-pipeline.sh.
#
# Usage: ./scripts/stop-build-pipeline.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDFILE="$ROOT/.build-pipeline.pids"

if [ -f "$PIDFILE" ]; then
  echo "Stopping GSD Build Pipeline services..."
  while read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm -f "$PIDFILE"
  echo "Done."
else
  # Fallback: kill by process pattern
  echo "No PID file found. Trying to stop by process pattern..."
  pkill -f "tsx watch.*packages/\(gsd-dependency\|bmad-validator\|contract-checker\|agents\|error-logger\)" 2>/dev/null || true
  echo "Done."
fi
