# Local development

AITrace currently provides a React interface, an Express API and a SQLite-backed AI registry. Progressive implementation continues from the initial interface and backend checkpoint at Jordon's request; team review remains pending.

## Requirements

- Node.js 26.5 or later and npm. The initial build was developed with Node.js 26.5.0 and npm 11.17.0.
- A modern desktop browser.
- No separate database service is needed.

The application uses Node's built-in `node:sqlite` module. In this Node release the module is a release candidate; its API should be rechecked before changing the supported Node version. SQLite itself is public-domain software and has no licence fee.

## Start the development instance

From the repository folder:

```powershell
cd J:\AITrace
npm install
npm run dev
```

Open http://127.0.0.1:5173. The Node process runs the Express API and Vite development middleware together. React changes reload through Vite; Node watches backend imports. Press Ctrl+C in the terminal to stop the instance.

For a repeat installation from the committed lockfile, use `npm ci` in place of `npm install`.

## Build and run the built interface

```powershell
npm run build
npm run start
```

Stop the development instance first because both commands use port 5173 by default. `npm run start` serves the built React files through Express. This is still a local prototype, not a production deployment.

## Verify changes

```powershell
npm test
npm run test:e2e:install
npm run test:e2e
```

The first command exercises the API with temporary SQLite databases, including persistence after restart, validation, edits, filters and local-origin restrictions. The browser tests exercise the registry flow and responsive layout. Chromium needs downloading only on first use or after a Playwright browser update.

Browser tests launch their own server on port 5174 and use a separate temporary database. They do not modify `data/aitrace.sqlite`. Playwright traces and failure artifacts are written to `test-results/playwright/`; review screenshots are written to `test-results/`. Both are excluded from Git.

## Local data

The application creates `data/aitrace.sqlite` on first start. Records persist after refresh and restart. The database and its journal files are excluded from Git.

The initial registry is empty. Use **Load fictional examples** in the interface to add three demonstration records. Repeating this action neither duplicates those records nor overwrites edits to them.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5173` | Local server port |
| `DATABASE_PATH` | `data/aitrace.sqlite` in the repo | Alternate SQLite file, preferably an absolute path |

For example, use a separate file for a review session:

```powershell
$env:DATABASE_PATH = 'J:\AITrace\data\review.sqlite'
npm run dev
```

Environment variables apply to that terminal session. Use `Remove-Item Env:DATABASE_PATH` to return to the default. The application does not automatically load `.env` files. `.env.example` documents supported non-secret settings; keep actual local values in ignored `.env` files or the process environment. Unknown `AITRACE_` variables and invalid values stop startup so misspelled security settings cannot be silently ignored.

## Current limitations

The server binds to `127.0.0.1`. Authentication and role-based permissions are not implemented. Anyone able to access the local instance can view and edit its records. Use fictional information only. Origin and host checks reduce cross-site access; they are not a substitute for authentication.

Records have a single category, a responsible-person/team text field and a plain-language data description. These are initial UI choices for review, not a final institutional data model. There is no approval workflow, sensitive-data classification catalogue, audit history or deletion function yet.

Every record is shown as **Not assessed**. No governance scores, recommendations or compliance claims are generated. Overview totals are registry counts, not governance results.

## Troubleshooting

- If port 5173 is occupied, stop the existing instance or set `PORT` in the terminal.
- If the built start command reports missing files, run `npm run build` first.
- If browser tests report a missing executable, run `npm run test:e2e:install`.
- If SQLite cannot open the file, check write permission for the database directory.
- If the interface reports an API error, use its retry action and check the terminal output.

## Sources

- [SQLite copyright and public-domain dedication](https://www.sqlite.org/copyright.html)
- [Node.js SQLite module](https://nodejs.org/api/sqlite.html)
- [Vite getting started](https://vite.dev/guide/)
- [Express](https://expressjs.com/)

## Temporary theme and record details

The top-bar **Dark theme** button switches appearance. Light remains the default. Its pressed state indicates whether dark mode is enabled. The browser preference is stored under `aitrace-theme`; if storage is blocked, switching still works for the current page session. This temporary feature was requested by Jordon and is not a sponsor requirement.

Select a record name in the overview or registry to open read-only details. Use **Edit record** to change it. Close or Escape dismisses the details and restores focus to the record button. The existing row Edit action remains available.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` for the documented commands without changing execution policy. Keep the development watch scope restricted to `--watch-path=./server`.


## Create the first local account

The application does not contain a default password. Create an organisation administrator explicitly:

```powershell
$env:AITRACE_ACCOUNT_PASSWORD = 'choose-a-long-local-password'
npm.cmd run account:create -- --organization-id demo-sme --organization-name "Fictional Demonstration SME" --login admin@example.test --display-name "Local Administrator" --role administrator
Remove-Item Env:AITRACE_ACCOUNT_PASSWORD
```

Use at least 12 characters. Supported roles are `administrator`, `compliance_officer` and `staff_user`. Use fictional identities for development. Existing schema-version-1 data migrates into the `legacy-local` organisation; create its account with `--organization-id legacy-local` to access those records.
