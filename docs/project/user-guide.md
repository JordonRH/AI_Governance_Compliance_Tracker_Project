# AITrace user guide

Use fictional or de-identified information for the capstone demonstration. Risk results are demonstration examples, not compliance approval.

## Sign in and roles

Use the organisation account supplied by your Administrator. Administrators manage accounts and appearance. Compliance Officers manage the registry, actions, policy reviews and exports. Staff can read registered tools/policies, disclose AI use, submit their own assessments, view assigned work and read their own reminders.

**My password** changes your password and signs out all sessions. After an administrator reset, changing the supplied password is mandatory before entering the workspace.

## Complete a governance workflow

1. Open **Registry**, choose **Add AI use**, and enter the tool, responsible person/team, purpose, business area and data details. Required fields have an asterisk. **Load fictional examples** is safe to repeat.
2. Use the search, business-area filter, and **View** button to inspect a record. Staff can inspect details without edit permission. Approval is separate from risk assessment.
3. Open **Assessments**, select the AI use and start an assessment. Save a partial draft or answer all questions and submit. Reopen drafts from history; submitted assessments cannot be overwritten. Review the result, reasons, source trace and suggested actions. All current rules are labelled demonstration-only.
4. Open **Actions**, select the AI use, optionally link a submitted assessment for that same use, name the action, assign an active account and set a due date. **Edit action** updates progress; **View history** shows changes. Staff see their assigned actions; a manager records status changes.
5. Open **Policies** to upload a PDF or UTF-8 text file up to 1 MiB. Choose checklist topics, reviewer and review date. To replace a policy, choose it under **Version of**; old versions remain downloadable. **Record review** schedules the next review date.
6. Open **Notifications** for your reminders. The server checks automatically (default every minute). Managers can choose **Check reminders now**. Administrators can change lead/repeat days or disable delivery. Repeated checks do not duplicate the same reminder. Mark messages as read after reviewing them.
7. Open **Overview** to review assessment outcomes, outstanding/overdue actions and policy reviews. Follow links into the relevant workflow. From **Registry**, export PDF or CSV for a summary covering registry, assessment, action and policy evidence.

## Disclose unregistered AI use

Open **Disclose AI use** and describe the tool and data it handles. It enters the register as **Not reviewed** with its staff-disclosure origin retained. A manager chooses **Unreviewed staff disclosures** in Registry, views the record, assesses it and updates approval separately. Decision/change history records the actor and time.

## Administrator controls

**Accounts** lists all accounts in your organisation and supports search. Create accounts with the correct role. **Manage** resets a password or changes role/status; affected sessions are revoked. Disabled users cannot sign in. You cannot remove your own administrator access. Account activity is visible in the console; passwords cannot be viewed.

**Appearance** saves either SREC blue or Slate for the organisation. Each user can independently select light/dark mode. A fresh sign-in screen uses SREC blue until the organisation is known.

## Practical limits

Notifications are in-app and require the server to run. Legacy free-text action owners need account assignment before delivery. Uploads are restricted attachments, not malware-scanned documents. PDF text uses a Latin font subset. Email notifications, public password recovery, sponsor-approved risk content and human acceptance remain outside the completed implementation evidence.

Administrators also have a **Certificates** page to generate temporary local certificates, inspect expiry, and stage replacement PEM files. Follow [security configuration](security-configuration.md) to activate HTTPS and protect the private bundle. Generation does not restart the server or establish browser trust.
