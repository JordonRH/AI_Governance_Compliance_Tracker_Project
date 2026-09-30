# Documentation index

Start with the current runbooks below. They describe the checked-in application and require no AI assistant, private helper scripts or personal development environment.

## Current instructions

| Document | Use it for |
| --- | --- |
| [Development](project/development.md) | Fresh clone, first Administrator, all npm commands, configuration, tests and troubleshooting |
| [Fictional testing pack](project/testing-pack.md) | Repeatable test accounts, configuration variants, backups and local catalogue |
| [User guide](project/user-guide.md) | Every workspace screen, role permissions and fictional-data demonstration |
| [Operations](project/operations.md) | Start/stop, HTTPS activation/replacement, backups/restores, recovery and upgrades |
| [Contributor workflow](project/contributing.md) | Change code, verify, commit, push and open a GitHub PR without AI/CLI integrations |
| [API reference](project/api-reference.md) | Endpoints, payloads, permissions and a PowerShell session example |
| [Architecture](project/architecture.md) | Runtime modules, persisted workflow and boundaries |
| [Security configuration](project/security-configuration.md) | Implemented safeguards and unverified deployment requirements |
| [Requirements traceability](project/capstone-requirements-traceability.md) | Capstone requirements, implementation evidence and remaining acceptance |
| [Acceptance checklist](project/acceptance-checklist.md) | Actual human/team/sponsor review and outcome recording |

## Dated evidence and planning

These are snapshots; follow current runbooks for commands and GitHub for live issue state.

- [Reports explorer and workflow redesign, 30 September](project/reports-workflow-redesign-2026-09-30.md): six report views, charts, selected exports and the redesigned configuration editor.
- [Remaining components, 30 September](project/approved-components-2026-09-30.md): user-directed approval assumption, activation, acknowledgements, historical reporting and workflow versions.
- [Documentation verification](project/documentation-verification-2026-09-27.md): fresh-checkout command checks and their limits.
- [GitHub reconciliation, 27 September](project/github-reconciliation-2026-09-27.md): per-ticket evidence and disposition at that date.
- [Ordered capstone delivery, 26 September](project/capstone-delivery-2026-09-26.md): implementation batches, commit references and evidence boundaries.
- [Functional audit, 26 September](project/capstone-functional-audit-2026-09-26.md): original findings; later delivery supersedes its implementation status.
- [Progress log](project/progress.md): chronological development/contribution record; earlier entries describe earlier code.
- [Proposal issue register](project/proposal-issue-register.md): historical WBS-to-GitHub mapping and planning discrepancies.

## Source materials

Original university/project inputs remain unchanged in `source-materials/`. Do not edit them to record implementation progress.

- [Capstone requirements](source-materials/ai-governance-compliance-tracker-capstone.docx)
- [Project proposal and plan](source-materials/ai-governance-compliance-tracker-project-proposal-and-plan.docx)
- [Drive structure and workflow](source-materials/google-drive-structure-and-workflow.docx)
- [Original ticket register](source-materials/project-ticket-register.xlsx)

Open Word documents in Word/LibreOffice and the spreadsheet in Excel/LibreOffice. These source artifacts are not inputs that the running app loads.

## Research and earlier design

[Background/literature review](research/background-and-literature-review.md) and [candidate framework map](research/governance-framework-candidate-map.md) preserve proposal-era higher-education research. The implemented product baseline is SME-focused. These are review inputs, not approved questions, rules, policy or the completed research paper.

Earlier designs retain their proposed contracts and unresolved decisions at the time they were written. Each has a current implementation note; current architecture, API reference and executable tests take precedence for operating/extending the app.

- [Risk scoring](design/risk-scoring-module.md)
- [Authentication/authorisation](design/authentication-and-authorization.md)
- [Assessment lifecycle](design/governance-assessment-module.md)
- [Policy/evidence intake](design/policy-and-evidence-handling.md)
- [Action lifecycle](design/governance-action-tracking.md)
- [Reminder planning](design/reminder-planning.md)
- [Dashboard aggregation](design/dashboard-summary.md)

## Folder purposes

| Folder/file | Purpose |
| --- | --- |
| src/ | Browser React components/styles; built by Vite |
| server/ | Node startup, Express APIs, SQLite and workflow services |
| server/domain/ | Imported pure domain modules, not separate processes |
| tests/api/, tests/config/, tests/domain/ | Node test suites, run by npm test |
| tests/e2e/ | Playwright browser suites, run by npm run test:e2e |
| docs/project/ | Current runbooks plus explicitly dated project records |
| docs/design/, docs/research/ | Design history and candidate research |
| docs/source-materials/ | Preserved original documents |
| data/ | Ignored local SQLite/certificate/backup files; never supplied by Git |
| dist/, node_modules/ | Generated build/dependencies; never supplied by Git |
| test-results/, playwright-report/ | Ignored generated verification output; not required operator tooling |
| .env.example | Tracked configuration reference; .env is ignored and must be explicitly loaded |
| package.json, package-lock.json | Supported commands and reproducible dependency versions |

Personal `.agents/` files are ignored; no agent skill/plugin is required to run or maintain AITrace.

## Sponsor showcase

The [sidebar/showcase verification record](project/sidebar-showcase-verification-2026-09-27.md) includes diagnosis, automated results and repeatable generation of the nine-page sponsor PDF and complete fictional screenshot pack.
