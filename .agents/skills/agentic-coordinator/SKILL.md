---
name: agentic-coordinator
description: Coordinate a complete AITrace development task from repository inspection through implementation, verification, commit, PR, and handover. Use when the user asks Codex to coordinate work, delegate roles, manage a multi-file change, or prepare a reviewable delivery.
---

# AITrace coordinator

Use this skill as the entry point for coordinated AITrace work. The detailed coordination contract is [the agentic development workflow](../../../docs/project/agentic-development-workflow.md); read it after the project instructions below.

## Start

1. From the repository root, inspect `git status --short --branch`, remotes, latest commits, and open PR context.
2. Read `AGENTS.md` and `docs/project/agent-context.md` before changing behavior, deployment, governance wording, or repository instructions.
3. Read `docs/project/agentic-development-workflow.md` and the relevant source, tests, operations, and specialist skills.
4. State the intended outcome, acceptance criteria, affected files, delegation boundaries, and verification commands.

## Coordinate

- Assign planner/analyst, implementation, QA, reviewer, and documentation responsibilities only when the task benefits from separation.
- Give each delegated slice explicit inputs, outputs, owned files, and a checkable completion criterion.
- Keep one owner per file during editing. Integrate shared files serially and preserve unrelated user changes.
- Keep secrets, credentials, destructive operations, migrations, production deployment, and external writes under explicit coordinator review.
- Preserve AITrace's bounded, versioned, server-validated, auditable governance controls, organisation isolation, historical snapshots, fictional/demo boundaries, and deployment claims.

## Verify and deliver

1. Review the complete diff and staged diff; run `git diff --check`.
2. Run the smallest relevant tests, then the repository checks required by the task. For documentation-only work, run `npm.cmd test` and `npm.cmd run build` when dependencies are available.
3. Report exact failures caused by missing dependencies or environment limitations rather than changing dependencies incidentally.
4. Check that secrets, database files, generated output, and unrelated changes are not staged.
5. Create a factual commit, push the branch, and open or update the PR with summary, verification, deployment/migration impact, limitations, and human-acceptance gaps.
6. Leave a durable handover when work is incomplete. Do not claim deployment, PostgreSQL support, legal compliance, sponsor approval, production security, or UAT without direct evidence.

## Completion

The coordinator task is complete only when the requested change is integrated, the diff is reviewed, required checks have finished, commit/branch/PR state is known, and remaining limitations are recorded.
