---
name: different-device
description: Create a tested Git checkpoint for continuing AITrace work from another device or Codex session.
disable-model-invocation: true
---

# Continue on a different device

Use this skill when the user wants to save current AITrace work and resume from VS Code, Codex, or another device.

Run from the repository root:

```bash
npm run checkpoint -- "describe what the next device should continue"
```

The command:

1. Runs `git diff --check`.
2. Records the current branch, latest commit, working-tree summary, timestamp, and handover message in `docs/project/handover-latest.md`.
3. Stages tracked changes and the handover file.
4. Creates a checkpoint commit.
5. Pushes the current branch.

After switching devices, read `AGENTS.md`, `docs/project/agent-context.md`, and `docs/project/handover-latest.md`, then inspect `git status` and the latest commit before continuing.

Checkpointing never claims that an unfinished task is complete. Use a precise handover message that names the next action or uncertainty.
