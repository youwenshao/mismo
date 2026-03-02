#!/usr/bin/env bash
set -euo pipefail

# Secret Rotation Checklist for Mismo Infrastructure
# Run before each launch or quarterly rotation cycle.
#
# Usage: bash scripts/rotate-secrets.sh [--generate-only]
#   --generate-only  Only generate new random secrets, don't prompt for manual steps

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

log_step() { echo -e "\n${BOLD}[$1/${TOTAL_STEPS}]${NC} $2"; }
log_ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }

TOTAL_STEPS=8
GENERATE_ONLY=false

if [[ "${1:-}" == "--generate-only" ]]; then
  GENERATE_ONLY=true
fi

echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD} Mismo Secret Rotation Checklist${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: Generate new random secrets
log_step 1 "Generating new random secrets"

NEW_N8N_KEY=$(openssl rand -hex 32)
NEW_REDIS_PASS=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
NEW_WEBHOOK_SECRET=$(openssl rand -hex 32)

log_ok "N8N_ENCRYPTION_KEY: ${NEW_N8N_KEY}"
log_ok "REDIS_PASSWORD:     ${NEW_REDIS_PASS}"
log_ok "COMMS_WEBHOOK_SECRET: ${NEW_WEBHOOK_SECRET}"
echo ""
echo "  Copy these into your .env files before restarting services."

if $GENERATE_ONLY; then
  echo ""
  echo -e "${GREEN}Generated secrets printed above. Exiting (--generate-only).${NC}"
  exit 0
fi

# Step 2: Stripe keys
log_step 2 "Stripe API Keys"
echo "  1. Go to https://dashboard.stripe.com/apikeys"
echo "  2. Roll the Secret Key (sk_live_...)"
echo "  3. Roll the Webhook Signing Secret (whsec_...)"
echo "  4. Update STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in:"
echo "     - .env (root)"
echo "     - docker/n8n-ha/.env (if used there)"
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 3: GitHub tokens
log_step 3 "GitHub Tokens"
echo "  1. Go to https://github.com/settings/tokens"
echo "  2. Create a new fine-grained PAT with minimal scopes:"
echo "     - repo (read/write for mismo-agency org)"
echo "     - actions (read)"
echo "  3. Revoke the old PAT"
echo "  4. Update GITHUB_TOKEN in .env and docker/n8n-ha/.env"
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 4: Kimi API Key
log_step 4 "Kimi API Key (Moonshot AI)"
echo "  1. Go to https://platform.moonshot.cn/console/api-keys"
echo "  2. Generate a new API key"
echo "  3. Revoke the old key"
echo "  4. Update KIMI_API_KEY in .env and docker/n8n-ha/.env"
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 5: Supabase service role key
log_step 5 "Supabase Service Role Key"
echo "  1. Go to https://supabase.com/dashboard/project/_/settings/api"
echo "  2. Regenerate the service_role key"
echo "  3. Update SUPABASE_SERVICE_ROLE_KEY in:"
echo "     - .env (root)"
echo "     - docker/n8n-ha/.env"
echo "  WARNING: This will invalidate all existing service-role sessions."
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 6: n8n encryption key
log_step 6 "n8n Encryption Key"
echo "  New key generated above: ${NEW_N8N_KEY}"
echo "  1. Update N8N_ENCRYPTION_KEY in docker/n8n-ha/.env"
echo "  2. Restart all n8n nodes (main + workers)"
echo "  WARNING: Changing this key will invalidate encrypted n8n credentials."
echo "  You must re-enter all n8n credential values after rotation."
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 7: Redis password
log_step 7 "Redis Password"
echo "  New password generated above: ${NEW_REDIS_PASS}"
echo "  1. Update REDIS_PASSWORD in docker/n8n-ha/.env"
echo "  2. Restart Redis, n8n-main, and all workers"
read -rp "  Press Enter when done (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

# Step 8: Verify
log_step 8 "Post-Rotation Verification"
echo "  Run the following checks:"
echo "  1. docker compose -f docker/n8n-ha/docker-compose.main.yml up -d"
echo "  2. Verify n8n UI loads: https://<N8N_HOST>"
echo "  3. Verify Supabase connectivity: pnpm --filter @mismo/db db:push --dry-run"
echo "  4. Verify Stripe webhook: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "  5. Verify GitHub: gh auth status"
read -rp "  Press Enter when all checks pass (or 's' to skip): " ans
[[ "$ans" == "s" ]] && log_warn "Skipped" || log_ok "Done"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD} Secret rotation complete!${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo "Remember to:"
echo "  - Update Credential.rotationDate in the database for client credentials"
echo "  - Document the rotation in the audit log"
echo "  - Schedule next rotation (recommended: quarterly)"
