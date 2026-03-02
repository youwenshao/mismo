---
name: n8n-ha-hybrid-adapter
overview: Deploy n8n in High-Availability mode using a Hybrid Adapter pattern, delegating compute-heavy AST, GSD, and BMAD validation to dedicated auto-scaling microservices, while mapping audit logs and state tracking to the existing Supabase Build and Commission schema.
todos:
  - id: docker-compose
    content: Create Docker Compose configurations (`docker-compose.main.yml` and `docker-compose.worker.yml`) incorporating the Hybrid Adapter pattern and respective microservices.
    status: completed
  - id: microservices
    content: Develop dedicated auto-scaling microservices (`bmad-validator`, `gsd-dependency`, `contract-checker`) for AST analysis, GSD sorting, and PRD validation.
    status: completed
  - id: n8n-nodes
    content: Build custom n8n nodes (Option A) to act as orchestration clients interfacing with the dedicated microservices.
    status: completed
  - id: gate-1-bmad
    content: 'Implement Gate 1: BMAD PRD completeness validation logic logging to `Build.errorLogs`.'
    status: completed
  - id: gate-2-gsd
    content: 'Implement Gate 2: GSD topological sorting logic logging to `Build.executionIds`.'
    status: completed
  - id: gate-3-contract
    content: 'Implement Gate 3: Contract Checker logic performing AST analysis and triggering the Supabase 3-failure escalation mechanism.'
    status: completed
  - id: env-templates
    content: Create `.env.example` templates with shared encryption keys and Redis auto-reconnection parameters for the Studios.
    status: completed
isProject: false
---

# n8n High-Availability Orchestrator with Hybrid Adapter Pattern

## Overview

Deploy n8n in High-Availability mode using a Hybrid Adapter pattern: Custom n8n nodes (Option A) act as orchestration clients for dedicated, auto-scaling microservices (Option B). n8n manages workflow state and agent tool-calling, while microservices handle compute-intensive AST analysis, global dependency graph construction, and cross-service contract validation.

## Architecture Details

**Hybrid Adapter Pattern:**

- **Custom n8n Nodes (Option A):** Act as lightweight orchestration clients within n8n workflows. They handle state management, tool-calling routing, and queue execution logic.
- **Dedicated Microservices (Option B):** Auto-scaling, compute-optimized services that perform heavy lifting:
  - `bmad-validator-service`: Validates PRD completeness, architecture, and feasibility.
  - `gsd-dependency-service`: Constructs the global dependency graph and handles topological sorting.
  - `contract-checker-service`: Performs AST-level analysis and cross-service contract validation.

**Studio 1 (M4 Max) - Control Plane:**

- `n8n-main`: Handles webhooks, UI, and orchestrates the swarm.
- `redis`: Persistent job queue with auto-reconnection logic.
- `postgres`: Local database for n8n execution metadata.
- Auto-scaling microservices (`bmad-validator-service`, `gsd-dependency-service`).

**Studio 2 & 3 (M2 Ultra) - Execution Plane:**

- `n8n-worker`: 50 total workers (25 per Studio) pulling from Redis.
- `contract-checker-service`: Microservice performing local AST analysis and cross-service interface validation.
- Docker socket (`/var/run/docker.sock`) mounted for worker agents to build containers.

## Supabase Schema Adaptation

To log all validation gate decisions and execution states without altering the existing schema, we will map audit trails directly to the `Build` and `Commission` models in `packages/db/prisma/schema.prisma`:

- **Execution State:** Use `Build.executionIds` (JSON array) to track the swarm execution IDs across different worker nodes.
- **Studio Assignment:** Use `Build.studioAssignment` to track which execution plane (e.g., Studio 2/3) handled the primary build tasks.
- **Gate Failures & Audit:** Log validation rejections (BMAD completeness failures, Contract Checker violations) directly to the `Build.errorLogs` (JSON) field.
- **Status Escalation:** Failed validation gates will update `Build.status` to `FAILED` and increment `Build.failureCount`. As configured by existing triggers, 3 failures automatically flag `Build.humanReview = true` and update the parent `Commission.status` to `ESCALATED`.

## Validation Gates & Workflows

1. **Gate 1: BMAD Validator (Pre-flight)**

- **Trigger:** Webhook receives PRD.
- **Action:** Custom n8n Node (Option A) calls `bmad-validator-service` (Option B).
- **Validation:** Checks for `tech_stack`, `api_contracts`, `data_boundaries`, and `feasibility_score`.
- **Result:** If fail, routes back to "Mo" agent with missing fields and appends to `Build.errorLogs`.

2. **Gate 2: GSD Dependency Checker (Planning)**

- **Trigger:** Decomposer agent generates a swarm plan.
- **Action:** Custom n8n Node calls `gsd-dependency-service`.
- **Validation:** Performs topological sort to ensure blocking dependencies (e.g., Database before Frontend) are queued sequentially in n8n Queue Mode, while safe tasks run in parallel.
- **Result:** Outputs sorted queue payload. Logs execution structure to `Build.executionIds`.

3. **Gate 3: Contract Checker (Execution)**

- **Trigger:** Coding agents complete their tasks.
- **Action:** Custom n8n Node calls `contract-checker-service` on the worker node.
- **Validation:** Performs AST analysis to verify interface compatibility against the architecture ADRs.
- **Result:** Approves for merge or rejects back to coding agent. Logs violations to `Build.errorLogs` and increments `failureCount`.

## Configuration & Resiliency

- Shared `N8N_ENCRYPTION_KEY` across all Studio nodes.
- Environment templates mapped for main and worker nodes.
- Auto-reconnection for Redis explicitly configured to handle intermittent drops between Studios.
