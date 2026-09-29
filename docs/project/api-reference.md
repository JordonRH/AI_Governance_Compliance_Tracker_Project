# Local API reference

Current implementation: 30 September 2026. This is a same-origin local API, not a hosted integration service. Start the app using [development](development.md). Base URL defaults to `http://127.0.0.1:5173/api`; configured TLS changes the protocol. No API key or AI service is required.

## Requests and permissions

POST/PUT/PATCH requests require `Content-Type: application/json`; send `{}` for commands with no fields. Login creates an HttpOnly session cookie; subsequent calls must retain it. Logout/password changes revoke sessions. Sessions last up to eight hours. A forced-password-change account must complete `/auth/password` before accessing normal routes.

Host must be localhost or 127.0.0.1. If you send Origin, it must match the request's protocol/host/port exactly. Do not mix localhost and 127.0.0.1 between login and later calls. The server derives organisation and actor from the session; do not supply an organisation override to read another organisation's data.

In tables, **manager** describes the fixed Administrator/Compliance Officer baseline. Effective user capabilities may additionally grant registry creation/update, assessment review, action/policy management or report export separately; none grants account/configuration administration. **Member** means any of the three authenticated roles. A Staff User can see registry records and policy documents, their own assessments, assigned actions and their own inbox; the dashboard exposes restricted summaries explicitly. Administrators manage accounts, appearance, reminder settings and certificates only within their organisation. TLS activation remains server-operator configuration.

Validation errors use JSON `{ "error": "message" }`, sometimes with `fields` or `findings`. Common statuses: 400 invalid input, 401 authentication required, 403 permission/origin/host/forced-password restriction, 404 unavailable scoped resource, 409 stale assessment or submitted-state conflict, 413 body too large, 415 wrong content type, 429 throttled, 500 unexpected server failure. Action version conflicts currently return 400 with findings. Do not depend on an error's internal database details.

## Routes

All paths below are relative to `/api`. IDs come from create/list responses; field names are case-sensitive. Some persisted metadata uses snake_case (`ai_use_id`, `document_id`) while request payloads use camelCase. Do not assume one casing convention across every response; inspect the returned object.

| Method and path | Access | Request / result |
| --- | --- | --- |
| GET /health | Public | `{status,mode}`; database health check |
| GET /auth/session | Public | `{principal}` or null principal |
| POST /auth/login | Public | `login,password`; returns principal and session cookie |
| POST /auth/logout | Any | `{}`; revokes current session |
| POST /auth/password | Member | `currentPassword,newPassword`; revokes all own sessions |
| GET /accounts | Administrator | Organisation account directory; never password hashes |
| POST /accounts | Administrator | `login,displayName,role,password`; organisation inferred |
| PATCH /accounts/:id | Administrator | `role,status` (`active` or `disabled`), optional `capabilities` and `customRoleId`; blank template removes it, omitted template preserves its snapshot; no self-access removal |
| POST /accounts/:id/password | Administrator | `password` (12-200 characters); forces next-login rotation |
| GET /accounts/audit | Administrator | Recent organisation account-change events |
| GET /governance-configuration | Administrator | Latest saved version, active version/templates, lifecycle revision, version history and activation audit |
| PUT /governance-configuration | Administrator | `expectedVersion,questions,customRoles,workflow`, optional `businessAreas,activate,approvalReference,expectedLifecycleRevision`; set `activate:false` to save a draft; omitted activation preserves legacy save-and-activate behavior |
| POST /governance-configuration/:version/lifecycle | Administrator | `action` activated/retired, `reference`, `expectedLifecycleRevision`; append activation/retirement event |
| POST /assessments/:id/acknowledgements | Owner or assessment reviewer | `policyId,acknowledge:true`; records the current user's receipt for a required draft policy version |
| GET /reports/snapshot | report:export | Optional `asOfDate=YYYY-MM-DD`; historical records, details, counts and coverage start; defaults to today UTC |
| GET /settings | Member | `{appearance}` |
| PUT /settings | Administrator | `appearance`: `srec` or `slate` |
| GET /registry | Member | `{records}`; optional `q` and `businessArea` query strings |
| POST /registry | Manager | Full registry fields below; returns created record |
| GET /registry/:id | Member | Record with latest assessment summary |
| PUT /registry/:id | Manager | Full registry fields; records changes in history |
| GET /registry/:id/history | Member | Scoped record-change events |
| POST /shadow-reports | Member | `name,businessArea,purpose,dataDescription,dataSensitivity`; staff-disclosure provenance retained |
| POST /examples | Manager | `{}`; idempotently adds three fictional registry examples |
| GET /overview | Member | Legacy compact `{total,unassessed,byBusinessArea}` summary |
| GET /dashboard | Member | Role-scoped registry/risk/action/policy summaries; optional `asOfDate=YYYY-MM-DD` |
| GET /assessments | Member | `{assessments}`; Staff sees only own records |
| POST /assessments | Member | `aiUseId`; creates definition-snapshot draft |
| PUT /assessments/:id | Owner or manager | `expectedRevision,responses,submit`; see example below |
| GET /actions | Member | `{actions}`; Staff sees assigned records only |
| GET /action-owners | Manager | Active organisation accounts, display names and roles |
| POST /actions | Manager | `aiUseId,title,ownerAccountId,dueDate`, optional `assessmentId`; linked assessment must be submitted for same AI use |
| PUT /actions/:id | Manager | `expectedVersion` plus changed `title,ownerAccountId,dueDate,status`; status is Not Started/In Progress/Complete |
| GET /policies | Member | Version metadata and checklist questions |
| POST /policies | Manager | `title,filename,mediaType,content,reviewerId,reviewDue,checklist`, optional `documentId`; content is base64; creates next version |
| GET /policies/:id/download | Member | Attachment bytes with safe filename |
| POST /policies/:id/review | Manager | `reviewDue` for next review; marks current version reviewed |
| GET /notifications | Member | Up to 200 latest recipient-scoped notifications |
| POST /notifications/:id/read | Recipient | `{}`; marks own notification read |
| GET /reminders/settings | Manager | `enabled,upcomingDays,repeatDays`; enabled is returned as SQLite 0/1 |
| PUT /reminders/settings | Administrator | Boolean `enabled`, integer `upcomingDays,repeatDays` (1-365) |
| POST /reminders/run | Manager | `{}`; runs current organisation delivery, returns count |
| POST /reminders/plan | Manager | Advanced diagnostic `policy,context`; pure plan, no delivery; contract/examples in domain tests |
| GET /reports/compliance.csv | Manager | CSV attachment; optional `asOfDate` reconstructs captured historical state |
| GET /reports/compliance.pdf | Manager | Paginated PDF attachment; optional `asOfDate` reconstructs captured historical state |
| GET /certificates | Administrator | Transport/staged metadata and bundle path; never key material |
| POST /certificates/generate | Administrator | `{}`; stages a new 30-day local self-signed pair |
| POST /certificates/replace | Administrator | PEM strings `cert,key`; validates and stages matching pair |

Full registry fields: `name` (120 chars), `owner` (120), `businessArea` (120), `purpose` (2000), `dataDescription` (1000), `dataSensitivity` and `approvalStatus`. Sensitivity values: `Not classified`, `Public`, `Internal`, `Confidential`, `Sensitive`. Approval values: `Not reviewed`, `Approved`, `Declined`. These match `server/registry-model.js`; use the exact strings. All full-record fields are required. Policy files are PDF/text, up to 1 MiB decoded; reviewer must be an active Administrator/Compliance Officer. Dates are `YYYY-MM-DD`.

Assessment updates replace the draft response map, not one response at a time. Example shape (use the returned draft revision and question IDs):

```json
{
  "expectedRevision": 1,
  "responses": {"personalData": false, "humanOversight": true, "tested": true, "disclosed": true},
  "submit": true
}
```

For a partial draft use `submit:false` with only answered IDs. Submission requires all required questions and the submitting user's required-policy receipts, and is immutable. Refetch after a revision conflict; never retry with a guessed revision. New assessments use the active applicable definition; submitted snapshots retain their old definition. Current questions/rules are synthetic, not approved framework policy.

Configuration question objects contain `id,label,topic,required`. The four scoring question identifiers must remain present and required. Up to twenty additional boolean evidence questions use `additional-` identifiers; their answers do not alter scores. `businessAreas:[]` means unrestricted applicability. Workflow booleans are `allowLinkedActions`, `mandatoryPolicyReading`, `requireInProgressBeforeCompletion` and `allowReopen`. Scoring-rule payloads and unknown workflow keys are rejected. Save/activation races return 409; retired configurations block new assessments and actions. Existing snapshots remain valid.

Historical reporting requires captured history. Invalid, future or pre-coverage dates return 400. Capture begins at schema-12 upgrade (or organisation creation thereafter). The dashboard date parameter continues to classify current action due dates; use `/reports/snapshot` for historical reconstruction.

## PowerShell session example

Start the default HTTP instance first. This example signs in, lists records and signs out using built-in PowerShell; it does not store a cookie jar or password on disk. Use an account without a pending password change (complete that flow in the UI first).

```powershell
$apiBase = 'http://127.0.0.1:5173/api'
$apiSession = $null
$apiLogin = Read-Host 'Account login'
$apiSecret = Read-Host 'Password' -AsSecureString
$apiPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiSecret)
try {
    $loginBody = @{login=$apiLogin; password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($apiPointer)} | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$apiBase/auth/login" -ContentType 'application/json' -Body $loginBody -SessionVariable apiSession | Out-Null
    Invoke-RestMethod -Uri "$apiBase/registry" -WebSession $apiSession
} finally {
    try {
        if ($apiSession) { Invoke-RestMethod -Method Post -Uri "$apiBase/auth/logout" -ContentType 'application/json' -Body '{}' -WebSession $apiSession | Out-Null }
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($apiPointer)
        Remove-Variable apiSecret,apiPointer,loginBody,apiSession -ErrorAction SilentlyContinue
    }
}
```

For HTTPS, first establish certificate trust using the operations runbook and change the base URL. Do not disable certificate verification to make an integration pass. For exact executable payload examples across the workflow, read `tests/api/registry-api.test.js`; run it with `node --test tests/api/registry-api.test.js` on disposable test data. The app UI remains the supported workflow for ordinary users.
