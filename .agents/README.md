# AITrace agent skills

Codex uses the skills under `.agents/skills/` as repository-local instructions for recurring work. Each skill is a directory containing a `SKILL.md`; some skills may also contain references, scripts, templates, or examples.

## How Codex uses skills

1. A task or repository context triggers a relevant skill.
2. Codex reads that skill's complete `SKILL.md` before taking the associated action.
3. Relative references are resolved from the skill directory, and only task-relevant references are loaded.
4. The skill guides the work; `AGENTS.md`, `docs/project/agent-context.md`, explicit user instructions, and repository safety rules remain authoritative.
5. Codex reports material actions or pauses caused by a skill and records durable handover information when required.

The project-context skill is the normal entry point for cross-device continuation, workflow changes, UX/deployment work, and repository handover. It directs Codex to read repository instructions, project context, relevant source/tests, and current branch/PR state.

## Editing skills

Edit only the specific `.agents/skills/<name>/SKILL.md` or supporting resource that needs to change. Preserve front matter and invocation intent. Keep a skill narrow and explicit:

- describe when it applies and when it does not;
- define safe boundaries, owned files, and external-write requirements;
- prefer existing repository scripts and commands;
- never embed secrets or request them in chat;
- include verification, handover, or failure-reporting rules;
- update the coordinator workflow when a skill changes delegation or integration behavior.

Read the full skill before editing it, review the diff for instruction conflicts, and run the repository checks required by the change. A skill is not permission to bypass project instructions, conceal failures, overwrite unrelated user work, or perform destructive external operations.

See [the coordinator workflow](../docs/project/agentic-development-workflow.md) for role boundaries, shared-file conflict handling, integration, security, migration, deployment, governance, and confirmed commands.
