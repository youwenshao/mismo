# Mismo System Documentation

Welcome to the comprehensive documentation for the Mismo platform. This repository contains operational guides, architecture diagrams, API specifications, and client-facing information.

## Sections

### 🛠️ [Operations](./ops/README.md)
Runbooks for system startup, maintenance, and troubleshooting.
- [System Startup](./ops/runbooks/system-startup.md)
- [Build Failure Debugging](./ops/runbooks/build-failure-debugging.md)
- [Billing & Refunds](./ops/runbooks/billing-and-refunds.md)
- [Maintenance & Initial Setup](./ops/maintenance-and-setup.md)

### 🏗️ [Architecture](./arch/README.md)
Detailed diagrams and explanations of the system design.
- [Network Topology](./arch/network-topology.md)
- [Data Flow](./arch/data-flow.md)
- [Agent Swarm Interaction](./arch/agent-swarm-interaction.md)

### 🔌 [API & Schema](./api/README.md)
Technical specifications for internal and external interfaces.
- [Webhook Specifications](./api/webhook-specifications.md)
- [n8n Node Configurations](./api/n8n-node-configurations.md)
- [Supabase Schema Overview](./api/supabase-schema-overview.md)

### 🤝 [Client-Facing](./client/README.md)
Guides and FAQs for Mismo clients.
- [What to Expect](./client/what-to-expect.md)
- [Feedback & Bug Reporting](./client/feedback-and-bug-reporting.md)
- [FAQ](./client/faq.md)

---

## Technical Overview
Mismo is a high-availability agentic build system orchestrated by **n8n** and distributed across a **Tailscale** mesh of Mac Studios. It automates the full lifecycle of software development from PRD to GitHub delivery.
