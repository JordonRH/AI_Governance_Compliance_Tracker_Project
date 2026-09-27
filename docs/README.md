# Documentation index

AITrace documentation follows a simple folder cadence so working guidance and original project inputs remain distinct.

## Project documentation

- [Architecture](project/architecture.md): application boundaries, structure, API and design decisions.
- [Local development](project/development.md): setup, commands, data handling and troubleshooting.
- [Development progress](project/progress.md): delivered work, verification and contribution record.
- [Capstone requirements traceability](project/capstone-requirements-traceability.md): source requirements mapped to tickets, evidence, gaps and next work.
- [Proposal issue register](project/proposal-issue-register.md): mapping between proposal WBS activities and GitHub issues.

- [User guide](project/user-guide.md): complete role-based demonstration workflow.
- [Acceptance checklist](project/acceptance-checklist.md): human review steps and remaining evidence.
- [Security configuration](project/security-configuration.md): password/TLS settings and storage-encryption plan.

## Source materials

The `source-materials/` folder preserves the original university and project planning files. File contents are unchanged; filenames use lowercase kebab-case for consistent repository navigation.

- `ai-governance-compliance-tracker-capstone.docx`
- `ai-governance-compliance-tracker-project-proposal-and-plan.docx`
- `google-drive-structure-and-workflow.docx`
- `project-ticket-register.xlsx`

Do not edit source materials to record implementation progress. Put current technical guidance and evidence in `project/`, and retain contribution and AI-use records accurately.

## Research

- [Background and literature review](research/background-and-literature-review.md): focused higher-education AI governance baseline, findings and limitations.
- [Candidate governance framework map](research/governance-framework-candidate-map.md): topic-level comparison and decisions required before assessment design.

Research documents are review inputs. They do not establish sponsor policy, legal compliance, assessment questions or scoring thresholds.

## Design

- [Explainable risk-scoring module](design/risk-scoring-module.md): proposed module seam, contracts, invariants, persistence boundaries and test strategy without unapproved rule content.
- [Authentication and authorisation](design/authentication-and-authorization.md): proposed request identity seam, deny-by-default permissions, server-side sessions and implementation decisions.
- [Governance assessment module](design/governance-assessment-module.md): proposed questionnaire lifecycle, immutable submission, validation and scoring handoff without unapproved question content.
- [Policy and evidence handling](design/policy-and-evidence-handling.md): implemented intake-validation seam and unresolved storage, retrieval and permission decisions.
- [Governance action tracking](design/governance-action-tracking.md): implemented action lifecycle/history seam and unresolved persistence and permission decisions.
- [Reminder planning](design/reminder-planning.md): implemented channel-neutral timing/idempotency seam and unresolved scheduling and delivery decisions.
- [Scoped dashboard summary](design/dashboard-summary.md): implemented scope-first aggregation and unresolved role/API/UI decisions.

## Repository cadence

- `src/`: React application source.
- `server/`: Express API, server startup and SQLite access.
- `tests/api/`: API and persistence tests.
- `tests/domain/`: pure domain contract and boundary tests.
- `tests/e2e/`: Playwright browser tests.
- `docs/research/`: reviewed research baselines and candidate mappings.
- `docs/design/`: technical designs that depend on recorded decisions before implementation.
- `data/`: ignored local SQLite data.
- `test-results/`: ignored generated browser-test evidence; disposable Playwright output stays in `test-results/playwright/` so retained review screenshots do not conflict with runner cleanup.
- Root: application entry points, package metadata and tool configuration only.

- [GitHub/repository reconciliation, 27 September 2026](project/github-reconciliation-2026-09-27.md)
