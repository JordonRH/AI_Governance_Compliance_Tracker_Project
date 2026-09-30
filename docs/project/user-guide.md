# AITrace user guide

Use fictional or de-identified information for the capstone demonstration. Risk results are demonstration examples, not compliance approval.

Before signing in, the operator must follow [first setup](development.md). A clone has no default login. Open the URL printed by the server; local HTTP defaults to http://127.0.0.1:5173. The app does not need an AI subscription or API key.

## Sign in and roles

Use the organisation account supplied by your Administrator. Administrators manage accounts, appearance, reminder settings and certificate staging. Compliance Officers manage the registry, actions, policy reviews and exports. Staff can read registered tools/policies, disclose AI use, submit their own assessments, view assigned work and read their own reminders.

**Account** opens a compact desktop menu or a mobile bottom sheet with theme, My password and Sign out controls. Escape closes it. **My password** changes your password and signs out all sessions. After an administrator reset, changing the supplied password is mandatory before entering the workspace.

The table describes the fixed-role baseline. Accounts can add bounded user capabilities or a versioned custom-role template; effective permissions are shown in Manage.

| Capability | Administrator | Compliance Officer | Staff User |
| --- | --- | --- | --- |
| Read registry/policies; disclose AI use | Yes | Yes | Yes |
| Create/edit formal records; export reports | Yes | Yes | No |
| Start/save/submit assessments | Yes | Yes | Own only |
| Review organisation assessments | Yes | Yes | Own only |
| Manage actions and policy uploads/reviews | Yes | Yes | No; assigned actions are readable |
| Read personal inbox | Yes | Yes | Yes |
| Run reminders manually | Yes | Yes | No |
| Accounts, appearance, reminder settings, certificates | Yes | No | No |

## Complete a governance workflow

1. Open **Registry**, choose **Add AI use**, and enter the tool, responsible person/team, purpose, business area and data details. Required fields have an asterisk. **Load fictional examples** is safe to repeat.
2. Use the search, business-area filter, and **View** button to inspect a record. Staff can inspect details without edit permission. Approval is separate from risk assessment.
3. Open **Assessments**, select the AI use and start an assessment. Save a partial draft or answer all required questions and submit. If Required policy versions are shown, read and acknowledge each version before submission. The submitting account must record its own acknowledgements. Reopen drafts from history; submitted assessments cannot be overwritten. Review the result, reasons, source trace and suggested actions. All current rules are labelled demonstration-only.
4. Open **Actions**, select the AI use, optionally link a submitted assessment for that same use, name the action, assign an active account and set a due date. **Edit action** updates progress; **View history** shows changes. Staff see their assigned actions; a manager records status changes.
5. Open **Policies** to upload a PDF or UTF-8 text file up to 1 MiB. Choose checklist topics, reviewer and review date. To replace a policy, choose it under **Version of**; old versions remain downloadable. **Record review** schedules the next review date.
6. Open **Notifications** for your reminders. The server checks automatically (default every minute). Managers can choose **Check reminders now**. Administrators can change lead/repeat days or disable delivery. Repeated checks do not duplicate the same reminder. Mark messages as read after reviewing them.
7. Open **Overview** to review assessment outcomes, outstanding/overdue actions and policy reviews. Follow links into the relevant workflow. Use **Reports** for a historical date and matching PDF/CSV exports. Registry exports continue to show current records.

## Disclose unregistered AI use

Open **Registry**, expand **Disclose an unregistered AI tool**, and describe the tool and data it handles. It enters the register as **Not reviewed** with its staff-disclosure origin retained. A manager chooses **Unreviewed staff disclosures** in Registry, views the record, assesses it and updates approval separately. Decision/change history records the actor and time.

## Administrator controls

**Accounts** lists all accounts in your organisation and supports search. Create accounts with the correct role. **Manage** resets a password or changes role/status; affected sessions are revoked. Disabled users cannot sign in. You cannot remove your own administrator access. Account activity is visible in the console; passwords cannot be viewed. Manage also shows effective permissions, direct capabilities and the assigned custom-role version. Selecting an active template or removing it changes access and revokes sessions; editing the template alone does not change existing assignments.

**Appearance** saves either SREC blue or Slate for the organisation. Each user can independently select light/dark mode. A fresh sign-in screen uses SREC blue until the organisation is known.

**Certificates** generates a temporary local pair, shows expiry and stages uploaded replacements. It does not activate HTTPS or make a certificate browser-trusted. The server operator follows [operations](operations.md) to activate the selected pair, restart and verify it.

## Configuration and historical reporting

Administrators open **Configuration** and use the **Assessment requirements**, **Workflow settings**, **Custom capability roles** and **Version history** sections. Edits stay in place when switching sections. Assessment requirements lets you edit question wording/topics, add required or optional evidence questions and restrict business-area applicability. The four scoring inputs remain required and the synthetic scoring rules stay fixed. Extra questions do not alter risk scores. Leave applicability blank for all areas or enter exact Registry business-area names, one per line.

Use **Save draft version** to prepare changes without activating them, or **Save and activate version** to publish for new work. Enter the approval/change reference. Open **Version history** and expand a saved version to activate it later. Save unsaved edits first; activation and retirement are disabled while the editor contains unsaved changes. **Retire active version** pauses new assessments and actions; existing records remain available. The Activation audit records who changed activation, when and the reference. Sponsor approval is assumed at the user's direction for this implementation; this does not document a sponsor meeting or human UAT.

The Workflow settings section has a live process preview and four control cards. Each explains the selected behaviour, an example and which new work it affects. The controls cover new assessment links, policy acknowledgement, requiring In Progress before completion, and whether completed actions can reopen. The preview reflects unsaved edits; only activation changes the setup used for new work. Assessment and action requirements are captured at creation. If policy acknowledgement is required but no current policy is linked to a question, link a policy before starting a new assessment. Later policy versions do not replace a draft's required versions. Reading acknowledgement records a user declaration rather than proving comprehension.

**Reports** reconstructs records at the end of the selected UTC day. Choose a date and **Refresh view**, then switch between six report cards:

- **Registry approvals**: AI uses by Not reviewed, Approved or Declined.
- **Assessments**: all Draft and Submitted assessment records, including repeat assessments of an AI use.
- **Actions**: Not Started, In Progress and Complete, with a separate overdue count.
- **Policy reviews**: latest version of each policy document, classified as Review pending, Due today, Overdue or Reviewed. A due/overdue review takes precedence over an earlier review receipt.
- **Risk outcomes**: the latest submitted result per AI use, including Not assessed and the fixed demonstration outcomes.
- **Business areas**: AI use counts and shares by area.

Choose **Bar chart**, **Doughnut chart** or **Data table**. Counts and percentages remain visible alongside charts; selecting a chart category filters the underlying records. Search and category filters apply only to the record list, not report totals or exports. **Export CSV** and **Export PDF** download the selected report's complete breakdown and records at the displayed date; PDF includes a bar-chart summary. Expand **Full governance evidence export** for all registry records, submitted evidence, actions and policy versions. Changing the date disables exports until the refreshed view matches it.

The capture start is displayed. Earlier states were not captured and cannot be reported; today's view changes as records are saved. On an upgraded database, history starts at the upgrade baseline, not the original record creation date.

## Demonstration checklist and expected results

Use a fresh fictional database if you need an empty starting point; see [operations](operations.md). Do not erase existing records.

1. Sign in as Administrator; create a Staff User and Compliance Officer from Accounts with unique logins and fictional names. Use a private window to switch roles without disturbing your administrator session.
2. Load fictional registry examples. Expect three records, no duplicates after repeating the button, and Not assessed until submitted assessments exist.
3. Start an assessment for one example. Save with some answers missing; reopen it and verify persistence. Submit all answers and expect a labelled demo risk result and reasons. Reopen the result; it is read-only.
4. Create an action for the same AI use, link that submitted assessment, assign an active account and choose today's UTC date. Expect Not Started. Edit to In Progress, then inspect View history.
5. Create a small UTF-8 text file with fictional policy text in an ordinary text editor. Upload it, select a reviewer and today's UTC review date, and link a checklist topic. Upload a changed copy using Version of; expect both versions to download, with only the latest requiring current review.
6. Run Check reminders now. Sign in as the assigned owner/reviewer and inspect Notifications. Repeat the run; unchanged due reminders should not duplicate. Complete the action and record the policy's next future review date; later runs should not create reminders for the closed action or old policy version.
7. As Staff, disclose an AI use. As manager, filter Unreviewed staff disclosures, inspect it and change approval. Expect provenance and change history to remain.
8. Export PDF/CSV from Registry. Open them in ordinary viewers and compare the records, assessment result, action and policy versions against the app. Check long text, page boundaries and accented Latin names. PDF uses a Latin font subset.
9. Reset the test Staff password from Accounts. Expect existing sessions to end, the old password to stop working, and the supplied replacement to lead to the mandatory password-change page. No password is viewable in Accounts.
10. Check both palettes/light-dark modes and a narrow window. Record reviewer/date, expected and actual results, and defects in the [acceptance checklist](acceptance-checklist.md). Running automated tests does not fill in human/sponsor sign-off.

## Practical limits

Notifications are in-app and require the server to run. Legacy free-text action owners need account assignment before delivery. Uploads are restricted attachments, not malware-scanned documents. PDF text uses a Latin font subset. Email notifications, public password recovery and human acceptance remain outside the completed implementation evidence. Risk scoring remains synthetic even under the component-approval assumption.

No delete/archive workflow is implemented. For mistakes, edit records where supported, create a new submitted assessment/version when required, or use a separate demonstration database. Ask the operator for backup/restore or account recovery; do not edit database files directly.

## Navigation and keyboard access

On desktop, the sidebar stays attached to the viewport while the page scrolls. In a short window, scroll the navigation list or Tab through its buttons; the brand and organisation name remain anchored. The decorative sidebar footer is omitted in short desktop windows. At mobile widths, navigation remains a horizontally scrolling row above the content.

Press Tab from the start of the workspace to reveal **Skip to content** near the top. Press Enter to move keyboard focus past navigation into the main content. Further Tab presses reach the current page's controls.

The [sponsor showcase and layout verification](sidebar-showcase-verification-2026-09-27.md) documents the fictional screenshot pack, PDF and regeneration steps.

The desktop sidebar background colour continues to the bottom of long pages; the navigation panel stays fixed while the page content scrolls.
