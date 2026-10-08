# AITrace repository steering

## Start here

AITrace is a fictional/de-identified AI governance workflow for an Australian SME showcase. Read [the agent project context](docs/project/agent-context.md) before changing product behaviour, deployment, or governance wording. It is the single source of truth for the workflow story, boundaries, and continuation checklist.

For multi-role or delegated development work, follow the [agentic development workflow](docs/project/agentic-development-workflow.md). The coordinator owns scope, integration, verification and handover; specialist roles may propose or implement changes only within the boundaries documented there.

## Working loop

1. Inspect `git status --short --branch` and preserve existing work.
2. Read the relevant source and tests before editing.
3. Keep governance controls bounded, versioned, auditable, and server-validated.
4. Preserve fictional/demo wording and distinguish recorded workflow evidence from legal or sponsor approval.
5. Run the smallest relevant tests, then `npm.cmd run build` and `git diff --check` for application changes.
6. Finish only when the changed behavior, tests, documentation, branch, and deployment implications are accounted for.

## Context pointers

- Use the [AI-use governance story](docs/project/ai-use-governance-story.md) when changing the end-to-end user journey.
- Use the [workflow walkthrough review](docs/project/ai-use-governance-walkthrough-review-2026-10-05.md) when assessing UX or deciding follow-up improvements.
- Use [operations](docs/project/operations.md) and `render.yaml` for self-hosted or Render deployment work.
- Use the `aitrace-project-context` skill for cross-device continuation, handover, or context reconstruction.
