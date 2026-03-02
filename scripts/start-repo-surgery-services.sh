#!/usr/bin/env bash
# Start Qdrant vector database for Repo Surgery pipeline.
# Required for code embedding storage and semantic search.
#
# Usage: ./scripts/start-repo-surgery-services.sh
# Stop:  docker stop mismo-qdrant  (or docker compose down)
#
# Note: Repo Surgery also requires the internal app (pnpm dev) to be running
# for API routes. This script only starts Qdrant.

set -e

CONTAINER_NAME="${REPO_SURGERY_QDRANT_CONTAINER:-mismo-qdrant}"
QDRANT_PORT="${QDRANT_PORT:-6333}"

echo "Starting Qdrant for Repo Surgery pipeline"
echo "========================================="

if ! command -v docker &> /dev/null; then
  echo "Error: Docker is required. Install Docker Desktop or Docker Engine."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Qdrant container '${CONTAINER_NAME}' is already running."
    echo "  URL: http://localhost:${QDRANT_PORT}"
    echo ""
    exit 0
  else
    echo "Starting existing container ${CONTAINER_NAME}..."
    docker start "${CONTAINER_NAME}"
  fi
else
  echo "Creating and starting Qdrant container..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${QDRANT_PORT}:6333" \
    -p 6334:6334 \
    qdrant/qdrant
fi

echo ""
echo "Qdrant is running."
echo "  URL: http://localhost:${QDRANT_PORT}"
echo "  Dashboard: http://localhost:${QDRANT_PORT}/dashboard"
echo ""
echo "Ensure .env has:"
echo "  QDRANT_URL=http://localhost:${QDRANT_PORT}"
echo ""
echo "To stop: docker stop ${CONTAINER_NAME}"
echo ""
