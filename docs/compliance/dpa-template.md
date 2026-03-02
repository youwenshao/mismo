# Data Processing Agreement (DPA)

_Template for Mismo Agency client engagements_

## 1. Parties

- **Data Controller**: [Client Name] ("Client")
- **Data Processor**: Mismo Agency ("Processor")

## 2. Subject Matter and Duration

The Processor shall process personal data on behalf of the Controller for the duration of the software development commission and any agreed maintenance period, as defined in the associated Commission agreement.

## 3. Nature and Purpose of Processing

Processing is performed to:
- Build, test, and deploy software applications as commissioned by the Controller
- Provide ongoing maintenance and support services if contracted
- Generate analytics and reports on application performance

## 4. Types of Personal Data

Data categories depend on the commissioned application and may include:
- Contact information (name, email, phone)
- Account credentials (hashed/encrypted)
- Usage analytics and behavioral data
- Payment information (processed via Stripe, not stored by Processor)
- Any application-specific data defined in the PRD

## 5. Categories of Data Subjects

- End users of the commissioned application
- Client's employees and contractors
- Client's customers

## 6. Obligations of the Processor

The Processor shall:

a) Process personal data only on documented instructions from the Controller
b) Ensure that persons authorized to process personal data have committed to confidentiality
c) Take all measures required pursuant to Article 32 of the GDPR (security of processing)
d) Not engage another processor without prior written authorization of the Controller
e) Assist the Controller in responding to data subject requests
f) Delete or return all personal data upon termination of services
g) Make available all information necessary to demonstrate compliance

## 7. Security Measures

The Processor implements:
- **Encryption at rest**: pgsodium (database), encrypted volumes (studio disks)
- **Encryption in transit**: Tailscale mesh VPN (WireGuard), TLS 1.3
- **Access control**: Tailscale ACLs, SSH key-only authentication, Row Level Security
- **Secret management**: No secrets in code, pgsodium for client credentials, automated secret scanning
- **Monitoring**: 24/7 farm monitoring, automated security alerts, SSH intrusion detection
- **Data retention**: Automated cleanup (build logs 90d, credentials 30d post-delivery, audit logs 1yr)
- **Incident response**: Automated IP banning, P0/P1/P2 alert escalation, Slack/email/SMS notification

## 8. Sub-processors

| Sub-processor | Purpose | Location |
|--------------|---------|----------|
| Supabase | Database, authentication, realtime | US/EU (configurable) |
| Stripe | Payment processing | US |
| GitHub | Source code hosting | US |
| Vercel/Railway/Render | Application hosting (if selected) | US/EU (configurable) |

## 9. Data Transfers

If personal data is transferred outside the EEA, the Processor shall ensure appropriate safeguards under Chapter V of the GDPR, including Standard Contractual Clauses where applicable.

## 10. Data Breach Notification

The Processor shall notify the Controller without undue delay (and within 72 hours) after becoming aware of a personal data breach.

## 11. Data Subject Rights

The Processor shall assist the Controller in fulfilling requests from data subjects exercising their rights under Articles 15-22 of the GDPR, including:
- Right of access (data export endpoint)
- Right to erasure (data deletion endpoint with cascading cleanup)
- Right to data portability (JSON export format)

## 12. Audits

The Controller may audit the Processor's compliance with this DPA, with reasonable notice and during business hours.

## 13. Term and Termination

This DPA shall remain in effect for the duration of the commission. Upon termination:
- Client credentials are deleted within 30 days
- Build logs are retained for 90 days then deleted
- Audit logs are retained for 1 year then deleted
- All personal data is purged upon written request

---

**Data Controller**: _______________________ Date: ___________

**Data Processor (Mismo Agency)**: _______________________ Date: ___________
