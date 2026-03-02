# Architecture Documentation

This section provides a detailed overview of the Mismo system's architecture, including its network topology, data flows, and agent swarm interactions.

## Key Concepts

- **Control Plane** — Studio 1; manages orchestration, metadata, and core API services.
- **Execution Plane** — Studios 2-5; handles compute-intensive build tasks and agent swarm execution.
- **Tailscale Mesh** — Secure, zero-trust network overlay connecting all system components.
- **n8n Orchestration** — High-availability workflow engine driving the agentic build pipeline.

## Documents

- [Network Topology](./network-topology.md) — How nodes are interconnected and secured.
- [Data Flow](./data-flow.md) — The lifecycle of a commission from UI to delivery.
- [Agent Swarm Interaction](./agent-swarm-interaction.md) — How custom n8n nodes communicate with microservices.
