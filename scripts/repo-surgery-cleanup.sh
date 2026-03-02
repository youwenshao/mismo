#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${REPO_SURGERY_WORKSPACE:-/tmp/mismo-surgery}"
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "=== Repo Surgery Cleanup ==="
echo "Workspace: $WORKSPACE_DIR"
echo "Qdrant: $QDRANT_URL"
echo "Retention: $RETENTION_DAYS days"
echo ""

cleanup_workspaces() {
  if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "No workspace directory found at $WORKSPACE_DIR"
    return
  fi

  local count=0
  for dir in "$WORKSPACE_DIR"/*/; do
    [ -d "$dir" ] || continue

    if [ "$(find "$dir" -maxdepth 0 -mtime "+$RETENTION_DAYS" 2>/dev/null)" ]; then
      local surgery_id
      surgery_id=$(basename "$dir")
      echo "Removing expired workspace: $surgery_id"
      rm -rf "$dir"
      count=$((count + 1))
    fi
  done

  echo "Removed $count expired workspaces"
}

cleanup_qdrant_collections() {
  local collections
  collections=$(curl -sf "$QDRANT_URL/collections" 2>/dev/null || echo '{"result":{"collections":[]}}')
  
  echo "$collections" | python3 -c "
import sys, json, os, time

data = json.load(sys.stdin)
collections = data.get('result', {}).get('collections', [])
retention_seconds = int(os.environ.get('RETENTION_DAYS', '30')) * 86400
workspace_dir = os.environ.get('REPO_SURGERY_WORKSPACE', '/tmp/mismo-surgery')
removed = 0

for c in collections:
    name = c.get('name', '')
    if not name.startswith('repo_surgery_'):
        continue
    
    surgery_id = name.replace('repo_surgery_', '')
    workspace_path = os.path.join(workspace_dir, surgery_id)
    
    if not os.path.exists(workspace_path):
        print(f'Removing orphaned Qdrant collection: {name}')
        removed += 1

print(f'Found {removed} orphaned Qdrant collections to remove')
" 2>/dev/null || echo "Could not check Qdrant collections (is Qdrant running?)"
}

cleanup_surgery_branches() {
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "GITHUB_TOKEN not set, skipping remote branch cleanup"
    return
  fi

  echo "Note: Remote surgery branch cleanup requires per-repo handling."
  echo "Branches matching 'surgery/*' older than $RETENTION_DAYS days should be pruned manually or via CI."
}

echo "--- Cleaning workspace directories ---"
cleanup_workspaces
echo ""

echo "--- Checking Qdrant collections ---"
cleanup_qdrant_collections
echo ""

echo "--- Checking surgery branches ---"
cleanup_surgery_branches
echo ""

echo "=== Cleanup complete ==="
