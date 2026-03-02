# FAQ: Common Questions about Mismo

This document provides answers to the most frequently asked questions about the Mismo platform.

---

## 🛠️ General Questions

### 1. What is Mismo?
Mismo is a high-availability, agent-driven platform for building and delivering full-stack software applications. We use a "swarm" of AI agents, orchestrated by n8n, to handle everything from PRD discovery to GitHub delivery.

### 2. How long does a project take?
A typical project takes between 5-10 days, depending on the complexity of the requirements and the number of screens/features.

### 3. What technology stack do you use?
Mismo specializes in modern, scalable stacks, primarily including:
- **Frontend**: Next.js, React, Tailwind CSS.
- **Backend**: Node.js, TypeScript, PostgreSQL (via Supabase).
- **Infrastructure**: Docker, Tailscale, GitHub Actions.

### 4. Do I own the code?
Yes, you own 100% of the code and intellectual property (IP) once the project is transferred to your GitHub repository.

---

## 🛡️ Security & Privacy

### 5. How secure is my data?
Mismo implements zero-trust security using **Tailscale** and strict **pf firewall** rules on all build nodes. Your code and data are isolated from the public internet during the build process.

### 6. Are my secrets (API keys, etc.) safe?
We use **pgsodium** and **Supabase Vault** to encrypt and manage credentials. Our delivery pipeline includes a mandatory secret scan to ensure no keys are leaked in the final repository.

---

## 🚀 The Build Process

### 7. How can I track my project's progress?
You'll receive automated email and Slack updates at each major milestone (e.g., "Database schema designed", "Backend 50% complete"). You can also view the real-time `BuildLog` in your Mismo dashboard.

### 8. Can I change my requirements during the build?
Minor changes can often be accommodated during the development phase. Major changes may require a new commission and discovery phase.

### 9. What happens if a build fails?
Our `farm-monitor` service automatically detects and heals most failures. If a build fails repeatedly, it is escalated for manual review by our engineers.

---

## 📦 Delivery & Support

### 10. How is the project delivered?
The project is pushed to a private GitHub repository under our agency organization. We then invite you as an admin and transfer ownership to your account.

### 11. Do you provide hosting?
We don't provide hosting ourselves, but we assist with the deployment and transfer to your preferred provider (Vercel, AWS, GCP, etc.).

### 12. What kind of documentation do I receive?
You receive a comprehensive package including an Architecture Decision Record (ADR), API & Data Contracts, an Operational Runbook, and an automated walkthrough video.

---

## 💰 Billing & Refunds

### 13. How much does Mismo cost?
Pricing depends on the service tier (Vibe, Verified, or Foundry) and the complexity of the project. You'll receive a detailed quote after the discovery phase.

### 14. What is your refund policy?
We offer partial refunds based on project progress if you choose to cancel. Refer to our [Billing & Refunds](../ops/runbooks/billing-and-refunds.md) runbook for more details.

---

## 🔧 Maintenance & Support

### 15. Do you offer ongoing maintenance?
Yes, we offer an optional monthly maintenance plan that includes automated dependency updates and security patches.

### 16. How do I report a bug?
You can report bugs through our dashboard during the build or via GitHub Issues after the project is delivered.

### 17. Can I hire Mismo for future feature development?
Yes, you can initiate a `Repo Surgery` commission to add new features or modify existing codebases.

---

## 🤖 AI & Agents

### 18. What LLMs do you use?
Our agents primarily use **Moonshot AI (Kimi)** and **DeepSeek**, selected for their high performance in code generation and reasoning tasks.

### 19. How do you ensure agent quality?
We use a "Human-in-the-loop" model where our engineers review agent output at key stages of the build. Our `BmadValidator` and `ContractChecker` also provide automated quality gates.

### 20. Can the agents build mobile apps?
Yes, Mismo supports mobile build pipelines for React Native and Flutter, including store submission automation.
