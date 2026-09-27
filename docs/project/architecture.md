# Application architecture

Reviewed 27 September 2026. The capstone baseline is an Australian SME prototype. Sponsor content approval and human acceptance are separate from implementation.

## Runtime and boundaries

React/Vite talks to same-origin Express APIs. One Node process owns SQLite and the periodic reminder runner. The server binds only to loopback; optional PEM or staged-bundle settings switch HTTP to HTTPS. SQLite schema migrations are additive through version 10. There is no cloud service, ORM, SSO or production SaaS integration.

| Module | Responsibility |
| --- | --- |
| src/main.jsx | Authentication shell, navigation, dashboard, admin accounts/appearance, disclosure |
| src/registry.jsx | Registry forms, search, pagination, details and decision history |
| src/certificates.jsx / server/certificates.js | Administrator staging/generation/replacement and private bundle validation |
| src/workflows.jsx | Assessments, actions, policies, inbox and own-password pages |
| src/forms.jsx / api.js | Accessible shared fields and same-origin API helper |
| server/index.js / config.js | Validated runtime configuration, HTTP(S), Vite/static serving, reminder scheduling |
| server/auth.js | Scrypt hashes, opaque sessions, live role resolution, password changes/resets, revocation |
| server/app.js | Request security, registry/actions/accounts/settings/dashboard/report routes |
| server/assessments.js / assessment-definition.js | Snapshot definitions, draft revisions, immutable submission and demo evaluation |
| server/policies.js | Scoped versioned document storage, download and review dates |
| server/notifications.js | Scoped in-app delivery, idempotency, inbox and scheduler-run evidence |
| server/reporting.js | Formula-safe CSV and wrapped/font-embedded PDF |
| server/database.js | SQLite schema and migration entry point |
| server/domain/ | Pure scoring, action lifecycle, reminder planning, dashboard and validation modules |

The earlier evidence-intake domain module remains available for richer configurable policies; current upload routes enforce a narrow PDF/text policy directly. Source design documents describe historical/proposed interfaces; current implemented behaviour is documented here and in tests.

## Persisted workflow

Registry entry -> assessment draft with definition snapshot -> immutable submitted responses and deterministic result -> linked, assigned actions -> policy versions/checklist links and scheduled reviews -> scoped notifications -> dashboard/export.

Submitted results retain their definition/version and explanations. The registry/dashboard derive the latest submitted outcome per AI use. A new assessment creates a new historical row. Demonstration results never imply approval or legal certification. Approval is an independent registry field with recorded changes.

Files are stored as SQLite blobs; every version has a SHA-256 digest, safe attachment name, reviewer and due date. The reminder runner selects latest policy versions and open actions, resolves active account recipients, and inserts notifications atomically with stable deduplication keys. Read state and run outcomes persist. Failed runs retry at the next configured interval.

See [API reference](api-reference.md) for every route and request examples, [operations](operations.md) for database recovery/HTTPS, and [contributing](contributing.md) for changes and PRs.

## API groups

| Routes | Access |
| --- | --- |
| /api/auth/login, session, logout | Login/session lifecycle |
| /api/auth/password | Authenticated own password, including mandatory post-reset flow |
| /api/accounts, /accounts/:id/password, /accounts/:id, /accounts/audit | Administrator, own organisation |
| /api/settings | Members read; Administrator writes appearance |
| /api/registry, /registry/:id, /registry/:id/history, /shadow-reports | Scoped reads/disclosure; formal create/update restricted |
| /api/assessments | Submit roles; staff can list/edit their own drafts only |
| /api/actions, /action-owners | Managers create/update; staff list their assigned actions |
| /api/policies, /policies/:id/download, /policies/:id/review | Members read/download; managers upload/review |
| /api/notifications, /notifications/:id/read | Recipient and organisation scoped |
| /api/reminders/settings, /reminders/run, /reminders/plan | Managers inspect/run; Administrator configures |
| /api/dashboard, /reports/compliance.csv, /reports/compliance.pdf | Role-scoped summaries; export permission required |

Writes use JSON, bound SQL parameters and server-side scope checks. Binary policy downloads and PDF/CSV exports use attachment responses. API errors are JSON; unexpected details are not sent to clients. Draft revisions and action versions reject stale writes.

## Remaining architectural work

Actual encrypted-volume/database evidence, retention/deletion policy, shared persistent throttling for multi-process hosting, additional font/script support and production deployment are not claimed. External email delivery and public account recovery are not configured. See the security plan and acceptance checklist.

## Certificate administration

`server/certificates.js` validates certificate/key pairs, generates temporary local certificates and atomically stages organisation-specific private bundles. `src/certificates.jsx` exposes metadata, generation and replacement to Administrators through `/api/certificates`, `/generate` and `/replace`. The operator chooses an active bundle using process configuration and restarts the shared server. Private key material never appears in API responses. See the security configuration document for Windows ACL and trust requirements.
