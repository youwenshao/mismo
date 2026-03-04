#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/promote-user.sh <supabase_auth_id> [role]"
  echo "Default role is ADMIN"
  exit 1
fi

AUTH_ID=$1
ROLE=${2:-ADMIN}

echo "Promoting user $AUTH_ID to $ROLE..."

# Run a small TS script to update the user role
pnpm --filter @mismo/db exec tsx -e "
import { prisma } from './src/index';
async function main() {
  const user = await prisma.user.upsert({
    where: { supabaseAuthId: '$AUTH_ID' },
    update: { role: '$ROLE' },
    create: { supabaseAuthId: '$AUTH_ID', role: '$ROLE' }
  });
  console.log('User updated:', user);
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"
