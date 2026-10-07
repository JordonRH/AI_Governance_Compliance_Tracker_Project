# AITrace agent project context

## Product story

AITrace turns an AI-use declaration into accountable governance work:

**Discover → Assess → Read and acknowledge → Decide → Create actions → Complete actions → Report and improve.**

The Registry is the system of record. An assessment is a versioned decision record. Policies provide version-specific evidence. Actions turn findings into assigned work. The dashboard is the daily queue. Reports reconstruct point-in-time and period views.

## Current product shape

- Registry supports formal AI-use records and staff disclosures.
- Assessments support drafts, immutable submissions, explainable synthetic outcomes, and historical definitions.
- Policies link through checklist topics and can require exact-version acknowledgement when configured.
- Actions retain owners, due dates, assessment links, status history, and workflow provenance.
- Configuration is versioned and admin-controlled; workflow automation is bounded to validated assessment-submission rules.
- Accounts expose effective permissions; access changes are audited and revoke sessions.
- Reports support multiple views, charts, tables, point-in-time dates, periods, CSV, and PDF exports.
- The application can run locally, through Tailscale Serve, or as a Render Web Service.

## Boundaries

Use fictional or de-identified data. Treat demo assessment rules as synthetic. Keep mandatory policy reading disabled until the configured governance decision requires it. Keep workflow configuration bounded and server-validated; preserve historical snapshots and audit evidence. Do not claim legal compliance, production security, sponsor acceptance, or UAT completion from automated tests.

## Continuation checklist

When resuming from another device or chat:

1. Read this file and `AGENTS.md`.
2. Check the current branch, remote status, and uncommitted changes.
3. Read the latest commits and the relevant issue/PR before editing.
4. Treat the repository, tests, and committed documentation as the shared context; do not rely on an old chat transcript.
5. State the intended user-visible outcome, implement it, test it, and record the result in the branch/PR.

## Deployment context

Local development defaults to loopback. Render production uses `AITRACE_BIND_HOST=0.0.0.0`, Render's external hostname allowlist, and a writable database path. Free Render storage is ephemeral; persistent governance records need a persistent disk or external database. Tailscale Serve is tailnet-only and should use individual Tailscale and AITrace accounts.
