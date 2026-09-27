# Local setup and command reference

Current as of 27 September 2026. Run all commands from the repository root unless a different directory is specified. You do not need AI tools, paid services, Docker, a separate database server, Python or OpenSSL. SQLite is included in Node. Current tested environment: Windows PowerShell, Node 26.5.0, npm 11.17.0 and Git 2.55.0. POSIX shell equivalents below are provided for macOS/Linux; they have not been verified on those operating systems in this handover.

## Prerequisites and checkout

Install Git and Node.js 26.5+ (including npm) using your organisation's approved installer. Close/reopen the terminal after installation. A supported desktop browser is required. Package/browser downloads need internet access; normal local runtime uses no AI or cloud service.

```powershell
git --version
node --version
npm.cmd --version
git clone https://github.com/JordonRH/AI_Governance_Compliance_Tracker_Project.git
cd AI_Governance_Compliance_Tracker_Project
```

PR #40 has merged the application into `main`; use main for a normal checkout. To review an unmerged documentation PR, switch to its named head branch explicitly. If GitHub asks for access, sign in with an account authorised for the repository through your Git credential manager. Do not paste a password/token into a clone URL or tracked file.

Install the exact lockfile dependencies:

```powershell
npm.cmd ci
```

Expected: installation completes with exit code 0 and creates `node_modules/`. Use `npm ci` for existing checkouts; `npm install <package>` is for intentional dependency changes. Do not run a global Vite/Express install.

## First Administrator (Windows PowerShell)

A new database has no default credentials. Run this block once, choosing a password of 12-200 characters when prompted. Password entry is hidden and is not part of terminal command history.

```powershell
$bootstrapSecret = Read-Host 'New Administrator password (12-200 characters)' -AsSecureString
$bootstrapPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bootstrapSecret)
try {
    $env:AITRACE_ACCOUNT_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bootstrapPointer)
    npm.cmd run account:create -- --organization-id demo-sme --organization-name "Fictional SME" --login demo-admin --display-name "Demo Administrator" --role administrator
    if ($LASTEXITCODE -ne 0) { throw 'Account creation failed; read the error above.' }
} finally {
    Remove-Item Env:AITRACE_ACCOUNT_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bootstrapPointer)
    Remove-Variable bootstrapSecret, bootstrapPointer -ErrorAction SilentlyContinue
}
```

Expected: `Created account <id> for demo-admin.` The database directory is created automatically. Sign in with `demo-admin` and the password you chose. Do not repeat creation with the same login: logins are unique across the database. Existing databases keep their own credentials; cloning never copies someone else's account.

The five named CLI options are all required. Supported roles: `administrator`, `compliance_officer`, `staff_user`. Use **Accounts** for subsequent accounts in the same organisation. To bootstrap a second organisation, use a different organisation ID/name and a globally unique login. Reusing an organisation ID adds an account to that organisation; it does not rename it.

For a custom database, set `DATABASE_PATH` before **both** account creation and server start. Do not use `:memory:` for a persistent login: the separate bootstrap process cannot share an in-memory database with the server. Clear `AITRACE_ACCOUNT_PASSWORD` before starting the server; it is a CLI-only variable and runtime configuration rejects it.

## Start, check and stop

```powershell
npm.cmd run dev
```

Wait for `AITrace local prototype: http://127.0.0.1:5173`, then open that URL and sign in. Leave the terminal running. Vite refreshes frontend changes; Node restarts for changes under `server/`. Stop by pressing **Ctrl+C** in that terminal and wait for the prompt. The reminder scheduler stops with the server. A development restart does not clear your database.

In a second terminal, check the public health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:5173/api/health
```

Expected JSON fields: `status: ok`, `mode: local-prototype`. From Registry, **Load fictional examples** adds three demonstration records and is safe to repeat. There is no separate seed command. Follow the [user guide](user-guide.md) to run every workflow.

To serve built assets, stop the development server first:

```powershell
npm.cmd run build
npm.cmd start
```

Build creates `dist/`; start serves it on the same configured port. Rebuild after changing frontend source. Starting without a build fails with `Run npm run build before npm run start.` The production flag is a serving mode, not a claim of production readiness.

## macOS/Linux shell equivalents

Use `npm` wherever Windows examples use `npm.cmd`. Clone and change directory as above, then in Bash:

```bash
npm ci
read -r -s -p 'New Administrator password (12-200 characters): ' AITRACE_ACCOUNT_PASSWORD
printf '\n'
export AITRACE_ACCOUNT_PASSWORD
npm run account:create -- --organization-id demo-sme --organization-name "Fictional SME" --login demo-admin --display-name "Demo Administrator" --role administrator
unset AITRACE_ACCOUNT_PASSWORD
npm run dev
```

Only start after account creation succeeds. Stop with Ctrl+C. Use `curl --fail http://127.0.0.1:5173/api/health` for health. Environment settings use `export PORT=5180` / `unset PORT`. Build/start/test commands otherwise match Windows. Filesystem paths and permission commands differ; see [operations](operations.md).

## Configuration

The app reads the process environment. Copying `.env.example` to `.env` does **not** make npm scripts load it. Choose one of these methods:

```powershell
# Session-only example; use the same session for bootstrap and server.
$env:PORT = '5180'
$env:DATABASE_PATH = 'data/demo.sqlite'
npm.cmd run dev
# After stopping, remove overrides to return to defaults.
Remove-Item Env:PORT, Env:DATABASE_PATH -ErrorAction SilentlyContinue
```

Or explicitly load an ignored file:

```powershell
Copy-Item .env.example .env
# Edit .env in a text editor, then choose ONE start command:
node --env-file=.env --watch-path=./server server/index.js
# After stopping dev and running npm.cmd run build:
node --env-file=.env server/index.js --production
```

For bootstrap with `.env`, set the password using the hidden prompt above, replace only the npm bootstrap command with `node --env-file=.env server/create-account.js --organization-id demo-sme --organization-name "Fictional SME" --login demo-admin --display-name "Demo Administrator" --role administrator`, then clear the password as shown. Never save it in `.env`. Existing process environment values override file values. Avoid mixing configuration sources unintentionally.

| Setting | Default | Valid values / purpose |
| --- | --- | --- |
| PORT | 5173 | Integer 1-65535; normally use an available unprivileged port |
| DATABASE_PATH | data/aitrace.sqlite | SQLite path; absolute recommended for operational data |
| AITRACE_BIND_HOST | 127.0.0.1 | Only this bind address is supported |
| AITRACE_REQUEST_BODY_LIMIT_BYTES | 32768 | Integer 1024-1048576; normal JSON limit |
| AITRACE_REMINDER_INTERVAL_MS | 60000 | Integer 1000-86400000; scheduler interval |
| AITRACE_LOGIN_MAX_ATTEMPTS | 10 | Integer 1-100; login/password attempt threshold |
| AITRACE_LOGIN_WINDOW_MS | 900000 | Integer 1000-86400000; in-memory throttling window |
| AITRACE_TLS_CERT_PATH / AITRACE_TLS_KEY_PATH | unset | Both PEM paths required; cannot combine with bundle |
| AITRACE_CERTIFICATES_DIR | data/certificates | Private certificate staging directory |
| AITRACE_TLS_BUNDLE_PATH | unset | Administrator-staged JSON pair, loaded on restart |
| AITRACE_ACCOUNT_PASSWORD | unset | Account CLI only; remove before server start |

Unknown `AITRACE_` variables fail startup. Relative server paths resolve from the repo root; the account CLI resolves its database from the working directory, so always run it at the root. Policy uploads have a separate 1500 KB encoded-request limit and 1 MiB decoded-file limit. Certificate PEM limits are 20,000 characters for the chain and 12,000 for the key, subject to the normal request limit. Appearance and reminder lead/repeat days are configured in the app. Reminder calculations use UTC calendar dates.

## Verification

Every supported npm script:

| Command (PowerShell) | What it does / expected result |
| --- | --- |
| `npm.cmd ci` | Installs lockfile dependencies; no data/account creation |
| `npm.cmd run dev` | Starts watched HTTP(S)/Vite server; runs until Ctrl+C |
| `npm.cmd run build` | Compiles frontend into ignored `dist/`; exits successfully |
| `npm.cmd start` | Runs built frontend/API; requires build; runs until Ctrl+C |
| `npm.cmd run account:create -- <options>` | Creates an account using the five options above |
| `npm.cmd test` | Runs domain/API/config tests using disposable data |
| `npm.cmd run test:e2e:install` | Downloads Playwright Chromium, normally once per Playwright version |
| `npm.cmd run test:e2e` | Starts isolated server on 5174, runs browser tests, stops it |
| `npm.cmd audit` | Queries dependency advisories; network required; findings can change |

Run release verification in this order, checking that each command succeeds:

```powershell
npm.cmd test
npm.cmd run test:e2e:install
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit
```

The 27 September baseline has 68 application tests and 14 browser tests. Counts may grow with subsequent changes. API tests use temporary databases. Browser tests create a temporary database and certificate directory; they never seed your normal local database. The browser runner needs port **5174** free, a writable OS temporary directory and Chromium. On Linux, missing system browser libraries may require `npx playwright install --with-deps chromium` under your system's normal package-install permissions.

Run a focused check or inspect a failure without AI assistance:

```powershell
node --test tests/config/certificates.test.js
npx.cmd playwright test tests/e2e/certificates.spec.js --headed
npx.cmd playwright test --reporter=html
npx.cmd playwright show-report
# Replace the path with the actual failing test's trace path printed by Playwright:
npx.cmd playwright show-trace "test-results/playwright/<failed-test>/trace.zip"
```

Default output is in the terminal; traces/screenshots are under ignored `test-results/playwright/`. The optional HTML report is under ignored `playwright-report/`. Close trace/report viewers before rerunning if Windows reports a locked output file. These diagnostic commands are optional; the normal suite is headless. `server/e2e-server.js` is a runner fixture, not a normal start command: it requires a disposable `DATABASE_PATH` and intentionally creates a fictional account. Other server/domain/source files are imported modules, not separate services to launch.

## Troubleshooting

| Symptom | What to check / do |
| --- | --- |
| `node:sqlite` or engine error | `node --version` must be 26.5+; reopen terminal after installing Node |
| `npm.ps1 cannot be loaded` | Use `npm.cmd` / `npx.cmd`; no execution-policy change is needed |
| Dependencies missing | Run `npm.cmd ci` from the root; check network/proxy access for registry downloads |
| Port already in use | Stop your earlier terminal's server or change PORT; never kill unrelated processes |
| Sign-in rejected after bootstrap | Check the same DATABASE_PATH was used, account login/password and active status |
| Unique login constraint | Account already exists; use it or create a different login; do not erase the database |
| Unknown AITrace setting | Remove the misspelt variable; especially clear CLI-only AITRACE_ACCOUNT_PASSWORD |
| Browser executable missing | Run `npm.cmd run test:e2e:install`; on Linux also check system libraries |
| Browser server cannot start | Free port 5174; clear inherited TLS/PORT overrides in the test terminal |
| Request exceeds limit | Respect file limits; restore normal body limit if set too low for certificate upload |
| Required password change | Use the supplied reset password as current password in My password, then sign in again |
| No reminders | Assign an active account, verify UTC dates and settings, then Check reminders now |
| HTTPS startup fails | Check readable paths, paired settings, validity and hostname/key match; see operations |
| Schema newer than app | Use the corresponding newer code or restore a matching backup; no downgrade migration exists |
| Windows test output locked | Close viewers/editors on output artifacts and rerun; keep personal files out of disposable output |

For backups, restore, emergency admin access, HTTPS activation/rollback and upgrades, follow [operations](operations.md). For editing code and opening PRs, follow [contributing](contributing.md).
