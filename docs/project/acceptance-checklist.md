# Prototype acceptance checklist

This is a repeatable sponsor/team walkthrough, not a claim that human acceptance has occurred. Record reviewer, date, observed result and follow-up ticket beside each step.

- [ ] Set up a fresh checkout using development.md and a separate fictional database.
- [ ] Bootstrap an Administrator; create Compliance Officer and Staff accounts.
- [ ] As Administrator, register a fictional AI use and view its complete details.
- [ ] As Staff, disclose a tool; verify it is Not reviewed, readable, and not editable as a formal record.
- [ ] Save an assessment draft, reload, complete it and inspect the demo risk explanation/source trace.
- [ ] Verify a submitted assessment cannot be edited; start a new one for reassessment.
- [ ] As Compliance Officer, create a linked action with an account owner and due date; update status and inspect history.
- [ ] Upload a fictional policy, link checklist items, upload a second version, and download both.
- [ ] Set action/policy dates to today and run reminders; verify only intended recipients see them and repeat checks do not duplicate them.
- [ ] Record a policy review with a future date and complete an action; verify dashboard counts and future reminder behaviour.
- [ ] Export CSV/PDF, reconcile all sections against the app, inspect long text and accented names.
- [ ] Reset a Staff password, confirm old sessions stop working and the next login requires a new password.
- [ ] Disable/reactivate a test account; confirm role changes and account audit entries.
- [ ] Create a second organisation through the bootstrap command; verify its users cannot read the first organisation's records/files/notifications.
- [ ] Review keyboard focus, required fields, error messages, table scrolling, desktop/tablet/mobile layouts, and both palettes/modes.
- [ ] As Administrator, generate a temporary certificate, inspect expiry, activate the bundle using operations.md, verify HTTPS and stage a replacement; distinguish self-signed from trusted status.
- [ ] Verify trusted TLS and encrypted-storage setup separately using security-configuration.md if evaluating those requirements.
- [ ] Record sponsor decisions on questionnaire content, risk thresholds, retention and notification policy. Do not call demonstration content approved policy.

Automated suites exercise the software baseline with fictional fixtures. Human SME usability, sponsor sign-off, independent walkthrough and operational encryption evidence remain pending until recorded by their actual reviewers. Research writing and student reflections are separate deliverables; this implementation does not fabricate them.

## Record each human check

Use [user guide](user-guide.md) for the demonstration steps and [operations](operations.md) for operator tasks. For each checked item record: reviewer name/role, date, Git commit, operating system/Node version, fictional dataset, expected result, actual result, pass/fail and any follow-up issue. Do not record passwords, session tokens, private certificates or real personal information in the report. Automated results belong in a separate evidence section; leave human/sponsor boxes unchecked until those people perform the review.
