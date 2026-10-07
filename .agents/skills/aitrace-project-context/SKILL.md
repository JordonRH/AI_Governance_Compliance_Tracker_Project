---
name: aitrace-project-context
description: Use when working in the AITrace repository, resuming work from another chat or device, changing the governance workflow, reviewing UX, or preparing local/Tailscale/Render deployment. Read the project context and current Git state before editing, then leave a tested handover in commits and documentation.
---

# AITrace project context

Read `AGENTS.md` and `docs/project/agent-context.md` first. They define the product story, boundaries, and continuation checklist.

## Resume procedure

1. Run `git status --short --branch`.
2. Read the latest commits and identify the active branch and PR.
3. Follow the relevant context pointer from `AGENTS.md` instead of loading every project document.
4. Inspect source and tests for the requested behavior.
5. Implement the smallest coherent change that preserves versioning, permissions, auditability, and historical records.
6. Run relevant tests, the production build, and `git diff --check`.
7. Summarize the user-visible result, verification, branch/commit, and any remaining handover item.

## Handover rule

A continuation is complete when another Codex session can recover the product story, current branch, outstanding work, deployment mode, and verification evidence from committed files and Git history without needing the previous conversation.
