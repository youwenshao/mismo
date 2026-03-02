---
name: n8n-pipeline-architecture
overview: Build an end-to-end pipeline for generating, securely managing credentials, testing in a sandboxed Docker environment, and deploying n8n workflows from PRD specifications.
todos:
  - id: workflow-generator
    content: Create Workflow Generator Agent using Vercel AI SDK in `packages/ai/src/n8n/generator.ts`
    status: completed
  - id: credential-manager
    content: Build Secure Credential Form in `apps/web` and configure Supabase `pgsodium` encryption
    status: completed
  - id: testing-sandbox
    content: Develop the Studio 3 Docker Sandbox API over Tailscale for isolated testing and trace capture
    status: completed
  - id: deployment-options
    content: Implement the Deployment utility for Options A, B, and C with Webhook error monitoring
    status: completed
  - id: deliverables
    content: Generate Git repo deliverables including `.env.example` and `README.md` documentation
    status: completed
isProject: false
---

# n8n Workflow Generation & Deployment Pipeline

**Goal:** Automate the creation, secure testing, and deployment of n8n workflows generated from PRD specifications, with flexible hosting options for clients.

**Architecture & Implementation Strategy:**

1. **Workflow Generator Agent (`packages/ai/src/n8n/`)**
  - **Implementation**: Create a specialized AI agent (`WorkflowGenerator`) using the Vercel AI SDK that takes PRD JSON as input.
  - **Output**: Generates a valid n8n workflow JSON, including supported integration nodes (Slack, Notion, Google Sheets, etc.) and explicit mock data payloads for testing.
  - **Integration**: Expose an API endpoint (`apps/internal/src/app/api/n8n/generate/route.ts`) to trigger generation on-demand or when a commission moves to the `IN_PROGRESS` stage.
2. **Credential Manager (`apps/web` & `packages/db`)**
  - **Client UI**: Build a secure form component in the Next.js client portal (`apps/web`) where clients input their API keys.
  - **Security**: Keys will be encrypted at the database level using Supabase `pgsodium` and stored in the existing `Credential` table. 
  - **Strict Policy**: Plaintext credentials will *never* be written to the generated Git repo; instead, an `.env.example` template will be generated alongside the workflow files.
3. **Testing Sandbox (Studio 3 Orchestration)**
  - **Orchestration Service**: Build a lightweight internal Sandbox API (`apps/internal/api/sandbox/route.ts`) designed to run on Studio 3 over the Tailscale network.
  - **Docker Management**: The API will receive the workflow JSON, dynamically construct a `docker-compose.yml`, and spin up a temporary, isolated n8n Docker instance.
  - **Validation**: It will inject the mock data, trigger the workflow via n8n's REST API, capture the execution trace (validating node outputs and checking for infinite loops), and finally tear down the container.
4. **Deployment & Deliverables (`packages/ai/src/n8n/deploy.ts`)**
  - Implement a deployer class that supports three distinct modes:
    - **Option A (Self-hosted)**: Commits the workflow JSON and a generated `"How to modify this automation"` `README.md` to the client's Git repo.
    - **Option B (Managed)**: Pushes the workflow directly to the Mismo managed n8n HA cluster via its API, securely injecting decrypted credentials at runtime.
    - **Option C (Standalone)**: Packages the workflow into a standalone Node.js repository utilizing the `n8n-core` library.
  - **Monitoring**: Inject an Error Trigger Node into all generated production workflows, configured to ping a Mismo webhook alert endpoint if an execution fails.

**Tech Stack:** Vercel AI SDK, Supabase (pgsodium), Docker & Tailscale for orchestration, n8n REST APIs.