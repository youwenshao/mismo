#!/usr/bin/env bash
# Verify n8n workflow pipeline is operational
# Prerequisites: pnpm dev (internal app on 3001), Docker running
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INTERNAL_URL="${INTERNAL_APP_URL:-http://localhost:3001}"

echo "n8n Pipeline Verification"
echo "========================="
echo "Internal app URL: $INTERNAL_URL"
echo ""

# 1. Check internal app is reachable
echo "1. Checking internal app..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$INTERNAL_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "000" || -z "$HTTP_CODE" ]]; then
  echo "   FAIL: Internal app not reachable at $INTERNAL_URL"
  echo "   Run: pnpm dev (internal app should be on port 3001)"
  exit 1
fi
echo "   OK (HTTP $HTTP_CODE)"
echo ""

# 2. Test workflow generation (no Docker required)
echo "2. Testing workflow generation..."
RESPONSE=$(curl -s --max-time 60 -X POST "$INTERNAL_URL/api/n8n/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "VerifyTest",
    "trigger": { "type": "manual", "config": {} },
    "actions": [{ "integration": "slack", "operation": "send", "parameters": {} }]
  }')

if echo "$RESPONSE" | grep -q '"workflow"'; then
  echo "   OK (workflow generated)"
else
  echo "   FAIL: $RESPONSE"
  exit 1
fi
echo ""

# 3. Test delivery validation API (quick smoke test with empty temp dir)
echo "3. Testing delivery validation API..."
TMP_WS=$(mktemp -d 2>/dev/null || echo "/tmp")
VAL_RESP=$(curl -s --max-time 10 -X POST "$INTERNAL_URL/api/delivery/validate" \
  -H "Content-Type: application/json" \
  -d "{\"workspaceDir\":\"$TMP_WS\",\"buildStatus\":\"SUCCESS\",\"commissionStatus\":\"COMPLETED\"}" 2>/dev/null || echo "{}")
[ -d "$TMP_WS" ] && rmdir "$TMP_WS" 2>/dev/null || true
if echo "$VAL_RESP" | grep -q '"allPassed"'; then
  echo "   OK (delivery validate endpoint responding)"
else
  echo "   WARN: delivery validate failed or unreachable (optional)"
fi
echo ""

# 4. Optional: test sandbox (requires Docker)
echo "4. Testing sandbox (requires Docker)..."
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  START_RESP=$(curl -s --max-time 90 -X POST "$INTERNAL_URL/api/sandbox/start" \
    -H "Content-Type: application/json" \
    -d '{}')
  if echo "$START_RESP" | grep -q '"containerId"'; then
    CONTAINER_ID=$(echo "$START_RESP" | grep -o '"containerId":"[^"]*"' | cut -d'"' -f4)
    echo "   Sandbox started (container: $CONTAINER_ID)"
    curl -s -X POST "$INTERNAL_URL/api/sandbox/stop" \
      -H "Content-Type: application/json" \
      -d "{\"containerId\": \"$CONTAINER_ID\"}" >/dev/null
    echo "   OK (sandbox started and stopped)"
  else
    echo "   WARN: Sandbox start failed (Docker may need more resources)"
  fi
else
  echo "   SKIP (Docker not running or not installed)"
fi
echo ""

echo "Verification complete."
echo "  - Workflow generation: docs/n8n-workflow-pipeline.md"
echo "  - Delivery pipeline: docs/delivery-pipeline.md"
