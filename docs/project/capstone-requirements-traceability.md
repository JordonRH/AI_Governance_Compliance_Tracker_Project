# Capstone requirements traceability

Source baseline: `docs/source-materials/ai-governance-compliance-tracker-capstone.docx`
Reviewed: 25 September 2026

This matrix treats the capstone document as the product requirements baseline. The separate project plan controls delivery tracking where it does not conflict with the capstone. Conflicts remain visible until the sponsor changes the baseline.

| Requirement | Tickets | Current evidence | Status | Required next evidence |
| --- | --- | --- | --- | --- |
| SME-focused plain-language product | #1, #5, #6, #12, #32 | SME interface, registry, disclosure and guidance | Partial | Validate the complete workflow with representative SME users |
| Administrator, Compliance Officer and Staff User access | #7, #8, #11 | Organisation accounts, Administrator registration, password resets, role/status controls, revocation audit, scrypt passwords, opaque sessions and API permissions | Partial | Automated recovery, permission review and production TLS |
| Governance questionnaire mapped to recognised frameworks | #4, #9, #14 | Candidate framework map and lifecycle design | Partial | Approved questions, definitions, persistence, API and UI |
| AI registry with purpose, data sensitivity and approval status | #7, #12 | Organisation-scoped registry with business area, sensitivity, approval, source and creator | Partial | Approval history and assessment integration |
| Transparent rules-based risk classification | #9, #15 | Tested versioned scoring engine with synthetic rules | Partial | Approved labels/rules and persisted assessment integration |
| Policy repository linked to checklist items | #16 | File-policy validation and digest descriptor | Partial | Authorised storage, metadata, retrieval and interface |
| Compliance action tracking | #17 | Tested aggregate, due dates, owner, statuses and history | Partial | Persistence, permissions, API and interface |
| Automated reminders | #18 | Authenticated planning API uses persisted open actions and approved timing input | Partial | Scheduler, recipients, delivery adapter and delivery history |
| Management/audit PDF and CSV reports | #22 | Organisation-scoped authorised CSV and paginated PDF exports | Partial | Approved final fields, PDF visual review and complete assessment/action content |
| Administrator compliance dashboard | #19, #24 | Authenticated overview plus persisted action-aware scoped dashboard API | Partial | Assessment risk data and refined management interface |
| Shadow AI staff self-reporting | #23 | Authenticated disclosure creates a Not reviewed registry record | Partial | Compliance triage workflow and explicit conversion history |
| HTTPS/TLS, secure passwords and RBAC | #11, #28 | Loopback safeguards and security design | Partial | Password hashing, sessions, RBAC tests and deployment TLS guidance |
| Australian privacy and fictional development data | #1, #16, #28 | Fictional fixtures and explicit no-real-data guidance | Partial | Retention/access decisions and privacy review evidence |
| Responsive plain-language desktop/tablet UX | #5, #6, #25 | Responsive UI and Playwright coverage | Partial | SME terminology review and complete-workflow accessibility review |
| Stable assessment and tracking functions | #14-#19, #26, #29 | Pure domain tests and registry integration tests | Partial | Persisted end-to-end workflow and regression suite |
| Multi-organisation data separation | #7, #11, #19, #28 | Organisation keys, scoped queries and horizontal-access API tests | Partial | Extend isolation to assessments, evidence and delivery records |
| Documented maintainable handover | #8, #10, #32, #33 | README, architecture, setup and design notes | Partial | Updated user guide and final independent walkthrough |
| Demo-scale dashboard/report performance | #19, #22, #26 | Repeatable 500-record registry and CSV check under one second | Partial | Sponsor-approved threshold and dashboard/PDF measurements |
| Sponsor demonstration and feedback | #20, #21, #33 | Not yet recorded | Missing | Fictional-data demo, minutes, decisions and backlog updates |

## Scope rules

- The product audience is Australian SMEs and their nontechnical business and compliance users.
- The required role labels are Administrator, Compliance Officer and Staff User.
- Risk, approval and compliance are separate concepts.
- The prototype supports self-assessment and must not claim certification or legal advice.
- Shadow AI uses voluntary staff disclosure; automated device or network discovery is outside scope.
- Development, testing and demonstrations use fictional or appropriately de-identified data.
- Organisation separation is part of the core architecture, even when demonstrated locally.
- Questionnaire content, scoring thresholds, policy interpretations and report terminology require traceable approval before production use.

## Delivery order

1. Correct product language, user journeys and documentation.
2. Add organisations, memberships, accounts, structured registry fields and audit history.
3. Implement login, sessions and deny-by-default permissions.
4. Persist and connect assessments, risk results, actions, evidence metadata, reminders and dashboards.
5. Add Shadow AI disclosure plus controlled registry conversion.
6. Add authorised CSV and PDF reports.
7. Verify accessibility, security, privacy, tenant isolation, reliability and demo-scale performance.
