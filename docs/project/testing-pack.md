# Fictional accounts and configuration test pack

Use `testing:seed` to add the test pack to an existing local demonstration organisation. It creates 18 accounts, eight saved configuration variants, five capability-role templates in every variant, and a fictional policy for acknowledgement testing. It does not activate a version or reset an existing password. Related delivery: issue #53 and PR #52.

## Run the command

Start from a configured checkout with dependencies installed and an initialized database/organisation; see [development](development.md). The normal database is `data/aitrace.sqlite`; `DATABASE_PATH` selects another existing database. This command requires the current schema and does not perform migrations.

The local demonstration organisation in this workspace is `local-demo-sme`. Choose the actual existing organisation ID for another installation; IDs are not display names.

```powershell
$env:AITRACE_ACCOUNT_PASSWORD = Read-Host 'Shared test password (12 to 200 characters)'
try {
    npm.cmd run testing:seed -- --organization-id local-demo-sme
    if ($LASTEXITCODE -ne 0) { throw 'Test setup failed; review the error before continuing.' }
} finally {
    Remove-Item Env:AITRACE_ACCOUNT_PASSWORD -ErrorAction SilentlyContinue
}
```

Supply the same shared password when repeating the command. The password is neither hard-coded nor written to output files. Existing accounts whose identity, fixed role, access, status or password differs are rejected, not overwritten. Logins are unique across organisations, so the same pack cannot be assigned to a second organisation in the same database. Use another demonstration database for that case.

The command creates a consistent SQLite backup before seeding and uses the application's validation/API paths for configurations, policies and capability changes. It verifies every login, role, extra capability and report access, then revokes only its own verification sessions. Existing user sessions remain in place. A temporary loopback server uses an available port and closes when the command finishes; the normal app need not be stopped.

By default, the output is a `testing` directory next to the database: `data/testing/catalogue.md`, `manifest.json` and a uniquely named pre-seed backup. The catalogue maps scenario names to the actual saved version numbers. Set `--output-dir <local-directory>` to choose another location. Keep these generated files local; only the reusable fixture definitions, command, tests and instructions belong in Git.

The command is repeatable: matching account profiles and saved configurations are reused, the linked fictional policy is not duplicated, and the active configuration/lifecycle is preserved. It does not reset modified test profiles. If a run fails after partial creation, inspect the error and backup, resolve the conflict and rerun; account/configuration mutations use their individual application transactions rather than one global transaction.

## Accounts

All new accounts use the password supplied to the command. Existing accounts outside this pack are unchanged.

| Login | Fixed role | Additional capabilities |
| --- | --- | --- |
| `test.admin`, `test.admin2` | Administrator | Fixed-role permissions |
| `test.compliance`, `test.finance`, `test.policy`, `test.education` | Compliance Officer | Fixed-role permissions |
| `test.staff1`, `test.staff2`, `test.staff3` | Staff User | None |
| `test.research`, `test.service`, `test.disclosure` | Staff User | None |
| `test.actions` | Staff User | Manage actions |
| `test.assessments` | Staff User | Review assessments |
| `test.reports` | Staff User | View/export reports |
| `test.intake` | Staff User | Register AI uses |
| `test.registry` | Staff User | Update registry records |
| `test.manager` | Staff User | All five bounded capabilities; no administration |

The specialised profiles use direct capabilities so they work without changing activation. The saved templates are Action manager, Assessment reviewer, Reporting analyst, Registry editor and Governance manager. Activate a variant before assigning one of its templates from Accounts.

## Configuration variants

Open **Configuration > Version history** and expand the version from the generated catalogue. Additional question topics identify the `TEST scenario`. Enter a change reference and activate the version to use it for new work. Existing assessment/action snapshots retain their settings.

| Scenario | Business areas | Policy acknowledgement | In Progress before completion | Reopen | Assessment-linked actions |
| --- | --- | --- | --- | --- | --- |
| Everyday quick intake | All | Optional | No | Yes | Yes |
| Evidence-first review | All | Optional | Yes | Yes | Yes |
| Policy-gated assessment | All | Required | Yes | Yes | Yes |
| Finance safeguards | Finance | Required | Yes | No | Yes |
| Research sandbox | Research, Product development | Optional | No | Yes | Yes |
| Education oversight | Education | Required | Yes | Yes | Yes |
| Customer service handoff | Customer service | Optional | Yes | Yes | Yes |
| Controlled standalone completion | All | Required | Yes | No | No |

Variants have different required/optional evidence questions. Area-specific variants require an exact matching Registry business area. The four synthetic scoring inputs/rules are unchanged. The fictional policy links to all four core questions and is assigned to `test.policy`; its review date is one year from creation.

## Verification and boundaries

`node --test tests/config/testing-seed.test.js` exercises first/repeated runs, backups, account/activation preservation, session cleanup, password mismatch, reserved-login collisions and command prerequisites using disposable databases. The seed's own API checks cover account and report permissions.

The accounts, questions, roles and policy are fictional test fixtures. They do not assert legal compliance, sponsor sign-off, human UAT or production-security acceptance. See [user guide](user-guide.md) for the workflows and [operations](operations.md) for backup/restore.
