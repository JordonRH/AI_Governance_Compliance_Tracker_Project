# Documentation verification - 27 September 2026

Purpose: ensure a person can run and maintain AITrace from the checked-in instructions without an AI assistant, ignored helper or pre-existing operational database.

## Environment and isolation

Verified on Windows PowerShell with Node 26.5.0, npm 11.17.0 and Git 2.55.0. A fresh local Git clone of implementation commit `8ac95f6` was created without sharing node_modules or the working database. The revised instructions were checked against this unchanged application code. Fictional accounts/data and a separate local port were used. No normal local records or certificate configuration were changed.

This was an agent-run operator verification under Jordon's direction. It is not independent human UAT, sponsor acceptance, trusted-certificate deployment or verification on macOS/Linux. Browser binaries used Playwright's normal machine cache; the browser-install command completed successfully.

## Results

| Check | Result |
| --- | --- |
| Fresh clone and `npm.cmd ci` | Passed; lockfile installation without existing dependencies |
| `npm.cmd run account:create -- ...` | Passed; new fictional Administrator in a separate database |
| `npm.cmd test` | 68 passed |
| `npm.cmd run test:e2e:install` | Passed |
| `npm.cmd run test:e2e` | 14 passed, including certificate controls and accessibility scans |
| `npm.cmd run build` | Passed |
| `npm.cmd audit` in fresh checkout | Zero reported vulnerabilities |
| Relative Markdown links/anchors | 110 checked; no missing targets |
| PowerShell documentation syntax | 20 command blocks parsed without errors |
| Explicit `node --env-file=.env server/index.js` startup | Passed; correct configured port/database and public health response |
| First Administrator browser sign-in | Passed; navigation visible and no browser page errors |
| Fictional examples and certificate staging | Passed through authenticated APIs |
| Built `server/index.js --production` serving | Passed; frontend/health and retained records verified |
| Stopped database-family copy and separate restore | Passed; credentials and three records retained |
| Staged-bundle HTTPS activation | Passed; configured server started with the generated pair |
| TLS health/login with explicit test certificate trust | Passed; verification enabled and Secure/HttpOnly session cookie observed |
| HTTP recovery after clearing TLS setting | Passed |

The verification automated the documented manual sequence with disposable local fixtures. The ignored automation is evidence tooling, not a prerequisite or a supported app command. Current runbooks contain the actual commands and expected results; a reader does not need that script.

## Documentation coverage

- README links to a complete fresh-start path and makes first-account creation explicit.
- Development covers every npm script, CLI roles/options, configuration defaults/ranges, environment-file loading, tests and troubleshooting.
- Operations covers HTTPS staging/activation/replacement/recovery, file permissions, backups/restores, emergency administrator recovery and upgrades.
- User guide covers every workspace screen, roles and a repeatable fictional-data demonstration.
- API reference covers implemented routes/payloads and a PowerShell session example.
- Contributor guidance covers local changes, verification, commits, pushes and browser-based GitHub PR creation.
- All earlier design/research/planning documents are labelled with current context or historical status; original source artifacts remain unchanged.

Human reviewers should still complete the [acceptance checklist](acceptance-checklist.md), including readability, keyboard/screen-reader use, sponsor content and handover. The macOS/Linux command equivalents need verification on those systems before claiming cross-platform acceptance. Actual storage encryption, Windows ACLs on another machine and trusted certificate installation remain operator tasks.
