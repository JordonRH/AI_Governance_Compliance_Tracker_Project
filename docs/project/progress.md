# Development progress

## 20 September 2026

Jordon confirmed that requirements review is complete and approved React/Vite, Node.js/Express and SQLite. Initial implementation is led by Jordon, with Avnish, Ashvin and Noorpreet reviewing later. Actual review participation has not yet been recorded.

The requested checkpoint is an initial React UI with a working Node.js backend. Jordon subsequently authorised progressive implementation, superseding the initial stop instruction.

## Ticket status

| Ticket | Local status | Delivered in this increment | Remaining |
| --- | --- | --- | --- |
| #10 Repository and local development | Ready for review | npm scripts, React/Vite, Express, SQLite setup, API and browser checks, setup documentation | Team walkthrough and agreement on branching/review conventions; full architecture choices remain scoped to later tickets |
| #12 AI registry | Partial implementation, awaiting review | Create, view, edit, validate and persist fictional AI uses | Authentication, approved access boundaries, approval status, agreed sensitivity fields and history |
| #13 Categories | Partial implementation, awaiting review | Single Education/Administration/Research category, search and filtering | Confirm single versus multiple categories and review with the completed registry |
| #19 Dashboards | Partial domain implementation | Initial overview plus scope-first registry/risk/action aggregation with reconciled totals | Approved role-to-scope mapping, persisted risk/actions and authorised API/UI integration |

Issues remain open where acceptance criteria are unmet. The limited initial build does not remove native dependencies or claim that upstream authentication and design tickets are complete. There is no claim of sponsor or team acceptance.

## Review steps

1. Follow `development.md` to start the application with `npm run dev`.
2. Create a fictional AI record and confirm it appears in the registry and overview.
3. Search, filter and edit the record, then refresh to check persistence.
4. Inspect the interface at desktop and narrow browser widths.
5. Check that every record remains Not assessed and that unimplemented features are clearly identified.
6. Record feedback and the person who performed each review on the corresponding ticket.

## Contribution record

Jordon supplied the project direction, selected the initial stack and requested this implementation checkpoint. Code, documentation and automated checks were prepared with coding-assistant support. Teammate review is pending. This is not a record of independently authored work or completed team review.

## Verification

- `npm run build`: passed.
- `npm test`: 4 API tests passed, including persistence across a database restart.
- `npm run test:e2e`: 3 browser tests passed, covering create/edit/reload, category filtering, fictional examples, keyboard dismissal and mobile layout.
- Desktop (1440 pixels) and mobile (390 pixels) overview screenshots were visually inspected. Test screenshots remain in the ignored `test-results` directory.
- `npm run dev`: local instance started successfully at http://127.0.0.1:5173.

Verification exposed and resolved a backend watcher restart loop, query validation gaps, dialog focus and select-label issues, and mobile overflow caused by hidden table-header text. No governance feature was added during these fixes.

GitHub issue #10 is ready for review. Issues #12 and #13 record partial implementation, with review pending. Their unmet acceptance criteria and native blocking relationships remain intact. The Project board has not been updated because its access was not established.

Source and documentation remain local in `J:\AITrace`; no application code has been committed or pushed during this increment. GitHub issue text and labels were updated at Jordon's request. The existing proposal documents and ticket spreadsheet are unchanged.

## Follow-up: temporary theme and registry details, 20 September 2026

Jordon requested continued implementation and a temporary theme switch. This supersedes the earlier stopping point. The theme is a user-requested convenience, not a sponsor requirement, and is tracked separately in issue #34 (Low priority).

Delivered locally with coding-assistant support:
- Labelled, keyboard-accessible Dark theme button with accurate pressed state; light remains the default.
- Browser preference persistence with guarded storage access. Switching remains usable when storage is blocked.
- Dark styles for navigation, overview, registry, forms, details, notices and errors, including mobile layout.
- Read-only record details from overview and registry names, with an explicit Edit record action, Escape/Close dismissal and focus restoration. This is a partial increment under #12.
- Updated setup and architecture guidance. Jordon directs implementation; no teammate review or sponsor acceptance is claimed.

Verification:
- Production build passed; all 4 API tests passed.
- All 7 Playwright tests passed in 11.2 seconds, with a successful process exit. Coverage includes existing registry workflows, both themes at 1440px and 390px, preference persistence in both directions, blocked localStorage, navigation, loading/error recovery, empty results, details and edit transitions.
- Desktop/mobile screenshots of light/dark overview, forms, details, registry notices and the error state were visually inspected. Screenshots are retained in ignored test-results/.
- Initial browser launch failed because the required Chromium revision was absent; installing the project's Playwright browser resolved it.
- Sandbox runs completed the browser assertions but hung during server cleanup and were interrupted. Removing the watch wrapper did not resolve this; that experimental change was reverted. Running the original configuration outside the sandbox completed successfully. The development watch scope remains unchanged.
- PowerShell blocks npm.ps1 here; npm.cmd runs successfully.

All application changes remain local and uncommitted. Source proposal documents and the existing application database were not modified by tests. Tests use a separate temporary database. No GitHub Project board update is claimed.

GitHub update verified: #34 is open with status:review and implementation/test evidence; #12 is open with status:partial and a detail-view progress comment. Existing dependencies and unrelated issue text were preserved. The local development instance returned HTTP 200 from /api/health, and a browser smoke check verified the theme button at http://127.0.0.1:5173.

## Repository organisation

The repository now uses a consistent folder cadence. Current project guidance is under `docs/project/`; unchanged source documents are under `docs/source-materials/`; API tests are under `tests/api/`; and browser tests remain under `tests/e2e/`. Source-material filenames use lowercase kebab-case. Root files are limited to application entry points, package metadata, tool configuration and the main README. All affected documentation links, test scripts and module imports were updated.

Post-organisation verification passed: production build, 4 API tests and 7 browser tests. Local links in all Markdown files resolve. Playwright disposable output now uses `test-results/playwright/`, separate from retained review screenshots, which prevents runner cleanup from conflicting with files open for visual inspection.

## GitHub issue status audit

All 34 GitHub issues were reviewed against verified local evidence on 20 September 2026. Issues #1, #2, #5, #6, #7, #8, #12, #13, #19, #25, #26, #27, #28, #29 and #32 are labelled `status:partial` with evidence and explicit remaining work. Issues #10 and #34 remain `status:review`. Issues #3, #4, #9, #11, #14–#18, #20–#24, #30, #31 and #33 remain without a progress-status label because their acceptance criteria have not been materially covered.

All 34 issues remain open. No broad WBS issue was closed while team review, sponsor decisions, authentication or other acceptance criteria remain unmet. Source references in issues #1–#33 now match `docs/source-materials/ai-governance-compliance-tracker-project-proposal-and-plan.docx`. Existing dependencies and unrelated issue content were preserved. The GitHub Project board was not changed.

## Research baseline and framework mapping

After Jordon directed that partial dependencies should not block subsequent work, the next unblocked research tasks #3 and #4 were completed to a reviewable local checkpoint. `docs/research/background-and-literature-review.md` distinguishes education, administration and research contexts and records findings, limitations and authoritative/peer-reviewed sources. `docs/research/governance-framework-candidate-map.md` compares NIST AI RMF 1.0, Australia's AI Ethics Principles, the public ISO/IEC 42001 overview, OAIC privacy guidance and higher-education sources at topic level.

The mapping deliberately contains no assessment questions, response weights, scoring thresholds, legal conclusions or certification claims. Framework selection, institutional policy inputs, roles, approval terminology, evidence access and deterministic rules remain sponsor/team decisions. NIST AI RMF 1.0 is recorded as under revision, and clause-level ISO mapping is deferred until lawful access to the full standard and competent review are available.

Local-link validation passed across all 8 Markdown files. Issues #3 and #4 are ready for team review; implementation of #9, #14 or #15 must still wait for the recorded governance decisions.

## Explainable scoring design

Issue #9 now has a partial technical design in `docs/design/risk-scoring-module.md`. The design places deterministic validation, evaluation and explanation behind one pure `evaluateAssessment(definition, responses, context)` interface. It defines version traceability, invariants, error modes, persistence boundaries and a test strategy while keeping risk separate from approval and compliance.

The module has not been implemented and no assessment schema was added. Questions, responses, source interpretations, outcome labels, rules, priority, thresholds and scenario outcomes remain unapproved. Nine Markdown files pass local-link validation, and the design's fail-closed and separation invariants were checked.

## Authentication and authorisation design

Issue #11 now has a partial security design in `docs/design/authentication-and-authorization.md`, based on current OWASP, Node.js and MDN guidance. The design separates authentication from authorisation, places both behind common request middleware, denies protected routes by default and proposes opaque server-side sessions rather than browser storage. It records generic login failures, session rotation/revocation, current-account checks, server-enforced permission actions and required negative tests.

No authentication code or migration was added. Role names/access rules, registration or invitation workflow, first-administrator bootstrap, password policy, session lifetime, hashing choice, recovery and production HTTPS remain decisions. Ten Markdown files pass local-link validation, and the authentication separation and decision gates were verified.

## Governance assessment design

Issue #14 now has a partial lifecycle design in `docs/design/governance-assessment-module.md`. The design covers approved-definition selection, draft persistence, response validation, optimistic concurrency, conditional applicability, immutable submission, reassessment, accessible interface requirements and a controlled handoff to the separate scoring module.

No questionnaire, route, schema or user interface was implemented. Question text, permitted responses, category applicability, evidence requirements, permissions, retention and audit rules remain unapproved. Eleven Markdown files pass local-link validation, and the assessment lifecycle/separation invariants were verified.

## Secure runtime configuration

Runtime settings now pass through a validated, immutable configuration module. The local-only bind address, port, SQLite path and JSON body limit are configurable; unsafe bind addresses, invalid values and unknown `AITRACE_` settings stop startup. Host and origin checks, security response headers, ignored local environment files and a non-secret `.env.example` protect the current unauthenticated prototype boundary. Configuration and API tests cover the fail-closed behavior.

## Policy-neutral scoring engine

The pure risk-scoring seam for issue #15 is implemented with synthetic test definitions only. It produces deterministic, versioned and source-traceable explanations from approved definitions, while rejecting draft or retired definitions, invalid responses, ambiguous priorities, unknown references, inapplicable categories and missing outcomes. It does not persist assessments, expose an API, assign approval state or assert compliance. Approved governance questions, thresholds, labels and institutional sources remain required before application integration.

## Evidence intake foundation

Issue #16 now has a pure evidence-intake validation seam with synthetic tests. An approved versioned policy must explicitly allow the byte limit, media type, extension and leading file signature. Accepted output retains a SHA-256 digest and assessment/checklist-item link with pending review status. The module performs no storage, upload, retrieval, malware scanning or authorisation. Those acceptance criteria remain open pending the assessment model, authentication roles, storage decision, retention requirements and approved review metadata.

## Governance action foundation

Issue #17 now has a pure governance-action aggregate with owner, due date, Not Started/In Progress/Complete status, optimistic version checks, immutable material-change history and deterministic overdue classification from a caller-supplied date. Tests cover creation, editing, completion, reopening, conflicts, invalid dates, no-op changes and timing boundaries. Persistence, authenticated permissions, API/UI integration and approved transition restrictions remain open.

## Reminder planning foundation

Issue #18 now has a pure reminder planner for action and policy-review due dates. Approved versioned rules define upcoming windows, due-today handling and repeatable overdue cadence. Closed items are excluded, invalid batches fail without a partial plan, and each deterministic intent has an idempotency key. No channel, recipient, scheduler or delivery claim is introduced; those remain open pending deployment, role and communication decisions.

## Scoped dashboard aggregation

Issue #19 now has a pure dashboard snapshot builder. It filters records by an authorised institution/category scope before counting, distinguishes restricted summaries from zero, reconciles registry/category/assessment totals, groups visible risk outcomes and counts visible outstanding/overdue actions using a controlled date. Synthetic tests verify cross-institution isolation and filter boundaries. The existing UI remains an unauthenticated registry scaffold until approved roles, persisted assessments/actions and server-created scopes exist.


## Pre-ticket-20 quality audit

The domain foundations now share one validation utility. The audit also tightened risk-definition dates and typed rule operands, rejects malformed or conflicting action definitions without throwing, validates current governance-action state, treats whitespace-only updates as no-ops, requires advancing timestamps for material updates, and validates dashboard data only after authorised-scope filtering. The local API origin policy now requires the exact current HTTP origin, including its port.

Verification passed with 44 Node tests, 7 Playwright tests, a production build, zero npm audit vulnerabilities and a clean Git diff check. Authentication, approved governance content, evidence storage and reminder delivery channels remain decision-gated.


## Capstone requirements alignment 25 September 2026

The capstone requirements are now the product baseline. The interface uses SME and organisation language, the registry records a free-text business area, structured data sensitivity and approval status, and the database scopes records to an organisation. The required role labels are Administrator, Compliance Officer and Staff User.

Administrators can register organisation accounts for the three capstone roles. Organisation accounts use salted scrypt password hashes. Opaque session tokens are stored only as SHA-256 hashes and sent in host-only HttpOnly SameSite Strict cookies. Protected API routes deny anonymous requests and enforce action permissions. Tests cover generic login failures, logout revocation, role denial and horizontal isolation between two fictional organisations. Local HTTP remains restricted to loopback; production TLS remains a deployment requirement.

Shadow AI self-reporting now creates an unapproved disclosure in the organisation registry without automated discovery. Administrators and Compliance Officers can export organisation-scoped CSV and paginated PDF compliance summaries. These exports state recorded facts and do not claim certification.

The questionnaire, approved scoring definitions, persisted risk results, evidence storage, action persistence and reminder delivery still require integration. The pure modules remain available and tested, but governance content is not invented. See `capstone-requirements-traceability.md` for the ticket mapping and remaining evidence.


## 26 September 2026: ordered capstone workflow delivery

The audit backlog was implemented in sequenced commits with GitHub evidence comments. See [delivery record](capstone-delivery-2026-09-26.md), [current traceability](capstone-requirements-traceability.md), [user guide](user-guide.md) and [acceptance checklist](acceptance-checklist.md). Earlier entries are historical checkpoints and do not describe the current feature set. Sponsor content/acceptance, real encrypted-storage/TLS evidence and human UAT remain open.

## 27 September 2026 — Administrator certificates

Added organisation-scoped certificate staging, temporary 30-day self-signed generation, matching PEM replacement validation, expiry/fingerprint metadata and explicit restart-based server activation. Secret bundles remain outside Git. The normal local administrator now has a generated staged pair; its Windows directory ACL is restricted to the current account and SYSTEM. HTTP remains active until configuration/restart; no trust-store changes were made.

Verification: 68 application tests and 14 browser tests passed, production build passed, npm audit reported zero vulnerabilities. A test HTTPS connection verified the generated certificate using an explicit test CA. The new page is included in automated accessibility checks across both palettes and light/dark modes. A browser test's required-field label locator was corrected before the final passing run.
