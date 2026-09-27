# GitHub and repository reconciliation ? 27 September 2026

Compared the open issue criteria with the implemented branch, tests and tracked documentation. Completed means the specified prototype/research deliverable is implemented; it does not claim sponsor acceptance or that PR #40 is merged. User authorization covers continued implementation and ticket updates. Historical proposals remain unchanged.

The active product baseline is SME-focused. Tickets #5, #13 and #19 need current titles; original WBS provenance and unresolved taxonomy decisions are retained.

| Ticket | Disposition | Evidence and remaining work |
| --- | --- | --- |
| #1 | Keep open: remaining criteria | Requirements and exclusions are in capstone-requirements-traceability.md. Sponsor decisions and team review remain pending. |
| #2 | Keep open: remaining criteria | Source proposal and proposal-issue-register.md exist. Integrated planning review and effort reconciliation are not evidenced. |
| #3 | Close: implemented deliverable | docs/research/background-and-literature-review.md fulfils the candidate literature deliverable. Its higher-education framing is historical proposal research, not the current SME product scope or the final paper (#31). |
| #4 | Close: implemented deliverable | docs/research/governance-framework-candidate-map.md fulfils candidate topic mapping. Approved questions and scoring remain #1/#14/#15; closing research does not approve synthetic rules. |
| #5 | Keep open: remaining criteria | user-guide.md documents the SME journeys and three roles; actual team journey review remains unrecorded. Faculty wording is superseded by the SME capstone baseline. |
| #6 | Keep open: remaining criteria | Working UI has shared required fields, empty/error states and role navigation. A separate wireframe deliverable and human design review remain unrecorded. |
| #7 | Keep open: remaining criteria | architecture.md and database.js document schema v10, organisation ownership, relationships/history and metadata. Historical database-choice discussion is not independently attested here. |
| #8 | Keep open: remaining criteria | architecture.md records modular monolith, REST, authentication, files, reporting and reminders. Formal contract/architecture review remains unrecorded. |
| #9 | Keep open: remaining criteria | Versioned deterministic rules and scenario tests distinguish risk/approval/compliance. Sponsor-derived questions/thresholds are still pending; current rules are explicitly synthetic. |
| #10 | Close: implemented deliverable | development.md, package-lock.json, Playwright setup and passing application/build/browser checks provide the reproducible development baseline. Independent handover verification stays in #32. |
| #11 | Close: implemented deliverable | auth.js, admin UI and API/browser tests cover account creation/login, scrypt, role checks, resets, session revocation and forced rotation. Admin-managed registration is the user-authorized prototype workflow; sponsor acceptance remains #1/#27. |
| #12 | Close: implemented deliverable | registry.jsx, app.js and registry_events provide persisted CRUD, required fields, filters/details and history. API/browser tests cover validation and access. |
| #13 | Keep open: remaining criteria | Registry supports a single SME businessArea and filtering. Original Education/Administration/Research taxonomy conflicts with the capstone SME scope; sponsor decision on taxonomy/multiple categories remains open. |
| #14 | Keep open: remaining criteria | assessments.js and workflows.jsx persist versioned drafts/immutable submissions with validation and traceability. Approved framework-mapped content remains pending. |
| #15 | Keep open: remaining criteria | risk-scoring.js and integrated assessment results have deterministic tests and retained history. Approved rules, thresholds and prescribed actions remain pending; visible recommendations are demo content. |
| #16 | Close: implemented deliverable | policies.js/workflows.jsx implement scoped PDF/text upload/download, versions, checklist links, reviewer/due metadata and validation tests. Real-file retention/scanning decisions remain security/privacy acceptance in #28. |
| #17 | Close: implemented deliverable | Action UI/API supports assigned owners, three statuses, due dates, same-AI submitted-assessment links and history. Domain/API/browser tests cover authorised changes and overdue status. |
| #18 | Close: implemented deliverable | notifications.js and server scheduler deliver configurable in-app reminders with scoped recipients, deduplication and controlled-date tests. No email service is assumed; channel policy can be reviewed in #1/#27. |
| #19 | Close: implemented deliverable | dashboard-summary.js and connected UI reconcile registry/risk/action/policy totals with role scope tests. High (proposal) versus Medium (spreadsheet) is retained as a planning conflict for #1/#2; the implementation does not decide sponsor priority. |
| #20 | Keep open: remaining criteria | acceptance-checklist.md and fictional example fixtures prepare the walkthrough. Actual sponsor demonstration, meeting minutes and participation evidence remain pending. |
| #21 | Keep open: remaining criteria | Source proposal remains intact and current capstone traceability separates assumptions. Actual sponsor feedback and resulting team backlog review remain pending. |
| #22 | Close: implemented deliverable | reporting.js exports scoped CSV/PDF across registry/assessments/actions/policies. Tests plus rendered PDF QA verify formulas, wrapping, pagination and accented Latin text. |
| #23 | Close: implemented deliverable | Staff disclosure, required fields, Not reviewed triage, filters and decision history are implemented and tested. Current role is Staff User; faculty terminology is historical. No device discovery is implemented. |
| #24 | Keep open: remaining criteria | Interface/summary refinements, screenshot evidence and regression checks exist. Actual sponsor feedback cannot be claimed from user-directed changes. |
| #25 | Keep open: remaining criteria | Automated axe checks cover all current pages/palettes/modes and responsive widths. Human non-specialist, keyboard and screen-reader walkthroughs remain pending. |
| #26 | Close: implemented deliverable | API/domain/browser suites cover implemented prototype requirements, permissions, negative/boundary cases, assessments, rules, files, reminders, reporting and disclosure. Sponsor-approved scoring content will require additional tests under #14/#15. |
| #27 | Keep open: remaining criteria | Core workflows have automated end-to-end coverage; acceptance-checklist.md explicitly separates human UAT. Actual reviewer/participant results remain unrecorded. |
| #28 | Keep open: remaining criteria | Access/session/file/export/isolation checks and secret exclusions are evidenced. Temporary certificate administration and a real test TLS handshake are implemented; trusted deployment, encrypted storage and independent review remain pending. |
| #29 | Close: implemented deliverable | Ordered delivery record and ticket comments identify defects/fixes and corrected selector failures. Current regression checks are green. Work is coding-assistant implementation under Jordon direction; no other contributor is inferred. |
| #30 | Keep open: remaining criteria | Agreed research question, evaluation methodology and university review requirements are not recorded as completed deliverables. |
| #31 | Keep open: remaining criteria | Candidate research sources exist, but final paper, actual evaluation results, contributions and AI-use declaration are not completed here. |
| #32 | Keep open: remaining criteria | README, architecture, development/security configuration, user guide and safe demo instructions are current. Independent clean-checkout walkthrough remains pending. |
| #33 | Keep open: remaining criteria | Source and implementation/test guidance are ready for review. Actual sponsor demo/handover, research output and participant records remain pending. |
| #34 | Close: implemented deliverable | Top-bar theme toggle, localStorage fallback and both themes are implemented and covered by theme/accessibility/layout browser tests. Changes are pushed in PR #40, no longer local-only. |

Certificate work: administrator-only staging/generation/replacement; ignored private organisation bundles; 30-day self-signed local certificates; explicit operator activation on restart. The generated local bundle has restricted Windows ACLs. HTTP remains active until the operator sets the bundle configuration and restarts. No browser/OS trust was installed.

PR #40 contains the implementation awaiting merge into main. Repository state and remote comparison are verified before publishing these updates.

Verification for certificate commit `bd2565a`: 68 application tests, 14 browser tests, production build and dependency audit (zero reported vulnerabilities). All 34 issue bodies were reconciled with individual checked/unchecked criteria; 14 implemented deliverables are closed and 20 remain open. These counts describe this reconciliation, not future issue state.
