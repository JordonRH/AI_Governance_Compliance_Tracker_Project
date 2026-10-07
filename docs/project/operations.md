# Local operations runbook

Use this after [first setup](development.md). Commands are Windows PowerShell examples run at the repository root. No AI assistant or external service is required. Run a single application instance per operational database. Only fictional/de-identified capstone data is supported.

## Daily start and stop

Start `npm.cmd run dev` for editing, or `npm.cmd run build` followed by `npm.cmd start` for built assets. Keep the terminal open. Visit the URL printed at startup. Stop with Ctrl+C in that terminal and wait for the prompt before backups, configuration changes or upgrading. Do not terminate every Node process: other applications may use Node.

If the default port is occupied, choose a new one with `$env:PORT = '5180'` and restart. The browser URL must use that port. Do not use `0.0.0.0`: network-wide hosting is not supported. A second browser profile/private window can test a different account without signing out the first.

## Temporary certificates and HTTPS

1. Sign in as Administrator and open **Certificates**. Select **Generate temporary certificate**. Expect a temporary/self-signed label, expiry around 30 days away and an activation path. Generation stages files; it does not change the active connection.
2. Copy the displayed JSON bundle path. Keep it private; it contains the certificate **and private key**. Default storage is ignored `data/certificates/`. Keep the server account as the only ordinary account with access; SYSTEM/authorised operators may also need access.
3. Stop the app. In its terminal, set the bundle path and remove alternative PEM settings:

```powershell
$env:AITRACE_TLS_BUNDLE_PATH = Read-Host 'Paste the certificate bundle path from Certificates'
if (-not (Test-Path -LiteralPath $env:AITRACE_TLS_BUNDLE_PATH -PathType Leaf)) { throw 'Bundle file not found.' }
Remove-Item Env:AITRACE_TLS_CERT_PATH, Env:AITRACE_TLS_KEY_PATH -ErrorAction SilentlyContinue
npm.cmd run dev
```

Expected startup URL: `https://127.0.0.1:5173` (or your PORT). Use HTTPS explicitly. Sign in again; a secure cookie is now used. The Certificates page should show HTTPS and **Matches the running server**. A self-signed certificate causes a browser trust warning unless an authorised operator has configured trust. It is not a publicly trusted certificate. The app never installs trust automatically.

To verify encryption and identity against the exact staged certificate without turning off certificate checks, use a second terminal. This exports only the public certificate:

```powershell
$bundlePath = Read-Host 'Paste the active bundle path'
$publicCertPath = Join-Path (Split-Path -Parent $bundlePath) 'local-public-cert.pem'
$publicCert = (Get-Content -Raw -LiteralPath $bundlePath | ConvertFrom-Json).cert
[IO.File]::WriteAllText($publicCertPath, $publicCert, [Text.UTF8Encoding]::new($false))
curl.exe --fail --cacert $publicCertPath https://127.0.0.1:5173/api/health
Remove-Variable publicCert
```

Adjust the URL for PORT. Expected: health JSON with `status: ok`. This verifies this certificate explicitly; it does not establish browser/OS trust. Do not use global TLS-verification bypasses. The browser Network/Application developer tools can confirm the login cookie has HttpOnly, Secure and SameSite=Strict.

### Replacement and expiry

While HTTPS is active, use **Certificates > Replace certificate** to select a PEM certificate chain and its matching unencrypted PEM private key. Both `localhost` and `127.0.0.1` must be covered. The certificate must be valid now; chain limit is 20,000 characters and key limit 12,000. Encrypted/password-protected keys are unsupported. The app validates the pair before replacing the staged bundle. Restart to load it; confirm the page's fingerprint match and check trust again. The same process can regenerate a temporary pair before expiry. The old live certificate remains in memory until restart.

A replacement bundle overwrites the staged file. If you need rollback, make a protected copy **before** replacement and retain it only under the agreed key-retention policy. No private-key download API exists.

If an expired/broken certificate prevents startup, stop the process, remove the bundle/PEM variables (and their entries in any loaded `.env`), then restart in loopback HTTP mode to generate a new temporary pair. Do not send a real replacement key over an untrusted network. For local HTTP recovery:

```powershell
Remove-Item Env:AITRACE_TLS_BUNDLE_PATH, Env:AITRACE_TLS_CERT_PATH, Env:AITRACE_TLS_KEY_PATH -ErrorAction SilentlyContinue
npm.cmd run dev
```

Switch to `http://127.0.0.1:5173`; old Secure cookies may require signing out or clearing **only AITrace's site cookies**. Re-enable HTTPS after staging a valid pair. Alternatively, an operator can configure both `AITRACE_TLS_CERT_PATH` and `AITRACE_TLS_KEY_PATH` to existing matching PEM files, with the bundle variable cleared. All modes remain loopback-only.

### Protecting certificate files

On Windows, use the folder's **Properties > Security > Advanced** controls to restrict access to the server account and necessary system/operator identities. Record the resulting ACL and recovery ownership. On macOS/Linux, restrict the private directory to the server user (`chmod 700 <directory>`) and bundles to that user (`chmod 600 <bundle>`). Replace placeholders with verified paths. Generation requests Unix owner-only modes; Windows requires its own ACL. Protect the database, certificates, backups and exports with the storage policy in [security configuration](security-configuration.md). Do not commit or share a private bundle.

## Backup without modifying the working database

Stop **all instances using this database** first. Choose a protected backup location, preferably on the approved encrypted storage. The example defaults to ignored local `data/backups/`; it is a convenience, not proof of encrypted storage or protection against disk failure.

```powershell
$databaseFile = (Resolve-Path -LiteralPath 'data/aitrace.sqlite').Path
$backupDirectory = Join-Path (Join-Path $PWD 'data/backups') (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $backupDirectory -ErrorAction Stop | Out-Null
foreach ($suffix in @('', '-wal', '-shm')) {
    $sourceFile = $databaseFile + $suffix
    if (Test-Path -LiteralPath $sourceFile) { Copy-Item -LiteralPath $sourceFile -Destination $backupDirectory -ErrorAction Stop }
}
Get-ChildItem -LiteralPath $backupDirectory | Select-Object Name, Length
```

Use the actual custom DATABASE_PATH instead of the default if configured. Include the entire database file family; copying only the main file during live WAL writes is unsafe. Record the Git commit (`git rev-parse HEAD`), schema version (currently 10), date and configuration paths with the backup. Record secret/key locations separately under access control; do not paste private material into tickets. Policy files and app account/session/history data are inside SQLite. Certificate bundles are outside SQLite and need their own protected backup when required.

## Restore test and recovery

Restore into a **new directory**, never over your sole working copy. Stop the app before copying. Retain the original and backup until verification is complete.

```powershell
$backupDirectory = Read-Host 'Full path of the database backup directory'
$restoreDirectory = Join-Path (Join-Path $PWD 'data') ('restore-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $restoreDirectory -ErrorAction Stop | Out-Null
Copy-Item -LiteralPath (Join-Path $backupDirectory 'aitrace.sqlite') -Destination $restoreDirectory -ErrorAction Stop
foreach ($name in @('aitrace.sqlite-wal', 'aitrace.sqlite-shm')) {
    $sourceFile = Join-Path $backupDirectory $name
    if (Test-Path -LiteralPath $sourceFile) { Copy-Item -LiteralPath $sourceFile -Destination $restoreDirectory -ErrorAction Stop }
}
$env:DATABASE_PATH = Join-Path $restoreDirectory 'aitrace.sqlite'
$env:PORT = '5181'
npm.cmd start
```

This example assumes the default filename; substitute your actual filename consistently if different. It requires an existing frontend build. Use the printed protocol/port, sign in using an account from that backup, and verify registry/history, assessments, action owners, policy downloads and settings. Do not bootstrap over a failed restore to hide missing accounts. Stop, then remove DATABASE_PATH/PORT overrides before returning to normal operation. Migrations happen at startup; there is no automatic downgrade. Pair an older backup with the matching application version.

For a clean demonstration, use a new `DATABASE_PATH`, bootstrap its first Administrator and load examples. Do not delete the working database to reset a demo. No record deletion/archive or retention-purge command exists.

## Administrator access recovery

Normal recovery is another Administrator using **Accounts > Manage > Reset password**. This revokes sessions and forces password rotation. There is no public password-reset email service.

If no Administrator can sign in, an authorised operator with local database access can create a temporary recovery Administrator using the documented account CLI. Stop the app, set the correct DATABASE_PATH, and identify the existing organisation IDs without altering data:

```powershell
node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.env.DATABASE_PATH || 'data/aitrace.sqlite',{readOnly:true}); console.table(db.prepare('SELECT id,name FROM organizations').all()); db.close();"
```

Use the hidden password prompt in [development](development.md), with the existing organisation ID/name, a new unique login such as `recovery-admin`, and role `administrator`. Restart, sign in, reset the original administrator's password, then sign in as that original administrator and disable the temporary recovery account. Do not edit password hashes manually. Record the recovery action and operator/date in the appropriate private operational record.

## Reminders and files

The scheduler runs once at startup and then every configured interval. **Notifications > Check reminders now** runs it manually for the current organisation. Administrator settings control enabled state and lead/repeat days (1-365, defaults 7). Dates use UTC: upcoming reminders fire on the configured lead day, due reminders on the due day, and overdue reminders follow the repeat schedule. It does not backfill every missed day while the app was stopped. A closed action or obsolete policy version is not eligible; an active account owner/reviewer is required. Delivery is in-app only; no mail credentials are needed.

Review server-terminal errors and the Notifications page when delivery is missing. Avoid adding real personal data to test a failure. Policy uploads accept PDF or UTF-8 text up to 1 MiB; export reports from Registry and inspect downloads using an ordinary PDF reader/spreadsheet application. There is no separate document-conversion service to run.

## Upgrade and rollback

1. Stop the app and back up its database plus any needed certificate bundles.
2. Check `git status --short`; preserve your edits before switching branches or pulling.
3. For a clean main checkout, run `git switch main`, `git pull --ff-only`, then `npm.cmd ci`.
4. Run the verification commands in development.md and `npm.cmd run build`.
5. Start with the intended configuration, check health, sign in and inspect representative records.
6. If rollback is needed, use the recorded prior code version and a protected copy of its matching pre-upgrade database. Do not force old code to open a newer schema or overwrite the only backup.

A checkout/update does not carry credentials, local data, browser installations or certificate trust from another developer's machine. Those are explicit local setup tasks.

## Portable database export

The current application uses SQLite. Render free storage is ephemeral, so keep a portable export before changing
deployment or database providers. Stop the application first and run:

    New-Item -ItemType Directory -Path data/exports -Force | Out-Null
    npm.cmd run database:export -- data/exports/aitrace-portable.json

The export contains every application table, schema version, timestamps and binary policy content encoded as
base64. It contains account password hashes and governance records, so protect it like the database and never commit
or upload it to a public location. This is a migration interchange file, not a backup substitute.

The planned hosted database target is standard PostgreSQL, preferably a Supabase project for this showcase because
it provides a managed PostgreSQL database and an accessible SQL dashboard. The application should be migrated
through a PostgreSQL adapter and versioned SQL migrations; do not point the current SQLite-only runtime at a
PostgreSQL connection string. After migration, use pg_dump to create a provider-independent PostgreSQL dump.

To import a protected export into the already-created Supabase schema, set DATABASE_URL only in the local process
and run:

    $env:DATABASE_URL = Read-Host 'Supabase PostgreSQL connection string'
    npm.cmd run database:import:postgres -- data/exports/aitrace-portable.json
    Remove-Item Env:DATABASE_URL

The importer inserts in foreign-key order, preserves account hashes and audit history, converts JSON fields to jsonb,
and converts policy content to bytea. It is idempotent for existing primary/unique keys. Verify row counts and sign-in
before switching Render traffic. The importer does not print the connection string.

## Render deployment

AITrace can run as a Render Node web service. Use `render.yaml` or configure these values in the Render dashboard:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- `AITRACE_BIND_HOST=0.0.0.0`
- `DATABASE_PATH=/var/data/aitrace.sqlite`

Attach a persistent disk mounted at `/var/data`; Render filesystems are otherwise ephemeral. Render supplies `RENDER_EXTERNAL_HOSTNAME`, which AITrace automatically adds to its allowed hostnames. Keep the service behind Render HTTPS and do not configure local Tailscale settings for this deployment. Create the first administrator through the supported account bootstrap process, then verify login, registry persistence, assessment submission, policy uploads, action history, reports, and restart recovery.
