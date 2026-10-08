# AITrace showcase presentation script - 8 October 2026

## Purpose

This is a 10-12 minute walkthrough of the fictional AITrace governance workspace. Use the live Render URL for the deployment section and the local screenshot pack or PDF when a live screen is not appropriate. All records are fictional or de-identified.

Do not describe the prototype as legal advice, certification, automatic compliance approval, sponsor acceptance or completed human UAT. Assessment results and thresholds are synthetic demonstration rules.

## Before presenting

- Open the live Render service and confirm `/api/health` reports `status: ok` and `mode: postgresql`.
- Use a prepared demonstration account; do not display or read passwords aloud.
- Have the PDF and screenshot gallery available as fallback evidence.
- Keep the Supabase connection string, database password, bootstrap password and private certificate material off screen.
- If showing mobile behavior, use a narrow viewport and hard-refresh once so the current CSS bundle is loaded.

## Walkthrough

### 1. Set the scene - 45 seconds

**Say:**

“AITrace is a fictional governance workspace for an Australian SME. The workflow is Discover, Assess, Read and acknowledge, Decide, Create actions, Complete actions, and Report and improve. The Registry is the system of record; the other pages add assessment, policy, action and reporting evidence around it.”

Point out the bold UAT banner. Explain that every displayed record is fictional demonstration data.

### 2. Sign in and identity - 45 seconds

Sign in with the prepared account.

**Say:**

“The signed-in identity is now visible in the top bar with the user’s name and role. The organisation remains visible in the workspace rail, and the Account menu provides theme, password and sign-out controls.”

Open the Account menu briefly so the audience can see it without being told where it is.

### 3. Overview and registry - 90 seconds

Open Overview, then Registry.

**Say:**

“The Overview is a daily queue: recorded AI uses, assessment coverage, open actions and policy review work. Registry records capture purpose, ownership, business area, data sensitivity and approval state. Approval is a separate workflow decision; registering or disclosing a tool never implies approval.”

Open a record and, if useful, show its history. Demonstrate the disclosure path:

“A staff disclosure enters as Not reviewed. It gives a manager a visible item to assess rather than silently approving the use.”

### 4. Assessment evidence - 75 seconds

Open Assessments and show a draft/result.

**Say:**

“Assessments are versioned decision records. A draft can be saved, then a submitted result retains the responses, the definition version, the matching demonstration rules and explanations. These are synthetic governance examples, not legal or compliance conclusions.”

If policy acknowledgement is enabled in the selected configuration, show that the exact policy version is acknowledged before submission.

### 5. Actions and policy evidence - 90 seconds

Open Actions and Policies.

**Say:**

“Actions turn findings into assigned work. Owners, due dates, status changes and history are retained; completing an action does not automatically certify the AI use. Policies are versioned evidence. A reviewer, review date and checklist topics are recorded, and earlier versions remain available.”

Show an action history or policy review panel if time allows.

### 6. Notifications and reports - 75 seconds

Open Notifications, then Reports.

**Say:**

“Reminders are delivered to the relevant in-app inbox and are idempotent, so repeated checks do not duplicate eligible notifications. There is no email delivery configured. Reports reconstruct the selected point-in-time or period view from captured history, with charts, tables and CSV/PDF exports.”

Mention that the server must be running for reminder delivery.

### 7. Account management and password lifecycle - 90 seconds

For an administrator, open Accounts.

**Say:**

“Administrators can create accounts, manage roles, bounded capabilities and custom role assignments, and review account audit history. Passwords are never displayed. An administrator reset revokes existing sessions and issues a temporary password. At the next sign-in, the user must enter that temporary password and choose a personal password before returning to the workspace.”

If showing the flow, do not narrate the password value. Show the forced security page and its explanation only.

### 8. Responsive behavior - 45 seconds

Resize to a phone width.

**Say:**

“The mobile layout keeps the navigation usable, prevents horizontal page overflow and keeps the account identity visible. The same organisation and permission boundaries apply on phone and desktop.”

Open the mobile Registry or Overview screenshot if the live browser is not available.

### 9. Deployment and migration evidence - 90 seconds

Show the Render service or the PDF deployment section.

**Say:**

“The hosted deployment now uses Supabase PostgreSQL when `DATABASE_URL` is present. SQLite remains for local development and disposable tests. The local SQLite export was imported into the Supabase project, including organisations, accounts, password hashes, sessions, registry data, assessments, actions, policy binary data, configurations, audit records, historical reporting and reminder history.”

“Render starts in PostgreSQL mode, and `/api/health` reports `mode: postgresql`. The application adapter normalizes PostgreSQL dates to the same string shape used by SQLite, preserving dashboard sorting, reminders, reports and route behavior.”

Do not show the connection string or password. The current hosted settings are `DATABASE_URL`, `AITRACE_BIND_HOST=0.0.0.0`, the build command `npm ci && npm run build`, the start command `npm start`, and health path `/api/health`.

### 10. Close and ask for decisions - 60 seconds

**Say:**

“The implementation is technically verified, but the remaining sponsor decisions are about the approved questionnaire, thresholds, role model, evidence expectations and acceptance process. Which workflow terms and questions should change before a real pilot? Which user groups need human UAT? What retention, certificate and operational controls must be agreed?”

## Evidence to cite if asked

- 86 application tests passed.
- 29 Playwright browser tests passed.
- Production build passed.
- `git diff --check` passed.
- Render health returned `status: ok` and `mode: postgresql`.
- The live PostgreSQL date-handling fix is documented in PR #61.

## Limitations to state plainly

- Data and assessment rules are fictional or de-identified.
- Results do not provide legal advice, certification or automatic compliance approval.
- Human SME, screen-reader and sponsor acceptance remain separate activities.
- In-app reminders require the server to run; email delivery is not configured.
- Temporary local certificates are not publicly trusted; certificate activation requires operator configuration and restart.
- Supabase PostgreSQL is the hosted database; local SQLite is retained for local/disposable use.
