-- pgsodium setup: Prisma shadow database lacks pgsodium, so this migration is a no-op.
-- Run the actual pgsodium setup manually on Supabase:
--   psql $DIRECT_URL -f packages/db/scripts/setup-pgsodium.sql
-- Or execute packages/db/scripts/setup-pgsodium.sql in Supabase SQL Editor.
SELECT 1;
