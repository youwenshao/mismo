# SOC 2 Type II Controls Documentation

_Mismo Agency - Security, Availability, and Confidentiality Trust Service Criteria_

## CC1: Control Environment

### CC1.1 - Organizational Commitment to Integrity and Ethics
- Code of conduct documented for all team members
- Automated code review with secret scanning prevents credential exposure
- BMAD methodology enforces structured decision-making with audit trails

### CC1.2 - Board/Management Oversight
- Mission Control dashboard provides real-time visibility into operations
- Financial telemetry tracks costs, revenue, and margins
- Alert system with P0/P1/P2 escalation ensures issues reach management

## CC2: Communication and Information

### CC2.1 - Internal Communication
- Slack integration for real-time alerts (P1)
- Email notifications for status updates
- SMS/phone escalation for critical alerts (P0)
- Mission Control dashboard for operational overview

### CC2.2 - External Communication
- Client-facing status updates via notification system
- Delivery packages include ADR documents, how-to guides, API docs

## CC3: Risk Assessment

### CC3.1 - Risk Identification
- BMAD feasibility scoring (0-100) for every commission
- Safety classification (GREEN/YELLOW/RED) during discovery
- Automated dependency vulnerability scanning (npm audit, Trivy)

### CC3.2 - Fraud Risk Assessment
- Admin access restricted to whitelisted email hashes (SHA-256)
- Service-role keys separated from client-facing credentials
- Rate limiting on all API endpoints (100 req/min default)

## CC5: Control Activities

### CC5.1 - Logical Access Controls
| Control | Implementation |
|---------|---------------|
| Network segmentation | Tailscale ACLs (admin vs studio tags) |
| Zero-trust networking | Studios cannot communicate with each other |
| SSH hardening | Key-only auth, password disabled, MaxAuthTries=3 |
| Database isolation | Row Level Security on all tables |
| API authentication | Supabase Auth (JWT), middleware-enforced |
| Admin authorization | SHA-256 email hash whitelist |
| Rate limiting | 100 req/min per IP, 429 responses |

### CC5.2 - Infrastructure Security
| Control | Implementation |
|---------|---------------|
| Firewall | macOS pf with IP-whitelisted egress |
| Container isolation | Non-root Docker users, no Docker socket mounts |
| Encryption at rest | pgsodium for credentials, encrypted disk volumes |
| Encryption in transit | Tailscale (WireGuard), TLS 1.3 |
| Secret management | No secrets in code, pre-commit gitleaks scanning |

### CC5.3 - Change Management
| Control | Implementation |
|---------|---------------|
| Version control | Git, GitHub with branch protection |
| CI/CD pipeline | Lint, type-check, build, security audit, Trivy scan |
| Code review | Automated secret scanning, BMAD contract validation |
| Pre-commit hooks | Gitleaks secret scan, lint-staged formatting |

## CC6: System Operations

### CC6.1 - Vulnerability Management
- `pnpm audit` in CI pipeline (blocks on HIGH/CRITICAL)
- Trivy container image scanning (blocks on HIGH/CRITICAL)
- Gitleaks secret scanning (blocks on any detection)
- OWASP ZAP DAST scanning (weekly scheduled)

### CC6.2 - Incident Detection and Response
| Priority | Detection | Response | Notification |
|----------|-----------|----------|-------------|
| P0 (Critical) | Farm monitor, build failures | Auto-recovery, IP banning | SMS + Phone (Twilio) |
| P1 (High) | Security scanner, API health | Alert + manual review | Slack + Email |
| P2 (Medium) | Performance metrics, cost overruns | Dashboard display | Dashboard only |

### CC6.3 - Recovery
- Build failure auto-recovery with retry logic
- API failover (Kimi -> DeepSeek)
- Circuit breaker pattern for external service failures

## CC7: Monitoring

### CC7.1 - System Monitoring
- Farm monitor: CPU, RAM, disk, network, queue depth (real-time)
- StudioMetrics: Supabase Realtime broadcast
- API health checks: Kimi, GitHub, Supabase
- Build pipeline: Status tracking, token usage

### CC7.2 - Audit Logging
- AuditLog table: userId, action, resource, resourceId, metadata
- Commission status changes logged
- GDPR requests logged
- Retention: 1 year

## CC8: Data Retention and Disposal

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Build logs | 90 days | Automated deletion |
| Audit logs | 1 year | Automated deletion |
| Client credentials | 30 days post-delivery | Automated deletion |
| Studio metrics | 30 days | Automated deletion |
| Resolved alerts | 90 days | Automated deletion |
| User PII | Until account deletion | Cascading delete + anonymization |

## A1: Availability

### A1.1 - Infrastructure Availability
- 3-node Mac Studio cluster (1 control plane, 2 workers)
- n8n HA mode with Redis queue and 25-concurrency workers
- Auto-reconnection with 30s timeout for transient network drops
- Docker restart policies (always)

## C1: Confidentiality

### C1.1 - Confidential Information Protection
- Client data isolated via RLS (Row Level Security)
- Client credentials encrypted with pgsodium (AEAD)
- Studios cannot access each other's data (network + RLS isolation)
- Generated code scanned for secrets before delivery
- .env files blocked from delivery packages
