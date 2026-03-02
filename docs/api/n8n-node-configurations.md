# API: n8n Node Configurations

This document lists the custom n8n nodes provided by the `n8n-nodes-mismo` package and their corresponding configurations.

---

## 🏗️ Overview

Custom nodes are implemented in `packages/n8n-nodes/nodes/` and act as **Hybrid Adapters** for the Mismo microservices.

### Installation

1.  Navigate to `packages/n8n-nodes/`.
2.  Run `pnpm build`.
3.  Restart n8n to load the new nodes.

---

## 🛠️ List of Custom Nodes

### 1. `BmadValidator`
- **Purpose**: Validates the project requirements against BMAD (Business-Model-Agent-Data) standards.
- **Input**: `prdJson`, `buildId`.
- **Output**: `validationScore`, `ambiguityReport`.

### 2. `GsdDependencyChecker`
- **Purpose**: Performs a topological sort of build tasks based on architectural dependencies.
- **Input**: `workspaceDir`, `archTemplate`.
- **Output**: `sortedTasks`.

### 3. `ContractChecker`
- **Purpose**: Verifies the build artifact against its defined API and data contracts.
- **Input**: `buildId`, `workspaceDir`.
- **Output**: `checkPassed`, `diffReport`.

### 4. `GsdRetryWrapper`
- **Purpose**: Provides exponential backoff and error logging for agentic nodes.
- **Input**: `maxRetries`, `backoffFactor`, `nodeToWrap`.
- **Output**: Same as the wrapped node.

---

## 🤖 Agent Nodes

These nodes represent the specialized agents in the swarm.

| Node | n8n Name | Description |
|------|----------|-------------|
| **DbArchitectAgent** | `n8n-nodes-mismo.dbArchitectAgent` | Designs the database schema. |
| **BackendEngineerAgent** | `n8n-nodes-mismo.backendEngineerAgent` | Generates backend code. |
| **FrontendDeveloperAgent** | `n8n-nodes-mismo.frontendDeveloperAgent` | Builds the frontend UI. |
| **DevOpsAgent** | `n8n-nodes-mismo.devOpsAgent` | Configures deployment and Docker. |
| **QAAgent** | `n8n-nodes-mismo.qaAgent` | Runs automated tests. |

---

## 📦 Delivery & Maintenance Nodes

Used for the final stages of the project lifecycle.

| Node | n8n Name | Description |
|------|----------|-------------|
| **PreTransferValidator** | `n8n-nodes-mismo.preTransferValidator` | Runs validation gates (secret, BMAD, contract). |
| **RepoCreator** | `n8n-nodes-mismo.repoCreator` | Creates repo under agency org, pushes code. |
| **DocGenerator** | `n8n-nodes-mismo.docGenerator` | Generates handoff documents and walkthrough videos. |
| **DeliveryTransferAgent** | `n8n-nodes-mismo.deliveryTransferAgent` | Invites client, polls acceptance, transfers ownership. |
| **PostTransferVerifier** | `n8n-nodes-mismo.postTransferVerifier` | Verifies admin access and env contract. |
| **MaintenanceChecker** | `n8n-nodes-mismo.maintenanceChecker` | Checks dependencies and security vulnerabilities. |

---

## ⚙️ Shared Node Parameters

All custom nodes typically require the following parameters:

- **`buildId`**: The ID of the current build for state tracking.
- **`workspaceDir`**: The absolute path to the build directory on the worker node.
- **`agentUrl`**: The URL of the underlying microservice (e.g., `${GS_DEPENDENCY_URL}`).
- **`supabaseUrl` / `supabaseKey`**: For updating logs and status in real-time.
