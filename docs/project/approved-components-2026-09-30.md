# Remaining component implementation - 30 September 2026

## Approval basis

The user instructed: "assume that the sponsor has approved all components at this time". This is the working approval assumption for implementing the remaining components, not evidence of a sponsor meeting, signed acceptance, human UAT or independent security review. No teammate contributions are inferred. Scoring remains the existing synthetic demonstration model; arbitrary scoring-rule editing and an unrestricted workflow builder remain outside scope.

This delivery supersedes the pending implementation statements in [the 29 September record](governance-configuration-2026-09-29.md) for issues #46, #47, #48 and #51.

## Assessment definitions and activation (#47)

Configuration now supports up to twenty additional Yes/No evidence questions, their topics and required/optional status, plus explicit business-area applicability. The four inputs used by the fixed scoring model remain required; additional answers do not alter scores. Empty applicability means all areas, otherwise names must match Registry exactly.

Administrators can save a draft without changing the active version, save and activate, activate an earlier saved version, or retire the active configuration. An approval/change reference, actor and time are recorded in the lifecycle audit. Stale lifecycle changes are rejected. Retiring pauses new assessments and actions; existing drafts, submissions and actions retain their snapshots and remain usable. Activation also selects which custom-role templates are available for new assignments, without rewriting existing assignments.

## Policy acknowledgements (#46)

When enabled in the active configuration, a new assessment captures the current versions of policies linked to its question identifiers. No matching policy causes draft creation to fail with an actionable message. Later policy uploads do not replace the versions required by an existing draft.

Each submitting user must explicitly acknowledge every required version. Receipts record the policy identifier, SHA-256, account and timestamp. The server rejects submission without that user's receipts, cross-organisation access, unrelated policy versions and changes after submission. Submitted results preserve receipt evidence. Acknowledgement is a user's declaration of reading, not independent proof of comprehension. Old drafts retain their original requirements, including no acknowledgement requirement where that was the saved definition.

## Historical reporting (#48)

Migration 12 installs capture triggers for registry records, assessment drafts/submissions, actions and policy versions/reviews. Each insert/update/delete appends a reporting snapshot in the same database transaction as the mutation. Captured timestamps determine the state known at a cutoff; editable dates do not backdate the capture.

Reports reconstructs the last captured state of each record at the end of the selected UTC day. Its CSV/PDF exports use the same selected date and display the capture coverage start. Today's view remains live as records change. Existing Registry exports without a date continue to export current records.

Existing databases receive a baseline snapshot at upgrade time. Earlier states are unavailable and earlier-date requests are rejected rather than reconstructed from incomplete logs. Historical records before the capture boundary cannot be recovered by this implementation. Backups retain captured history; restoring an older backup restores only the history present in that backup.

## Bounded workflow configuration (#51)

Alongside the existing linked-action switch, administrators can require In Progress before completion and disallow reopening completed actions. These settings are captured in the creation history of each new action, so later configuration changes cannot silently alter its transition rules. Existing action revision checks, material-change history and manager permissions remain in force. Completing an action still does not automatically certify or reassess its AI use.

Mandatory policy acknowledgement is similarly captured in new assessment definitions. These bounded switches do not add custom states, scripts, arbitrary transitions, automatic approvals or a visual workflow builder.

## Upgrade and verification

Back up the database before upgrading. Schema 12 adds configuration lifecycle events, policy receipts, reporting coverage and reporting snapshots; it does not rewrite existing assessment definitions. Older application versions reject the new schema. The migration regression exercises upgrading a schema-11 database with existing records and confirms capture begins at migration time without changing old definitions.

API coverage includes activation/retirement, applicability, additional required questions, draft and submission immutability, per-submitter/version receipts, pinned action transitions, historical edits and policy reviews, date-matched exports, permission checks and organisation isolation. Browser coverage exercises the corresponding administrator and assessment controls, rejected submission before acknowledgement, retirement and dated exports. Final test counts and commit references are recorded in the PR and issue updates.

Remaining acceptance activities are actual human usability/accessibility review, independent operational/security review and final handover. The user-directed sponsor approval assumption does not substitute for those activities.

Verified for implementation commit `f7e8ae4`:

- API suite: 32 passed.
- All application suites (API, configuration and domain): 77 passed.
- Production build: passed.
- Playwright: 27 passed, including activation, required-policy submission, retirement, date-matched exports, automated accessibility and responsive navigation.
- Whitespace checks and changed-document relative links: passed.

All fixtures are fictional. Playwright used its own isolated database and server on port 5174 without a port conflict. No unrelated servers were stopped.
