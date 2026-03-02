# Development Log

## Repo Surgery + BMAD-Archaeology Pipeline

**Date:** March 2, 2026
**Status:** Completed

### Overview

Implemented a full pipeline for modifying existing codebases with BMAD boundary enforcement. The pipeline ingests repos, vectorizes code into Qdrant, maps boundaries (Core/Shell/Adapter/Safe to Modify), extracts contracts, performs impact analysis, generates diffs with tests, runs validation gates, and creates GitHub PRs with confidence scoring.

### Components Delivered

1. **Core logic** (`packages/ai/src/repo-surgery/`): RepoIngestion, ASTParser, CodeChunker, CodeEmbedder, CodeVectorStore, BoundaryMapper, ContractExtractor, ImpactAnalysisAgent, DiffGenerationAgent, ValidationGates, ReviewGenerator, RepoSurgeryPipeline
2. **n8n nodes**: RepoIngestion, CodeVectorizer, BoundaryMapper, ContractExtractor, ImpactAnalysis, DiffGenerator, ValidationGate, ReviewGenerator
3. **API routes** (`apps/internal/api/repo-surgery/`): ingest, vectorize, analyze, modify, validate, review, pipeline
4. **n8n workflow**: `packages/n8n-nodes/workflows/repo-surgery-pipeline.json`
5. **Database**: RepoSurgery model with RepoSurgeryStatus enum
6. **Scripts**: `start-repo-surgery-services.sh` (Qdrant via Docker), `repo-surgery-cleanup.sh` (30-day retention)

### Setup Notes

- Start Qdrant: `./scripts/start-repo-surgery-services.sh`
- Full pipeline: `POST /api/repo-surgery/pipeline` or n8n webhook
- Cleanup: `pnpm repo-surgery:cleanup`
- Documentation: [docs/repo-surgery-pipeline.md](repo-surgery-pipeline.md)

---

## Mobile Build Pipeline

**Date:** March 2, 2026
**Status:** Completed

### Overview

Implemented a React Native + Expo build pipeline for iOS/Android with BMAD feasibility scoring. The pipeline orchestrates four agent microservices (Scaffold, Feature, Build Engineer, Store Submission) via n8n, with a feasibility gate that halts builds scoring below 6/10.

### Components Delivered

1. **Mobile Feasibility Checker** (`packages/n8n-nodes/nodes/MobileFeasibilityChecker`): BMAD scoring node; outputs `architectureDecision` (expo-managed vs expo-bare).
2. **Mobile Scaffold Agent** (`packages/agents/mobile-scaffold`, port 3020): Expo SDK 52 structure, app.json, Expo Router, NativeWind, Zustand/RTK auto-selection.
3. **Mobile Feature Agent** (`packages/agents/mobile-feature`, port 3021): Screens, React Native Paper, native permissions (camera, location, notifications).
4. **Mobile Build Engineer Agent** (`packages/agents/mobile-build-engineer`, port 3022): SSH to Studio 2/3, EAS build, TestFlight/Play Console submission.
5. **Store Submission Agent** (`packages/agents/store-submission`, port 3023): Store listings, Maestro flows, fastlane metadata.

### Integration Notes

- Run agents locally: `./scripts/start-mobile-pipeline.sh`
- Trigger build: `POST /api/mobile/build` with `{ buildId, prdJson, credentials }`
- n8n workflow: `packages/n8n-nodes/workflows/mobile-build-pipeline.json`
- Contract checker extended with `/check-mobile-architecture`, `/check-app-size`, `/check-bundle-id`
- GSD dependency parser supports mobile task types via `/parse-mobile-prd`

### Documentation

- [Mobile Build Pipeline](mobile-build-pipeline.md) — Full reference documentation.

---

## Content Generation Pipeline

**Date:** March 2, 2026
**Status:** Completed

### Overview

Implemented a content generation pipeline that eliminates marketing fluff. The pipeline produces validated `content.json` (headlines, features, microcopy) for the Frontend Developer agent. It runs **before** the Frontend agent; if validation fails, the build halts and the client receives an automated email requesting content revision.

### Components Delivered

1. **ContentGenerator Node** (`packages/n8n-nodes/nodes/ContentGenerator/ContentGenerator.node.ts`): Custom n8n node accepting PRD text, business description, and target audience (B2B/B2C).
2. **ValidationLayer** (`packages/n8n-nodes/nodes/ContentGenerator/ValidationLayer.ts`): Validates content against:
   - Forbidden phrases: `best`, `most advanced`, `revolutionary`, `cutting-edge`
   - Flesch-Kincaid readability (B2C ≤ 8th grade, B2B ≤ 12th grade)
   - Hemingway-style: adverbs (`-ly` words), passive voice

### Content Rules Enforced

- **Headlines:** Specificity Formula — `[Specific metric] + [Timeframe] + [Benefit]` (e.g. "Cut deployment time by 40% in 2 weeks")
- **Features:** "So what?" format — "You can [action] which means [outcome]", max 2 sentences
- **Microcopy:** Action-oriented CTAs, specific error messages, descriptive loading states

### Integration Notes

- Runs before Frontend Developer agent in the n8n workflow.
- Output: `content.json` with `headlines`, `features`, `microcopy`.
- Configure `LLM_SERVICE_URL` for the LLM content generation endpoint.
- Add ContentGenerator to the n8n node list in `packages/n8n-nodes/package.json` when deploying.

### Documentation

- [Content Generation Pipeline](content-generation-pipeline.md) — Full reference documentation.

---

## Design DNA Enforcement System

**Date:** March 2, 2026
**Status:** Completed

### Overview

Implemented a Design DNA enforcement system to prevent generic AI-generated frontend output. The system validates generated HTML/CSS against a strict schema and visual references before acceptance.

### Components Delivered

1. **Design DNA Schema** (`packages/ai/src/design-enforcement/schema.ts`): Zod schema for mood, typography, colors, motion, and content rules.
2. **Curated Component Library** (`packages/ui/src/components/`): 15 React/Tailwind components — 5 navbars, 5 heroes, 5 content sections.
3. **Qdrant Reference System** (`packages/ai/src/design-enforcement/reference-system.ts`): Vector storage for Awwwards screenshot embeddings; semantic query by intent (e.g. "dark mode SaaS" → top 3 component IDs).
4. **Enforcement Agent** (`packages/ai/src/design-enforcement/agent.ts`): Validates HTML/CSS against Design DNA; rejects when >3 violations; returns specific fix suggestions.

### Integration Notes

- Runs after Frontend Developer agent in the pipeline.
- Use `EnforcementAgent.evaluateDesign(html, css, designDna, intent)` with an AI LanguageModel.
- Replace `generateMockEmbedding()` in reference-system.ts with a real embedding API (e.g. OpenAI) for production.
- Qdrant collection `awwwards_references` must be seeded with 20+ reference screenshots for effective lookups.

### Documentation

- [Design DNA Enforcement](design-dna-enforcement.md) — Full reference documentation.

---

## Auth and Dashboards Implementation

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
