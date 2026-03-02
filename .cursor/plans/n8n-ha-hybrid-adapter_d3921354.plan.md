---
name: n8n-ha-hybrid-adapter
overview: Deploy n8n in High-Availability mode using a Hybrid Adapter pattern, delegating compute-heavy BMAD, GSD, and AST validation to dedicated microservices, with audit logging mapped to the existing Supabase BuildLog schema.
todos:
  - id: docker-compose
    content: Create Docker Compose configurations (`docker-compose.main.yml` and `docker-compose.worker.yml`) for Studio 1 and Studios 2/3.
    status: pending
  - id: microservices
    content: Develop dedicated microservices (`bmad-validator`, `gsd-dependency`, `contract-checker`) for AST analysis and validation.
    status: pending
  - id: n8n-nodes
    content: Build custom n8n nodes (Hybrid Adapters) to act as clients to the microservices.
    status: pending
  - id: gate-1-bmad
    content: 'Implement Gate 1: BMAD PRD completeness validation logic and routing.'
    status: pending
  - id: gate-2-gsd
    content: 'Implement Gate 2: GSD topological sorting logic adhering to n8n Queue Mode constraints.'
    status: pending
  - id: gate-3-contract
    content: 'Implement Gate 3: AST-based Contract Checker logic for worker nodes.'
    status: pending
  - id: supabase-audit
    content: Integrate Supabase logging to record all gate decisions to the existing `BuildLog` table via Prisma.
    status: pending
  - id: env-templates
    content: Create `.env.example` templates with shared encryption keys and Redis auto-reconnection parameters.
    status: pending
isProject: false
---

# n8n High-Availability Orchestrator with Hybrid Adapter Pattern

## Architecture Details

This architecture leverages n8n for workflow state and tool-calling, while delegating intensive analysis to dedicated microservices (Option B) via custom n8n nodes (Option A).

**Studio 1 (M4 Max) - Control Plane:**

- `n8n-main`: Handles webhooks, UI, and orchestrates the swarm.
- `redis`: Persistent job queue with auto-reconnection logic.
- `postgres`: Local database for n8n execution metadata.
- `bmad-validator-service`: Microservice for PRD architecture review and validation.
- `gsd-dependency-service`: Microservice for global dependency graph construction.

**Studio 2 & 3 (M2 Ultra) - Execution Plane:**

- `n8n-worker`: 50 total workers (25 per Studio) pulling from Redis.
- `contract-checker-service`: Microservice performing AST analysis and cross-service interface validation.
- Docker socket (`/var/run/docker.sock`) mounted for worker agents to build containers.

## Supabase Schema Adaptation

To log all validation gate decisions without altering the existing schema, we will map audit trails to the `BuildLog` model in `packages/db/prisma/schema.prisma`:

- `projectId`: Links the validation to the specific project.
- `stage`: Maps to the Gate (e.g., `GATE_1_BMAD_VALIDATOR`, `GATE_2_GSD_DEPENDENCY`, `GATE_3_CONTRACT_CHECK`).
- `status`: Maps to the decision (`PASS` or `FAIL`).
- `output`: Detailed JSON containing rejection feedback, feasibility scores, or contract violations.

## Validation Gates & Workflows

1. **Gate 1: BMAD Validator (Pre-flight)**

- **Trigger:** Webhook receives PRD.
- **Action:** n8n Custom Node calls `bmad-validator-service`.
- **Validation:** Checks for `tech_stack`, `api_contracts`, `data_boundaries`, and `feasibility_score`.
- **Result:** If fail, routes back to "Mo" agent with missing fields. Logs to `BuildLog`.

2. **Gate 2: GSD Dependency Checker (Planning)**

- **Trigger:** Decomposer agent generates a swarm plan.
- **Action:** n8n Custom Node calls `gsd-dependency-service`.
- **Validation:** Performs topological sort to ensure blocking dependencies (e.g., Database before Frontend) are queued sequentially in n8n Queue Mode, while safe tasks run in parallel.
- **Result:** Outputs sorted queue payload. Logs to `BuildLog`.

3. **Gate 3: Contract Checker (Execution)**

- **Trigger:** Coding agents complete their tasks.
- **Action:** n8n Custom Node calls `contract-checker-service` on the worker node.
- **Validation:** Performs AST analysis to verify interface compatibility against the architecture ADRs.
- **Result:** Approves for merge or rejects back to coding agent. Logs to `BuildLog`.

## Configuration & Resiliency

- Shared `N8N_ENCRYPTION_KEY` across all Studio nodes.
- Environment templates mapped for main and worker nodes.
- Auto-reconnection for Redis explicitly configured to handle intermittent drops between Studios.
