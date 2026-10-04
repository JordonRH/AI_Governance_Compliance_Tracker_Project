# Reports explorer and configuration redesign

The follow-up request expanded Reports beyond three headline numbers and asked for clearer, better-presented configuration and workflow editing.

## Reports

Six selectable reports cover Registry approvals, all assessment records (including drafts), action progress, current policy reviews, latest submitted risk outcomes per AI use, and business-area distribution. Each report exposes a reconciled total, category counts and percentages, and the underlying records. Fixed statuses include zero counts.

Users can switch between bar charts, doughnut charts and a data table. Chart categories filter the underlying list; category and search filters do not change totals or exports. Changing the historical date pauses exports until the view is refreshed. Reports also support a from/to period: the end-of-day snapshot for the end date remains the detailed view, while the response adds start totals, end totals and category changes for each report. Refresh clears old list filters. Dates represent the end of a UTC day, not an intraday timestamp.

CSV/PDF exports use the selected report and date. PDF includes a bar-chart breakdown. A separate full evidence export retains registry records, submitted assessment evidence, actions and all policy versions. Report selectors are server-validated, and every variant uses existing organisation scope and export permissions.

Policy counts use the latest captured version of each document. Due and overdue dates take precedence over an earlier review receipt. Risk uses one latest submitted result per AI use; assessment totals count every draft/submission separately. Synthetic scoring and the existing history capture boundary are unchanged; pre-capture states are unavailable.

## Configuration and workflow

The configuration screen has four focused sections: Assessment requirements, Workflow settings, Custom capability roles and Version history. Question cards, readable permission names, a version status panel, a save/reference panel and a human-readable history replace the undifferentiated form and raw JSON display.

Workflow cards explain each control, its enabled/disabled effect, an example and its applicability. A process preview updates with edits. It is a preview of the proposed settings; activation still determines what new work uses. Edits survive section changes, required names/wording are validated across sections, and unsaved edits prevent lifecycle actions from discarding them.

The four bounded workflow controls, server validation, lifecycle audit, session revocation and historical snapshots remain in place. No unrestricted workflow builder or scoring-rule editor was added.

## Verification

- All application suites: 81 passed, including 33 API tests.
- Full Playwright suite: 29 passed, including report switching, status totals, chart switching, record filters, date-matched exports, workflow preview, unsaved changes and responsive layouts.
- Existing activation, acknowledgement, permission and historical reconstruction regressions passed.
- Production build and whitespace checks passed.
- Desktop/mobile screenshots and both pages of a rendered sample PDF were visually inspected. Automated accessibility checks cover both existing palettes/themes, with additional workflow and chart checks.
- Final date-filter/validation refinements were rechecked with the API suite and the six affected browser tests.

Fixtures are fictional. The existing sponsor-approval assumption is unchanged. These checks do not assert human UAT, legal compliance or independent production-security acceptance.
