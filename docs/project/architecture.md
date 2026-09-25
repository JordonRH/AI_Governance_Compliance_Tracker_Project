# Initial application architecture

## Agreed direction

On 20 September 2026, Jordon confirmed React with Vite, Node.js with Express, and SQLite for the local prototype. Requirements review was reported complete. Jordon leads the initial work; the team will review before further allocation. Sponsor-dependent governance decisions remain unresolved.

The first checkpoint delivered an initial React interface with a working Node.js backend; Jordon subsequently authorised progressive implementation. Authentication and later governance modules are outside this increment.

## Structure

| Location | Responsibility |
| --- | --- |
| `src/main.jsx` | Overview, registry, record form, governance notes and project guide |
| `src/styles.css` | Responsive layout, typography, colours and interaction states |
| `server/index.js` | Local HTTP server and development/built frontend serving |
| `server/config.js` | Validated, immutable runtime configuration and local-host policy |
| `server/auth.js` | Account creation, scrypt verification, opaque sessions and role permissions |
| `server/create-account.js` | Explicit local account bootstrap command |
| `server/app.js` | JSON API, input validation and registry operations |
| `server/database.js` | SQLite connection and initial schema migration |
| `server/domain/risk-scoring.js` | Pure deterministic evaluation, validation and explanation module |
| `server/domain/evidence-intake.js` | Pure file-policy validation, digest and assessment-link descriptor module |
| `server/domain/governance-action.js` | Pure action lifecycle, versioned history and due-date classification module |
| `server/domain/reminder-planning.js` | Pure controlled-date reminder intent and idempotency planning module |
| `server/domain/dashboard-summary.js` | Pure authorised-scope filtering and reconciled dashboard aggregation module |
| `server/domain/validation.js` | Shared immutable findings, deep freezing, text, date and timestamp validation |
| `tests/api/registry-api.test.js` | API behaviour and persistence checks |
| `tests/domain/risk-scoring.test.js` | Synthetic scoring contracts, validation and deterministic trace checks |
| `tests/domain/evidence-intake.test.js` | Synthetic evidence policy, type, size, signature and link validation checks |
| `tests/domain/governance-action.test.js` | Action lifecycle, concurrency, history and timing boundary checks |
| `tests/domain/reminder-planning.test.js` | Reminder windows, cadence, ordering and repeated-run checks |
| `tests/domain/dashboard-summary.test.js` | Scope isolation, restricted-state and total-reconciliation checks |
| `tests/e2e/registry.spec.js` | Browser workflow and responsive checks |
| `tests/e2e/theme.spec.js` | Theme, record-detail and responsive browser checks |
| `docs/project/` | Setup, design decisions, progress and review notes |
| `docs/source-materials/` | Original university and project planning inputs |

One Node process serves the frontend and API on the same local origin. React uses relative `/api` requests. SQLite access stays inside the backend. There is no cloud service, ORM or separate database server.

The first UI is intentionally small enough to follow in one file. Split screens and form components when later functionality makes their responsibilities clearer; do not add abstractions solely for anticipated work.

## Registry data

Schema version 2 stores organisations, accounts, hashed server sessions and organisation-scoped AI uses. Registry records include business area, data description, structured data sensitivity, approval status, source and creator alongside timestamps. Existing schema-version-1 records migrate into a named legacy local organisation.

Queries use bound parameters. Accounts, hashed sessions, organisations, structured registry fields and governance actions are persisted. The derived assessment status remains `Not assessed` until approved questionnaire content and assessment-result persistence are implemented.

The initial single-category choice and data-description field are provisional. The later agreed model must address multi-category use if required, data sensitivity, permissions, approval records, institutional separation and status history.

## API

| Method and route | Behaviour |
| --- | --- |
| `GET /api/health` | Confirms API/database access and local-prototype mode |
| `GET /api/registry` | Lists records; accepts `q` and `category` filters |
| `GET /api/registry/:id` | Returns one record or 404 |
| `POST /api/registry` | Validates and creates a record |
| `PUT /api/registry/:id` | Validates and replaces editable record fields |
| `POST /api/examples` | Adds three fictional examples without duplicates |
| `GET /api/overview` | Returns total, unassessed and category counts |

Create and update requests require JSON fields `name`, `purpose`, `owner`, `category` and `dataDescription`. Empty or invalid values receive HTTP 400 with field errors. Unknown IDs return 404. Non-JSON writes return 415. The body limit is 32 KB. The UI calculates displayed counts from its latest registry response; the overview endpoint also exposes the same totals for later consumers.

## Interface decisions

The interface uses a dark sidebar, neutral content areas and restrained green accents. Navigation separates overview, registry, governance information and project guidance. Labels use plain language and do not imply completed compliance checks.

The registry supports creation, editing, search and category filters. A native modal dialog provides keyboard focus containment and Escape dismissal. Inputs have visible labels, length limits and required validation. Empty, loading, success and error states are explicit. Tables scroll within their container on narrow screens.

## Boundaries and deferred work

This increment is an authenticated loopback demonstration with organisation-scoped records. It is not production-ready and does not complete the questionnaire, approved risk content, policy repository or full compliance dashboard.

Account administration, governance rules, assessments, evidence storage, reminder delivery and complete audit history remain open. Governance actions, reminder planning, CSV/PDF exports and Shadow AI disclosure have authenticated prototype implementations. Do not infer risk from business area or descriptive text.

Before implementing the rules engine, agree the governing sources, questions, thresholds and terminology. A future assessment should retain its rule version and explain its result. This document records that design direction without selecting a governance framework.

The proposed scoring seam is documented in `docs/design/risk-scoring-module.md`. It uses a pure `evaluateAssessment(definition, responses, context)` interface so deterministic validation, evaluation and explanation stay in one deep module. Database and HTTP adapters remain outside that seam. The pure scoring module now exists, but it has no authorised rule content and is not connected to assessment persistence, API routes or the interface.

The authentication seam is documented in `docs/design/authentication-and-authorization.md`. It separates request authentication from action/resource authorisation, denies protected routes by default, and uses persisted accounts plus opaque server-side sessions. Provisional local defaults and remaining production decisions are recorded there.

The proposed assessment seam is documented in `docs/design/governance-assessment-module.md`. It owns draft lifecycle, response validation, concurrency and immutable submission, then hands a completed response set to the separate scoring module. No questionnaire schema or interface exists because content, evidence and permission decisions remain unapproved.

## Follow-up interface increment

`src/themes.css` contains temporary theme overrides and detail-view layout. Theme state is a browser preference, independent of registry data and server permissions. Optional localStorage reads and writes are guarded so storage restrictions do not prevent application use.

Record names open a native read-only dialog showing the already-loaded record fields, dates and Not assessed status. Its explicit Edit record action opens the existing form. No database migration or governance rule is introduced.

The proposed evidence intake seam is documented in `docs/design/policy-and-evidence-handling.md`. It validates candidate bytes against an approved versioned policy and returns a digest-bearing descriptor without writing or serving the file. Upload, retrieval, storage, malware controls and permissions remain deferred until their design and authentication dependencies are approved.

The governance action seam is documented in `docs/design/governance-action-tracking.md`. It owns the three ticket-defined statuses, optimistic version checks, change history and controlled-date timing classification. Persistence, authenticated actor identity, permission checks, API routes and interface integration remain outside the module.

The reminder planning seam is documented in `docs/design/reminder-planning.md`. It creates channel-neutral reminder intents from approved timing rules and a controlled date. Scheduling, recipient resolution, delivery adapters, retries and delivery history remain outside the pure module.

The dashboard summary seam is documented in `docs/design/dashboard-summary.md`. It applies a server-authorised institution/category scope before aggregating registry, risk and action counts, and marks unavailable capabilities as restricted. Role-to-scope mapping, persisted assessment/action sources, API routes and interface integration remain deferred.
