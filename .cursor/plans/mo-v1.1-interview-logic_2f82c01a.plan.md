---
name: mo-v2-interview-logic
overview: Upgrade Mo's interview logic to a dynamic, archetype-based protocol engine with a multi-agent PRD generation pipeline using Vercel AI SDK and Zod.
todos:
  - id: task-1-schemas
    content: Define Archetypes and PRD Zod Schemas (archetypes.ts, schemas.ts)
    status: pending
  - id: task-2-prompts
    content: Update Interview Protocol Engine (prompts.ts)
    status: pending
  - id: task-3-pipeline
    content: Implement Multi-Agent PRD Generation Pipeline (prd-generator.ts)
    status: pending
  - id: task-4-feasibility
    content: Implement Feasibility Pre-Check (feasibility.ts)
    status: pending
  - id: task-5-integration
    content: Integration & API Updates (session route, dashboard approval)
    status: pending
  - id: task-6-testing
    content: Create Test Suite for 5+ Scenarios (prd-generator.test.ts)
    status: pending
isProject: false
---

# Mo V1.1 Interview Logic Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Mo's interview logic to a dynamic, archetype-based protocol engine with a multi-agent PRD generation pipeline using Vercel AI SDK.

**Architecture:** We will replace the linear state machine in `prompts.ts` with a dynamic router that classifies the project into one of 9 archetypes early in the conversation. Once the interview is complete, a sequential multi-agent pipeline (Classifier -> Security -> Scope -> Coordinator) will process the transcript using Vercel AI SDK's `generateObject` and Zod schemas to produce a highly detailed, structured PRD.

**Tech Stack:** Next.js, Vercel AI SDK, Zod, Supabase, n8n webhooks.

---

### Task 1: Define Archetypes and PRD Zod Schemas

**Files:**

- Create: `packages/ai/src/interview/archetypes.ts`
- Create: `packages/ai/src/interview/schemas.ts`

**Step 1: Define the 9 Archetypes**
Create an exported constant array or enum containing the 9 archetypes:

1. Marketing/Landing Site
2. SaaS Web App
3. Internal Tool / Admin Panel
4. Agentic AI Pipeline / Automation
5. Mobile App (iOS/Android)
6. API / Backend Service
7. E-commerce Platform
8. Data Pipeline / ETL
9. Existing System Modification / Maintenance (for fixing/improving systems with admin access)

**Step 2: Define the PRD Zod Schema**
Create a comprehensive Zod schema (`prdSchema`) that includes:

- Architecture decisions
- Agent requirements
- Constraints & Acceptance criteria
- Security requirements (HIPAA/GDPR/none)
- Scale expectations (users/day)
- Phased breakdown (MVP vs V2)

### Task 2: Update Interview Protocol Engine

**Files:**

- Modify: `packages/ai/src/interview/prompts.ts`

**Step 1: Implement Dynamic Prompting**
Update `MO_BASE_PROMPT` to instruct Mo to identify the project archetype within the first 3 messages.
Add archetype-specific follow-up questions (e.g., asking for admin access details for "Existing System Modification", or Apple Dev accounts for "Mobile App").

**Step 2: Add Validation Rules**
Add strict instructions to the prompt to refuse to proceed if client answers are too vague, forcing specificity before increasing the internal `readiness` score.

### Task 3: Implement Multi-Agent PRD Generation Pipeline

**Files:**

- Create: `packages/ai/src/interview/prd-generator.ts`

**Step 1: Implement Sub-Agents**
Create async functions using Vercel AI SDK's `generateObject` or `generateText`:

- `runSecurityAgent(transcript)`: Extracts compliance/security needs.
- `runScopeAgent(transcript)`: Breaks the project into logical phases.
- `runOutputCoordinator(transcript, securityData, scopeData)`: Merges all context and generates the final PRD matching `prdSchema`.

### Task 4: Implement Feasibility Pre-Check

**Files:**

- Create: `packages/ai/src/interview/feasibility.ts`

**Step 1: Token & Queue Checks**
Implement a function `runFeasibilityCheck(transcript, prd)` that:

- Calculates estimated Kimi tokens (128k context check) based on transcript length.
- Checks against current queue depth (mocked or via n8n API) to extend ETA if needed.
- Validates platform-specific requirements (e.g., Apple Developer account presence).

### Task 5: Integration & API Updates

**Files:**

- Modify: `apps/web/src/app/api/interview/session/[id]/route.ts` (or the relevant completion endpoint)
- Modify: `apps/web/src/app/dashboard/page.tsx` (or relevant dashboard component)

**Step 1: Trigger Pipeline on Completion**
Update the session completion logic to await the `runOutputCoordinator` and `runFeasibilityCheck` instead of the old summary generation.

**Step 2: Supabase & Webhook Integration**
Ensure the generated PRD is saved to the Supabase `commissions` table with a `pending_approval` status.
Verify that the n8n webhook is ONLY triggered when a human clicks "Approve" on the admin dashboard (do not trigger it automatically upon PRD generation).

### Task 6: Testing

**Files:**

- Create: `packages/ai/src/interview/__tests__/prd-generator.test.ts`

**Step 1: Write Test Cases**
Create 5 mock interview transcripts representing:

1. Marketing site
2. SaaS dashboard
3. iOS app
4. n8n automation
5. Legacy API bridge

**Step 2: Verify PRD Generation**
Write tests to ensure `runOutputCoordinator` successfully parses these transcripts into valid `prdSchema` objects without errors.