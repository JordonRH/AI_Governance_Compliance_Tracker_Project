# Contributor workflow

You can maintain this repository using a terminal, editor, browser and GitHub. AI assistance is optional. Start with [development](development.md) and [architecture](architecture.md). The source requirements are preserved in `docs/source-materials/`; use [traceability](capstone-requirements-traceability.md) for the current SME baseline.

## Pick and implement a change

1. Read the relevant GitHub issue, its checked/unchecked criteria and latest evidence. Confirm scope and actual ownership. Closed implementation tickets do not imply sponsor approval.
2. Begin with a clean checkout on the intended base. After PR #40 merges, main is the normal base. Before that, avoid creating a competing copy of its changes; work against its branch deliberately.
3. Create a branch for your change:

```powershell
git status --short
git switch main
git pull --ff-only
git switch -c fix/describe-the-change
```

If status is not empty, preserve your edits first; do not use a hard reset to make it clean. Replace the sample branch name. Configure your own Git author identity if Git requests it; never attribute changes to another teammate.

4. Run the app with fictional data. Implement behaviour in the owning module, keep API permission and organisation checks, and show useful form errors. Follow existing tests for module usage. Do not use proposed design pseudocode as an executable API.
5. For a bug, record reproduction steps and expected/actual behaviour. Add meaningful regression coverage for changed behaviour; update documentation and `.env.example` for changed commands/settings. Do not silently alter sponsor-derived rules or historical submitted assessment definitions.
6. Run the verification commands below. Inspect failures, correct the cause and rerun affected checks. Do not mark a test passed until its process finishes successfully.

## Verify and commit

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit
git diff --check
git diff --stat
git diff
```

Install the Playwright browser first if this is a new machine. Avoid placing nested checkouts inside the repo: Node's automatic test discovery can find their tests too. Audit results are time-sensitive. Record any failing check explicitly rather than claiming green status.

Check that database files, private certificates, `.env`, passwords, tokens and generated artifacts are absent from the proposed commit. Stage named files rather than unrelated working changes:

```powershell
git add path/to/changed-file path/to/test-file
git diff --cached
git commit -m "fix: describe the resulting behaviour"
git push -u origin fix/describe-the-change
```

Replace sample paths with actual files. Use a useful commit message describing the change. Commit related code/tests/docs together. Keep source documents unchanged unless the team explicitly changes the source baseline.

## Open a pull request without CLI tooling

Open the repository on GitHub, choose **Pull requests > New pull request**, select `main` as base and your branch as compare, then review the file diff. Provide:

- The concrete problem and resulting behaviour.
- Linked issue numbers and what remains outside the change.
- Exact checks run and their results; note unperformed human acceptance separately.
- Configuration/migration effects and any needed operator steps.

Create the PR, request the agreed reviewer, and wait for review/merge. Updating an existing PR only requires pushing to its head branch. Do not create multiple overlapping PRs for the same branch. GitHub CLI is optional; the browser workflow is sufficient. Never paste access tokens into issue comments.

After merge, switch back to main and `git pull --ff-only`. Follow the operations runbook before changing a working database. Update issue checklists with evidence, leaving human/sponsor requirements open until their actual reviewers record acceptance.

## Document conventions

Current instructions live in `docs/project/`. `docs/design/` preserves earlier design contracts and proposals with explicit implementation notes; read current architecture/API guidance first. `docs/research/` contains candidate research, not approved policy. Dated audits/progress/reconciliation reports are historical evidence, not live ticket counts.

Use relative Markdown links, UTF-8 text, the actual button/field names and copyable commands with prerequisites and expected results. Distinguish tested Windows instructions from platform alternatives that have not been run. The documentation index lists all supported runbooks. No generated helper under ignored `test-results/`, personal `.agents/` directory or assistant session is required to operate the repository.
