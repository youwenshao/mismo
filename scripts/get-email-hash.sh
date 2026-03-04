#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/get-email-hash.sh <email>"
  exit 1
fi

EMAIL=$(echo "$1" | tr '[:upper:]' '[:lower:]' | xargs)
echo -n "$EMAIL" | shasum -a 256 | awk '{print $1}'
