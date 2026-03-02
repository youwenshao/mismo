# Business Associate Agreement (BAA)

_For commissions involving Protected Health Information (PHI)_

**IMPORTANT**: This template must be reviewed by legal counsel before use. Mismo Agency is not a covered entity under HIPAA but may act as a Business Associate when building software that handles PHI.

## 1. Parties

- **Covered Entity**: [Client Name]
- **Business Associate**: Mismo Agency

## 2. Purpose

This BAA governs the use and disclosure of Protected Health Information (PHI) in connection with software development services provided by the Business Associate.

## 3. Obligations of Business Associate

The Business Associate agrees to:

a) Not use or disclose PHI other than as permitted by this Agreement
b) Use appropriate safeguards to prevent unauthorized use or disclosure of PHI
c) Report any unauthorized use or disclosure to the Covered Entity
d) Ensure that any subcontractors agree to the same restrictions
e) Make PHI available to individuals as required by HIPAA
f) Make its practices and records available to HHS for compliance assessment
g) Return or destroy all PHI upon termination

## 4. Technical Safeguards

When handling PHI, Mismo Agency additionally implements:
- PHI stored only in encrypted columns (pgsodium AEAD)
- PHI not included in build logs, error logs, or monitoring data
- PHI not transmitted outside Tailscale mesh network
- Access to PHI-containing databases restricted to authorized personnel only
- Commission flagged as healthcare via safety classifier (YELLOW/RED tier)

## 5. Breach Notification

The Business Associate shall notify the Covered Entity within 60 days of discovering a breach of unsecured PHI, including:
- Nature of the breach
- Types of PHI involved
- Steps taken to mitigate harm
- Steps to prevent future breaches

## 6. Term

This BAA is effective for the duration of the commission and any maintenance period. PHI is destroyed within 30 days of termination.

---

**Covered Entity**: _______________________ Date: ___________

**Business Associate (Mismo Agency)**: _______________________ Date: ___________
