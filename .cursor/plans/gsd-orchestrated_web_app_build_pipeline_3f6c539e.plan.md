---
name: GSD-Orchestrated Web App Build Pipeline
overview: Implement a Swarm Orchestration system using n8n workflows that implements BMAD contracts and GSD patterns for agent orchestration.
todos:
  - id: task_1_1
    content: Enhance GsdDependencyChecker for real topological sorting
    status: completed
  - id: task_1_2
    content: Implement GSD retry/circuit breaker logic in n8n nodes
    status: completed
  - id: task_2_1
    content: Implement DB Architect Agent microservice
    status: completed
  - id: task_2_2
    content: Implement Backend Engineer Agent microservice
    status: completed
  - id: task_2_3
    content: Implement Frontend Developer Agent microservice
    status: completed
  - id: task_2_4
    content: Implement DevOps Agent microservice
    status: completed
  - id: task_3_1
    content: Update API Contract Validator logic
    status: completed
  - id: task_3_2
    content: Implement Type Safety Validator logic
    status: completed
  - id: task_4_1
    content: Assemble master n8n workflow JSON
    status: completed
  - id: task_5_1
    content: Implement centralized Supabase error logging
    status: completed
isProject: false
---

# GSD-Orchestrated Web App Build Pipeline Implementation Plan

**Goal:** Implement a scalable, GSD-style swarm orchestration system using n8n that coordinates multiple specialized agents (Database Architect, Backend Engineer, Frontend Developer, DevOps) with strict BMAD contract enforcement between them.

**Architecture:** We will leverage the existing n8n node ecosystem (`packages/n8n-nodes`) combined with external validator microservices (`packages/gsd-dependency`, `packages/bmad-validator`, `packages/contract-checker`). The n8n workflow will act as the Coordinator Node, managing the DAG of tasks, retries, and circuit breakers. Each Agent will be implemented as a separate microservice (or extending existing ones) that n8n can call via HTTP.

**Tech Stack:** n8n, TypeScript, Express, Zod (for contracts), Redis (optional/internal to n8n for queueing if needed), Supabase (for logging).

---

### Phase 1: Enhance n8n Nodes for GSD Orchestration

The existing n8n nodes are a good start but need enhancements to fully support the GSD Retry/Circuit Breaker pattern.

**Task 1.1: Enhance GsdDependencyChecker Node**

- Modify `GsdDependencyChecker.node.ts` to fully parse a BMAD-compliant PRD and construct the dependency graph.
- Update the external service `packages/gsd-dependency/src/index.ts` to implement actual topological sorting based on PRD dependencies rather than dummy sorting.

**Task 1.2: Implement GSD Retry & Circuit Breaker Pattern in n8n**

- Since n8n handles workflows, we will create a standard sub-workflow (or node configuration) that encapsulates the GSD retry pattern:
  - 3 attempts with exponential backoff.
  - Logging failures to Supabase.
  - Circuit break (halt) on the 4th failure.

### Phase 2: Agent Implementations (Microservices)

Create or stub out the individual Agent microservices that the n8n workflow will call.

**Task 2.1: Database Architect Agent**

- Create a new package or endpoint for the DB Architect.
- **Input:** `PRD.architecture.contracts.data`
- **Output:** SQL schema + Zod schemas.
- **Contract:** Validate output matches `data_boundaries`.

**Task 2.2: Backend Engineer Agent**

- **Input:** Database schema + `PRD.architecture.contracts.api`
- **Output:** Next.js API routes (stubbed for now or generating files).
- **Constraint:** Must match API contracts.

**Task 2.3: Frontend Developer Agent**

- **Input:** Design DNA + Content JSON + Backend types.
- **Constraint:** Must use Zod schemas from DB agent (checked by Type Safety Validator).

**Task 2.4: DevOps Agent**

- **Input:** `PRD.architecture.hosting`
- **Output:** Terraform/Vercel config.

### Phase 3: Contract Checking Nodes Enhancement

Enhance the existing contract checkers to implement the specific BMAD validations requested.

**Task 3.1: API Contract Validator**

- Update `packages/contract-checker/src/index.ts` to specifically compare the Backend Agent's output against `PRD.architecture.contracts.api` (path, method, status codes).

**Task 3.2: Type Safety Validator**

- Implement a check to ensure Frontend output uses the correct Zod schemas and rejects any `any` types.

### Phase 4: n8n Workflow Assembly

**Task 4.1: Create the Master n8n Workflow JSON**

- Create the JSON representation of the n8n workflow that links these nodes:
  1. Webhook trigger (receives PRD).
  2. BMAD Validator Node.
  3. GSD Dependency Checker.
  4. Parallel execution branches:
    - DB Architect -> API Validator -> Backend Engineer -> Type Safety Validator -> Frontend.
    - DevOps (runs concurrently).
  5. Final Playwright/Acceptance Criteria validation node.
  6. Final Deployment or Failure loop.

### Phase 5: Error Handling & Logging

**Task 5.1: Supabase Logging Integration**

- Ensure all agent microservices and n8n nodes log task failures with context to Supabase, enabling the circuit breaker pattern.

