# Capstone functional audit and improvement backlog

Reviewed: 26 September 2026
Baseline: [Original capstone](../source-materials/ai-governance-compliance-tracker-capstone.docx)

## Verification performed

- Connected successfully to http://127.0.0.1:5173; health returned 200 and administrator sign-in succeeded.
- Navigated Overview, Registry, Disclose AI use, Guide, Accounts, and Appearance in a real Chromium browser.
- Checked authenticated registry, accounts, settings, actions, dashboard, PDF and CSV endpoints. Assessment and policy endpoints returned 404; no corresponding screens/routes/tables exist in the repository.
- Current local organisation contains one account and zero registry records. Live inspection was read-only apart from creating/revoking the audit login session. Mutation workflows were exercised by the automated suite against disposable data.
- Desktop/mobile page checks passed; no page-width overflow on the inspected mobile routes.
- Current checks: 55 application tests, 8 browser tests, production build passed. Passing tests cover implemented behaviour, not full requirements completion.
- Isolated in-memory reproduction confirmed example loading returns HTTP 500 and inserts zero records. Also confirmed empty-registry staff dashboard returns available risk/action summaries instead of restricted summaries.
- Live browser emitted a Vite React preamble error. Pages still operated; root cause is not yet established. Inspect development CSP/preamble handling and make console-error checks part of browser QA.

## Requirement-by-requirement assessment

| Requirement | Verified delivery | Missing elements / next work |
| --- | --- | --- |
| 1. Registration, authentication, three roles | Admin-created accounts; sign-in/out; salted password hashing; session cookies; server permissions; organisation scoping. Admin directory, reset, role/status changes, session revocation and audit storage tested. | Core baseline demonstrated through admin-managed registration. Self-service password change, forced change after admin reset, recovery and readable audit history are useful enhancements, not separately mandated features. No public self-registration; confirm whether admin registration meets sponsor expectations. |
| 2. Governance questionnaire | Assessment lifecycle design and framework research documents. | No question UI, assessment routes/tables, saved drafts, submission, history, or approved/versioned questionnaire content. |
| 3. AI registry | Create/edit, purpose, owner, business area, data description, sensitivity and approval status; persisted, scoped API. | Example loader broken. API search/filter not connected to UI. No read-only detail view for staff; list omits purpose/owner/data description. Approval changes have no recorded decision history. Archive and pagination would improve usability. |
| 4. Rules-based risk scoring | Tested pure scoring engine with synthetic definitions. | Not connected to an assessment workflow or persisted outcomes. API hardcodes every record to Not assessed. Actual governance rules/thresholds require reviewed versioned definitions. |
| 5. Policy repository | Tested file intake validation/digest module and design. | No upload/storage/download routes or UI; no policy metadata, versions, checklist links, review dates or reviewer assignments. |
| 6. Action tracking | Persisted actions, create/update/list API; owner, due date, status, version and history; tested domain logic. | No action-tracker page/forms, staff task view, or assessment-to-action flow. Owners are free text rather than linked account recipients. |
| 7. Automated reminders | Deterministic planner and authenticated planning endpoint for stored actions. | No scheduler, delivery adapter, recipient resolution, delivery/retry/deduplication history, notification UI or policy-review data feed. Planning is not delivery. |
| 8. PDF/CSV compliance summaries | Both exports reachable; CSV fields and PDF pagination tested. | Outputs describe registry records, not a complete compliance summary. Missing risk/assessment results, policy evidence and action state. PDF has no long-line wrapping and replaces non-ASCII text. CSV quoting does not neutralise spreadsheet formula prefixes. |
| 9. Role-based compliance dashboard | Registry counts, business areas and permitted action counts; persisted action-aware backend. | No actual risk/compliance posture, policy-review summary, staff-specific work queue, or useful drill-downs. Empty-registry shortcut ignores role restrictions and skips normal date validation. |
| 10. Shadow AI self-reporting | Working disclosure form/API, persisted source marker, defaults to Not reviewed; tested. | Core disclosure baseline demonstrated. Review/triage queue, decision history and explicit conversion/linking to a formal registry entry would complete the follow-up workflow. |

## Cross-cutting findings

- Security requirement remains partial: HTTP loopback server and ordinary SQLite storage. Password hashes are not encryption of stored organisational data. HTTPS/encrypted-storage evidence is absent; production hosting itself is out of scope.
- No sign-in throttling or normal user password-change flow. Existing administrative controls and tenant-isolation tests are valuable foundations.
- Plain-language responsive forms and two organisation styles exist. Complete keyboard/screen-reader, tablet and representative SME acceptance testing remains outstanding.
- API validation fields are returned but forms show a general error instead of mapping those errors to the relevant controls. Examples/export failures lack visible catch handling; form submission locking is inconsistent.
- General unexpected API exceptions can use Express's default HTML error response, including stack details in development; provide a consistent safe JSON error handler.
- Framework mapping remains candidate/design material; full questionnaire-to-rule-to-framework traceability is unfinished.
- Documentation is partially stale: the requirements matrix still lists action persistence/API as future work and repeats already implemented hashing/session work as missing. Update completion claims using end-to-end evidence.

## Prioritised improvements

1. **Fix verified defects and QA blind spots** (#12, #19, #25, #26, #28): valid demo sensitivity values and transactional inserts; friendly error handling; empty-dashboard permissions/date validation; investigate Vite error; add regression cases and fail browser tests on unexpected page errors.
2. **Deliver assessments and integrated risk scoring** (#4, #9, #14, #15): versioned questionnaire, saved drafts, validated submission, stored results and explainable reasons. Use clearly labelled synthetic definitions while content approval remains pending.
3. **Expose action tracking in the app** (#17): list/detail/create/edit, due dates, status transitions, accountable owners, history and links from registered uses/assessments.
4. **Implement the policy repository** (#16): constrained uploads, authorised storage/download, metadata/versioning, checklist links and review schedules.
5. **Turn reminder planning into notifications** (#18): recipient linkage, configurable timing, scheduler, one working delivery channel, retry and duplicate prevention, policy-review coverage.
6. **Make dashboard and exports represent real compliance work** (#19, #22, #24): connect assessments, risks, policies and actions; add role-appropriate drill-downs; wrap PDF text, support Unicode and protect CSV exports from formula interpretation.
7. **Finish registry/disclosure usability** (#12, #23, #25): search/filter controls, staff-readable details, review queue and approval/triage history; consistent field errors, loading states and submit protection.
8. **Close security and account lifecycle gaps** (#7, #11, #28): user password change, post-reset change policy, login throttling, safe error responses, audit viewer and testable TLS/storage-encryption plan appropriate to prototype scope.
9. **Refresh traceability and handover evidence** (#26, #29, #32, #33): accurate matrix, complete user guide, full role-based assessment-to-report demonstration, accessibility/UAT evidence and sponsor review.

Ticket references are mappings to the existing register; no GitHub issues were changed during this audit. This report does not claim sponsor acceptance or production readiness.

## Key code evidence

- `server/app.js`: hardcoded Not assessed mapping; invalid Public demo data fixtures; action/planner APIs; empty-dashboard shortcut; report routes.
- `server/database.js`: schema includes organisations, accounts, sessions, AI uses, actions, appearance settings and account audit; assessment/policy/delivery tables absent.
- `server/domain/risk-scoring.js`, `evidence-intake.js`, `reminder-planning.js`: isolated domain implementations; distinguish these from delivered user workflows.
- `server/reporting.js`: registry-only fields, fixed-position PDF lines, ASCII replacement, CSV escaping.
- `src/main.jsx`: current navigation/pages, admin controls, missing form field-error wiring and unhandled examples/export promises.
