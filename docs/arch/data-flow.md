# Architecture: Data Flow

This document outlines the end-to-end data flow for a project build in the Mismo system.

---

## 🏗️ Project Lifecycle: Data Journey

From initial PRD discovery to final GitHub delivery, data flows through the following stages:

```mermaid
graph TD
    subgraph web [Mismo Web UI (apps/web)]
        UI["Commission Dashboard"]
        API["Next.js API Routes"]
    end

    subgraph db [Supabase / Prisma]
        CommissionTable["Commission Table"]
        BuildTable["Build Table"]
        TokenUsageTable["TokenUsage Table"]
        BuildLogTable["BuildLog Table"]
    end

    subgraph n8n [n8n Orchestration (Control Plane)]
        MainWH["n8n Webhook Trigger"]
        GsdPipeline["GSD Build Pipeline"]
        RetryWrapper["GsdRetryWrapper"]
    end

    subgraph studios [Studio Execution Plane]
        WorkerNode["n8n Worker Node"]
        Microservices["Agent Microservices"]
        GitHub["GitHub Repo Delivery"]
    end

    UI --> API --> CommissionTable
    CommissionTable -->|"status = CONTRACTED"| MainWH
    MainWH --> GsdPipeline
    GsdPipeline --> RetryWrapper --> WorkerNode
    WorkerNode --> Microservices
    Microservices -->|"Update status"| BuildTable
    Microservices -->|"Log output"| BuildLogTable
    Microservices -->|"Record tokens"| TokenUsageTable
    WorkerNode -->|"Build complete"| GitHub
    GitHub -->|"Repo URL"| BuildTable
```

---

## ⚡ Stage 1: Commission Initialization

When a client initiates a build, the `Commission` and `PRD` records are created in Supabase. The platform fee is processed via Stripe, and the `Commission.status` becomes `CONTRACTED`.

---

## ⚡ Stage 2: n8n Orchestration

A Postgres trigger fires on `Commission` status changes, sending a webhook to **n8n-main** on the Control Plane.

1.  **GSD Build Pipeline** starts and initializes a new `Build` record.
2.  **BmadValidator** validates the PRD and requirements.
3.  **GsdDependencyChecker** performs a topological sort and queues build tasks in **Redis/BullMQ**.

---

## ⚡ Stage 3: Studio Execution

**n8n-worker** nodes pull tasks from the Redis queue. Each task is handled by a custom n8n node that calls its corresponding microservice:

- **DbArchitectAgent**: Designs the database schema.
- **BackendEngineerAgent**: Generates backend code.
- **FrontendDeveloperAgent**: Builds the frontend UI.
- **DevOpsAgent**: Configures deployment and Docker.

As agents work, they stream output to `BuildLog` and update their progress in the `Build` table.

---

## ⚡ Stage 4: Validation & Delivery

Once all tasks are complete:

1.  **ContractChecker** verifies the build artifact against the PRD.
2.  **RepoCreator** pushes the code to GitHub.
3.  **DocGenerator** generates documentation and walkthrough videos.
4.  **DeliveryTransferAgent** invites the client as a collaborator.

---

## ⚡ Stage 5: Finalization

The `Commission.status` becomes `COMPLETED`, and a `FEEDBACK_REQUEST` notification is sent via **Resend** to the client.
