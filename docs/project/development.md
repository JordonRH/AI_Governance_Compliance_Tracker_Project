# Local development and handover

## Setup

Use Node.js 26.5+ and npm. Install with `npm ci`, then `npm run dev`. On Windows where PowerShell blocks npm.ps1, use `npm.cmd` for these commands. Open http://127.0.0.1:5173. Stop with Ctrl+C. One Node process serves Express and Vite; backend changes restart the watched process.

A new checkout has no default credentials. Bootstrap the first Administrator using an operator-chosen password:

```powershell
$env:AITRACE_ACCOUNT_PASSWORD = '<choose a unique password of at least 12 characters>'
npm.cmd run account:create -- --organization-id demo-sme --organization-name "Fictional SME" --login demo-admin --display-name "Demo Administrator" --role administrator
Remove-Item Env:AITRACE_ACCOUNT_PASSWORD
npm.cmd run dev
```

Do not put a real password in tracked documentation. Additional accounts can be created from **Accounts**. Existing local databases retain their credentials; repo clones do not copy them.

For a built instance, stop dev, run `npm run build`, then `npm run start`. The production flag selects built assets and a stricter script CSP; it does not mean that pilot/production security has been accepted.

## Configuration

The app reads process environment variables. `.env.example` is a reference and is not automatically loaded.

| Setting | Default | Meaning |
| --- | --- | --- |
| PORT | 5173 | Loopback port |
| DATABASE_PATH | data/aitrace.sqlite | SQLite file; use an absolute path for a separate demo |
| AITRACE_BIND_HOST | 127.0.0.1 | Only loopback is supported |
| AITRACE_REQUEST_BODY_LIMIT_BYTES | 32768 | Normal JSON request limit |
| AITRACE_REMINDER_INTERVAL_MS | 60000 | Reminder scheduler interval while server runs |
| AITRACE_LOGIN_MAX_ATTEMPTS | 10 | Failure/attempt threshold per login and connection address |
| AITRACE_LOGIN_WINDOW_MS | 900000 | Throttling window |
| AITRACE_TLS_CERT_PATH / AITRACE_TLS_KEY_PATH | unset | Pair of PEM files enabling HTTPS and Secure cookies |

Policy uploads use a separate 1500 KB encoded-request limit and a 1 MiB decoded-file limit. Supported policy formats are PDF and UTF-8 text. Organisation appearance and reminder lead/repeat days are configured in the app, persisted in SQLite.

## Verification

```powershell
npm.cmd test
npm.cmd run test:e2e:install
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit
```

Browser tests start an isolated server on port 5174 with a temporary database. API tests use disposable databases and fictional fixtures. Browser traces/screenshots are in ignored `test-results/playwright/`. They do not mutate your normal local records.

## Data, migrations and backup

Schema version 10 stores accounts, sessions, registry records, assessments and immutable submitted results, actions/history, policy versions/blobs, notifications, reminder settings, and account/registry audit events. Migrations run automatically and preserve older records. A database newer than the app is rejected.

Use a separate `DATABASE_PATH` for demonstrations. Stop the app before a file-level backup or use a SQLite-consistent backup mechanism; never assume copying only the database while WAL writes are active is safe. Verify restores against a disposable path. Local databases, files, session tokens, logs and secrets are not committed.

## Current limitations

The complete prototype workflow is implemented with explicitly labelled synthetic assessment questions/rules. Sponsor-approved framework interpretations and score thresholds remain pending. Delivery is in-app, not email, and requires the server to run. Free-text legacy action owners must be assigned to accounts to receive reminders. New policy versions retain prior files; there is no retention/deletion policy yet. Report fonts cover the bundled Latin subset.

TLS is optional and not enabled on the normal HTTP instance. Database contents are not application-encrypted. Follow the [security configuration and verification plan](security-configuration.md) before claiming encrypted storage or trusted HTTPS. Human SME usability/UAT, independent review and sponsor acceptance remain outstanding.

## Troubleshooting

- Port in use: stop the previous instance or choose another PORT.
- Browser unavailable: run `npm run test:e2e:install`.
- Invalid configuration: clear unknown AITRACE variables and check paired TLS paths.
- Forced password change: use the administrator-supplied reset password as the current password, choose a new password, then sign in again.
- No reminders: check assigned active accounts, review dates, enabled settings and the Notifications page; **Check reminders now** reruns delivery without duplicates.
- Missing account after a clone: bootstrap an account in that checkout's database.

See the [user guide](user-guide.md), [architecture](architecture.md), and [acceptance checklist](acceptance-checklist.md).
