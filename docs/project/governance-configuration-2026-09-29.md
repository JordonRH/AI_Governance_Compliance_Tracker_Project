# Daily workflow and controlled configuration

This delivery covers the implementation foundations in issues #43–#51. It uses fictional test data and synthetic assessment rules. It does not record sponsor approval, human UAT, legal compliance or production security acceptance.

## Daily workflow

Overview shows saved assessment drafts, action due dates and business-area shares of registered uses. These percentages describe the register, not excessive or inappropriate AI use. Registry contains disclosure intake, provenance and the unreviewed queue. Submitted assessments can open a manager-controlled action form with the AI use and assessment selected. Related policies use the existing question-topic links; reading acknowledgement is not enforced. Guide explains the register, assessment, follow-up and reporting sequence.

Reports provides a due-date reference selector and current-record CSV/PDF exports. The selected date changes due/overdue calculations; it does not reconstruct historical registry, assessment or policy state. The UI states this limitation. Complete historical reporting remains a separate extension of #48.

The authenticated top bar stays compact and visible when scrolling. Account opens a desktop dropdown or mobile bottom sheet with theme, password and sign-out controls. Escape closes it and restores focus to the opener.

## Administrator configuration

Schema migration 11 adds organisation-scoped immutable configuration versions, direct account capabilities and version-pinned custom-role assignments. Back up the database before upgrading; an older application rejects this newer schema. No existing assessment definition or action history is rewritten by the migration.

Configuration permits demonstration question wording, up to twelve named capability templates and a switch controlling creation of assessment-linked actions. Every save appends a version with its administrator account, timestamp and full configuration/assessment definition. Optimistic version checks reject stale saves. The administrator can inspect each stored version in Configuration history. A new version replaces the previous version for future drafts; existing drafts and submissions retain their snapshots.

Question identifiers, types, required status, topics, applicability behavior, outcomes, scoring rules and source metadata remain fixed. Definitions remain explicitly marked as demonstrations. Sponsor-approved content activation, arbitrary question/rule editing and a visual workflow builder are not implemented. Mandatory policy reading is rejected by server validation and remains disabled.

Disabling linked actions prevents new assessment links without modifying existing actions. New action history records the configuration version used at creation. Existing server-side action state/revision validation continues to apply; completing an action never automatically reassesses or certifies an AI use.

## Effective access

The three fixed roles remain the baseline. Administrators can add only these capabilities to an account or a named template:

- `registry:create`: register an AI use.
- `registry:update`: edit and review registered uses.
- `assessment:review`: view organisation assessment work.
- `action:manage`: manage organisation actions and the existing policy/reminder operations protected by this permission.
- `report:export`: export governance records.

These grants cannot confer account/configuration administration. Effective access is the union of the fixed role, direct capabilities and the selected custom-role snapshot. Accounts displays the effective permissions and assigned template version. Removing an added capability does not remove permissions inherent in the fixed role; change the fixed role if that is intended. Policy reviewer assignment still requires an active Administrator or Compliance Officer.

Editing or retiring a custom-role template does not silently change assigned access. In Accounts, explicitly choose the latest template or remove the assignment to change access. Account changes are audited and revoke existing sessions in the same transaction. Organisation boundaries and administrator self-lockout protection remain enforced.

## Verification

The automated API coverage checks configuration scope, locked fields, concurrent saves, persistence, historical definitions, linked-action enforcement, capability grants/revocation, immutable assignments and session revocation. Browser coverage exercises administrator configuration/assignment, account menu keyboard/mobile behavior, the assessment-to-action path, required fields, responsive navigation and automated accessibility across both palettes/themes.

Final command results are recorded in the delivery PR and issue comments. Automated checks do not replace sponsor decisions, representative human usability/screen-reader testing, or independent operational/security review.

Verified on 29 September 2026 for implementation commit `64a25f0`:

- API suite: 27 passed.
- Application suites (API, configuration and domain): 71 passed.
- Production build: passed.
- Playwright: 25 passed, including the administrator configuration, access assignment and desktop/mobile menu tests.
- `git diff --check`: passed.

Playwright started its own isolated test database and server on port 5174 without a conflict; no unrelated processes were stopped. The final staff dashboard regression confirms that seven assigned open actions produce a total of seven while the preview contains five.
