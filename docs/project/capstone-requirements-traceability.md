# Capstone requirements traceability

Baseline: `docs/source-materials/ai-governance-compliance-tracker-capstone.docx`
Reviewed: 26 September 2026 after the ordered audit-improvement batches.

Implemented means demonstrated in the local prototype, not sponsor sign-off or production readiness. Source documents are unchanged. Earlier proposal terminology referring to faculties/education/research does not override the SME capstone baseline.

| Requirement | Tickets | Current evidence | Remaining acceptance |
| --- | --- | --- | --- |
| Registration, authentication and three roles | #7, #8, #11 | Admin account directory/create/reset/role/status; self-password changes; mandatory post-reset rotation; scoped sessions/permissions and audit | Independent review; confirm admin-managed registration meets sponsor expectations |
| Governance questionnaire | #4, #9, #14 | Versioned definition snapshots, draft persistence/revisions, immutable submission, history and source/topic trace | Sponsor-approved questionnaire and framework interpretation; current content is explicitly synthetic |
| AI registry | #7, #12 | Persisted purpose/owner/business area/sensitivity/approval; search/filter/pagination, staff-readable details, decision history and fictional examples | SME acceptance; retention/archive rules |
| Explainable risk classification | #9, #15 | Integrated deterministic scoring, stored outcomes and matched explanations, latest-result summaries | Sponsor-approved rules/thresholds; no legal certification |
| Policy repository/checklist links | #16 | Scoped validated PDF/text upload, SQLite blobs, version/digest metadata, authorised download, checklist links and review scheduling | Sponsor format/retention policy; malware-scanning decision before real files |
| Compliance action tracker | #17 | UI/API/persistence, linked assessments, active account owners, dates/status/filter/history and staff assigned-work list | Human acceptance of manager-controlled updates |
| Automated reminders | #18 | Periodic runner, scoped in-app inbox, configurable timing, action/latest-policy inputs, idempotent delivery, read state and retry/run history | Sponsor notification policy; email is not configured or required for current channel |
| PDF and CSV reporting | #22 | Registry/assessment/action/policy evidence, formula-safe CSV, wrapped paginated PDF and embedded Latin font; rendered sample QA | Sponsor report acceptance; additional scripts need fonts |
| Role-based compliance dashboard | #19, #24 | Assessed/unassessed registry totals, demo risk distribution, outstanding/overdue actions, policy reviews and workflow links | Approved risk content and human management/staff usability review |
| Shadow AI disclosure | #23 | Staff submission, Not reviewed default, retained provenance, pending-review filter and decision history | Sponsor acceptance of triage process |
| Security | #11, #28 | Scrypt, revoked opaque sessions, live roles, scoped queries, throttling, safe errors, upload limits, optional TLS/Secure cookies | Actual trusted certificate and encrypted-volume/storage verification; independent review |
| Privacy | #1, #16, #28 | Fictional fixtures, access controls and local-data exclusions | Retention/deletion decisions and privacy review |
| Responsive plain-language UX | #5, #6, #25 | Shared required fields/errors, desktop/tablet/mobile layout checks and automated accessibility scans in both palettes/modes | Human keyboard/screen-reader/SME UAT |
| Reliability and tests | #26, #29 | API/domain regression suite plus role/admin/assessment/action/policy/reminder/browser tests | Independent regression/UAT sign-off; automated evidence is not human acceptance |
| Multi-organisation separation | #7, #11, #19, #28 | Scoped accounts, registry, assessments, actions, policies/files, inbox, settings and reports | Broader multi-tenant deployment remains out of scope |
| Maintainability and handover | #8, #10, #32, #33 | Current setup, architecture, user guide, security plan and repeatable acceptance checklist | Independent clean-checkout walkthrough and sponsor handover |
| Demo-scale performance | #19, #22, #26 | 500-record registry/CSV regression threshold and paginated PDF generation tests | Sponsor-agreed thresholds for full representative datasets |
| Sponsor feedback/demo | #20, #21, #27, #33 | Reviewable integrated local prototype and scripted acceptance walkthrough | Actual sponsor demonstration, feedback and sign-off |

## Scope and approval boundaries

- Audience: Australian SMEs and nontechnical business/compliance users.
- Roles: Administrator, Compliance Officer, Staff User.
- Approval, risk classification and compliance are distinct.
- Current questionnaire/source links demonstrate traceability; synthetic rules do not originate from NIST or ISO and are not sponsor-approved governance policy.
- Shadow AI uses voluntary disclosure; no automated device/SaaS monitoring.
- Development/demonstration data remains fictional or de-identified.
- No legal certification, live enterprise integration, commercial hosting or post-semester support is claimed.
- Research paper, student reflections, actual contribution records and human acceptance remain separate deliverables.

See [user guide](user-guide.md), [acceptance checklist](acceptance-checklist.md), [security configuration](security-configuration.md), and [delivery record](capstone-delivery-2026-09-26.md).
