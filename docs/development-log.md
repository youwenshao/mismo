# Development Log: Auth and Dashboards Implementation

**Date:** February 24, 2026
**Status:** Completed

## 1. Overview
Implemented a privacy-first authentication system using Supabase Auth (SSO) and built minimalist dashboards for both clients and internal developers. The core philosophy was **anonymity by design**: zero personal data (emails, names) is stored in the application database.

## 2. Technical Architecture

### 2.1 Privacy-First Auth Flow
1. **SSO Provider:** User authenticates via Google or GitHub (Supabase Auth).
2. **Callback Handling:** The system receives the user's email transiently during the OAuth callback.
3. **Email Hashing:** The email is immediately hashed using **SHA-256**.
4. **Admin Whitelist:** The hash is compared against `ADMIN_EMAIL_HASHES` in the environment variables.
5. **Database Storage:** A record is created/updated in the Prisma `User` table using only the `supabaseAuthId`. The actual email is discarded and never touches the database.

### 2.2 Key Files Created/Modified
- `apps/web/src/lib/auth.ts`: Logic for email hashing and session user retrieval.
- `apps/web/src/app/auth/page.tsx`: Minimalist SSO login page.
- `apps/web/src/app/auth/callback/route.ts`: Server-side handler for role assignment and redirection.
- `apps/web/src/middleware.ts`: Session refresh and route protection for the client app.
- `apps/internal/src/middleware.ts`: Role-based access control (RBAC) for the internal app.
- `apps/web/src/app/chat/page.tsx`: Mo chat interface with streaming AI support.

## 3. Troubleshooting & Common Issues

If errors reappear, check these documented solutions:

### Issue A: Prisma cannot find `DATABASE_URL`
**Symptom:** `error: Environment variable not found: DATABASE_URL` when running `db:push` or `db:generate`.
**Cause:** Prisma expects the `.env` file to be in the package folder (`packages/db/`) or where the command is executed.
**Solution:**
Create a symbolic link from the root `.env` to the package folder:
```bash
ln -s ../../.env packages/db/.env
```

### Issue B: Database Connection Refused (P1001)
**Symptom:** `Error: P1001: Can't reach database server at ...:5432`.
**Cause:** Likely an IPv6 connectivity issue or direct connection being blocked by a firewall.
**Solution:**
Use the **Supabase Connection Pooler** URL (Port `6543`) instead of the direct URL (Port `5432`). Find this in the Supabase Dashboard under Settings > Database.

### Issue C: Next.js missing Supabase Environment Variables
**Symptom:** `Error: Your project's URL and Key are required to create a Supabase client!`.
**Cause:** In a Turborepo, the app workspace (`apps/web`) doesn't automatically inherit the root `.env`.
**Solution:**
Link the root `.env` to the specific app directory and restart the dev server:
```bash
ln -s ../../.env apps/web/.env
pnpm dev
```

### Issue D: Seed File Validation Errors
**Symptom:** Prisma error regarding `email` field during `pnpm quickstart` or seeding.
**Cause:** The `User` model was updated to remove `email`, but the `packages/db/src/seed.ts` file still referenced it.
**Solution:**
Update `seed.ts` to use `supabaseAuthId` instead of `email`. (Already implemented in current version).

### Issue E: Missing Database Schema (P2021)
**Symptom:** `Error [PrismaClientKnownRequestError]: The table public.User does not exist in the current database.` (code `P2021`).
**Cause:** The database was initialized but the Prisma schema was never pushed to the database.
**Solution:**
Run `pnpm --filter @mismo/db db:push --accept-data-loss` followed by `pnpm --filter @mismo/db db:seed`. The `scripts/quickstart.sh` has been updated to automate this.

### Issue F: Edge Runtime Prisma Conflict
**Symptom:** `Error [PrismaClientValidationError]: In order to run Prisma Client on edge runtime, either: - Use Prisma Accelerate ... - Use Driver Adapters`.
**Cause:** Attempting to use the standard Prisma Client in Next.js Middleware (which runs in the Edge Runtime) without a driver adapter.
**Solution:**
Avoid using Prisma in `middleware.ts`. Move database-dependent checks (like role-based access control) to Server Components or Layouts.

### Issue G: Prepared Statement Errors (PgBouncer)
**Symptom:** `ConnectorError: PostgresError { code: "26000", message: "prepared statement \"s5\" does not exist" }`.
**Cause:** Supabase's Supavisor/PgBouncer connection pooler in "Transaction Mode" does not support prepared statements across different sessions.
**Solution:**
Append `?pgbouncer=true` to the `DATABASE_URL` in `.env`. Additionally, define a `DIRECT_URL` in the Prisma schema for migrations and administrative tasks to bypass the pooler.

## 4. Design Guidelines (Minimalism)
- **Typography:** System sans-serif stack.
- **Colors:** Pure white (`#FFFFFF`) background, black foreground, gray scale for hierarchy.
- **Chrome:** No gradients, shadows, or borders on structural containers.
- **Hierarchy:** Use spacing and font-weight instead of borders or cards.
- **Dashboards:** Calm, quiet spaces with technical information hidden for clients and prioritized for engineers.
