# AITrace agentic development workflow

This document defines how Codex and authorised contributors coordinate work in AITrace. It supplements [AGENTS.md](../../AGENTS.md), [agent context](agent-context.md), [contributing guidance](contributing.md), and [development commands](development.md). Those documents remain authoritative for the project story, product boundaries, repository conventions, and operations.

## Coordinator responsibilities

The coordinator owns the complete change, even when work is delegated. The coordinator reads the repository instructions, project context, relevant source/tests, branch and remote state, and latest issue or PR; defines scope, acceptance criteria, risks, affected files, and verification; assigns narrow specialist slices; preserves unrelated user changes; integrates and reviews the final diff; runs or verifies all checks; writes factual commit/PR notes; and leaves a recoverable handover when incomplete.

A delegated report is not evidence by itself. Evidence is command output, a test artifact, a reviewed diff, or an explicitly recorded environment limitation.

## Specialist roles

Roles are responsibilities, not separate authorities. The coordinator integrates the work and makes final scope decisions.

### Planner / analyst

Translate the request into bounded scope and acceptance criteria. Map the product story, domain terms, UI/API/data/audit seams, deployment implications, assumptions, risks, and checks. Identify independently editable files and serial ownership. Do not edit application code unless an implementation slice is explicitly assigned.

### Implementation

Implement the assigned slice in its owning module and preserve existing interfaces unless migration is in scope. Preserve permissions, organisation isolation, server validation, versioning, audit history, historical snapshots, and fictional/demo boundaries. Add focused regression tests. Do not weaken tests or change dependencies, schemas, deployment settings, credentials, or generated artifacts incidentally.

### QA

Test public seams and user-visible outcomes, including negative paths, role boundaries, organisation scoping, stale versions, and historical preservation where relevant. Run focused checks first, then repository checks. Distinguish real failures from missing dependencies, unavailable browsers, network limits, or environment issues and record exact commands/output. Check responsive and accessible behavior for UI changes when browser testing is available.

### Reviewer

Review the diff against the request and project context, not just the author's explanation. Look for security issues, data leakage, permission bypasses, unsafe migrations, unbounded workflow behavior, misleading governance claims, regressions, and missing tests. Check that PR notes match the diff and evidence. Report findings with paths, impact, and concrete corrections; a clean review does not replace automated or human acceptance.

### Documentation

Update the nearest durable document when behavior, commands, deployment, governance wording, or handover expectations change. Use copyable commands, actual labels and paths, and state whether Windows PowerShell instructions were tested. Preserve fictional/de-identified wording and distinguish recorded evidence from legal advice, sponsor approval, production security, or UAT.

## Delegation boundaries and shared files

Delegated work must name its input context, owned files, expected output, and verification command. One role owns a file while editing it; never delegate overlapping edits concurrently. Prefer independent concerns: analysis/test planning, implementation in one module, documentation, and review of a fixed diff.

Do not delegate secrets, passwords, tokens, private certificates, production credentials, or destructive database operations without explicit coordinator scope and an approved procedure. Do not ask a specialist to merge, force-push, alter the base branch, or claim deployment success without explicit scope and evidence. Keep migrations, data exports/imports, production deploys, and governance policy wording under coordinator review. Specialists may inspect unrelated files for context but must not clean up unrelated user changes.

When shared files conflict, inspect status, staged changes, latest commits, and the primary source of intent. Integrate both changes when possible with the smallest semantic diff. If they cannot coexist, the coordinator chooses based on the request and project context. Never use hard reset, destructive checkout, broad deletion, or force-push to hide a conflict. Run focused tests for both behaviors and record any deferred resolution.

## Integration and verification rules

Before commit, review `git diff`, `git diff --cached`, and `git diff --check`; confirm no `.env`, credentials, private keys, database files, generated test output, or unrelated files are staged; and run the smallest affected check followed by required repository checks.

For documentation-only changes, the minimum checks are `git diff --check`, `npm.cmd test`, and `npm.cmd run build` when dependencies are already installed. If a command cannot run, report the exact failure and environment cause. Do not change dependencies merely to conceal a missing dependency. Commits should contain related documentation/tests together and explain resulting behavior. PRs should include summary, verification, deployment/migration effects, and limitations. Human or sponsor acceptance stays separate from automated evidence.

## Security, dependency, migration, deployment, and governance considerations

### Security

Treat input as untrusted. Preserve authentication, session invalidation, organisation isolation, roles/capabilities, origin and host validation, safe errors, password hashing, and audit records. Never put secrets in source, docs, logs, commits, PR comments, screenshots, or fixtures.

### Dependencies

Do not add, upgrade, remove, or regenerate dependencies as an incidental fix. When explicitly approved, change `package.json` and the lockfile together and record advisory output separately from test results.

### Migrations and data

Migrations must be forward-safe, scoped, reviewable, and tested with fictional representative data. Preserve historical definitions, policy binary data, audit history, role assignments, and organisation boundaries. Use documented export/import scripts and local environment variables; never request or commit database passwords.

### Deployment

Render, Tailscale, and local settings are documented in [operations](operations.md) and `render.yaml`. A local build does not prove a deployed service started or uses the intended database. Verify health, startup logs, bind/host settings, database mode, and relevant authenticated workflows in the target environment. Do not claim PostgreSQL support, production readiness, legal compliance, sponsor approval, or UAT from tests alone.

### Governance

Keep governance controls bounded, versioned, server-validated, and auditable. Do not introduce arbitrary scripts or an unrestricted state machine. Configuration changes must preserve historical snapshots and state what applies to new work. Synthetic assessment outcomes must remain labelled synthetic.

## Editing this workflow and specialist skills

Edit this document when coordination, roles, delegation, verification, or security/deployment expectations change. Edit `AGENTS.md` only when always-loaded repository steering or the pointer changes; keep detailed guidance here to avoid duplicating context.

Specialist skills live under `.agents/skills/<skill-name>/SKILL.md`. Read the complete relevant `SKILL.md` before using it. A skill should have a narrow trigger, explicit scope, safe file/command boundaries, and a verification or handover rule. When editing one: preserve front matter and invocation intent; state when it applies and when it does not; prefer existing scripts and commands; keep secrets, destructive operations, and external writes behind explicit coordinator approval; update `.agents/README.md` or this document if discovery/routing changes; and review it as an instruction document.

## Confirmed repository commands

Run these from `J:\AITrace` in Windows PowerShell. `npm.cmd` avoids PowerShell execution-policy issues.

```powershell
git status --short --branch
npm.cmd test
npm.cmd run build
git diff --check
```

Other supported commands are documented in [development.md](development.md), including `npm.cmd ci`, `npm.cmd run dev`, `npm.cmd start`, `npm.cmd run test:e2e`, `npm.cmd run account:create`, `npm.cmd run database:export`, `npm.cmd run database:import:postgres`, and `npm.cmd run testing:seed`.
