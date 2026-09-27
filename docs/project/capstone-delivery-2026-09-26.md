# Ordered capstone delivery record

Date: 26 September 2026. User direction: implement the audit improvements in order, update their tickets, and commit each completed batch. Work performed by the coding assistant under Jordon's direction; no teammate contribution, sponsor approval or human UAT is inferred.

| Batch | Commit | Delivery | Tickets |
| --- | --- | --- | --- |
| Existing-work checkpoint | 2073a25 | Workspace redesign, admin account controls, styles and audit baseline | #7, #11, #24, #25, #34 |
| 1 | f2f4f9d | Valid/transactional examples, empty-dashboard scope/date handling, Vite CSP, safe/visible errors | #12, #19, #25, #26, #28, #29 |
| 2 | 48bfe71 | Versioned assessment drafts/submission and integrated explainable demo risk | #4, #9, #14, #15 |
| 3 | 38d606f | Assigned action UI, submitted-assessment links and history | #17 |
| 4 | 505bb70 | Scoped versioned policy repository and review dates | #16 |
| 5 | a717030; 0d29684 | Scheduled in-app reminders, settings, scoped inbox, deduplication; corrected browser selector | #18 |
| 6 | 7cfd72e | Complete evidence exports and connected dashboard summaries | #19, #22, #24 |
| 7 | 0dcd02e | Registry search/details, disclosure queue, field errors and decision history | #12, #23, #25 |
| 8 | 8014334 | Own password, forced post-reset rotation, throttling, audit viewer, optional TLS and storage plan | #7, #11, #28 |
| Final QA/handover | See Git history | Accessibility scans, ownership/version and read-summary consistency, UTF-8 normalization, current documentation | #25, #26, #27, #29, #32, #33 |

## Verification and evidence boundaries

- Application tests use disposable SQLite data and cover roles, isolation, revision conflicts, immutable assessment results, action ownership, policy validation/downloads, inbox delivery and password lifecycle.
- Browser tests exercise account management, both organisation styles, required forms, registry/disclosure, saved assessments, actions, files and reminders.
- Automated accessibility checks cover all workspace pages in light/dark modes and SREC/Slate palettes; mobile/tablet width checks and unexpected page-error checks are included.
- PDF QA rendered a long-text two-page fixture and checked common accented Latin text, horizontal margins, page numbering, wrapping and readable sections.
- A 500-record registry/CSV check remains green. There is no claim of large-scale load testing.
- Two browser failures were selector ambiguity, not missing saved records. Both were corrected; ticket comments record the corrected verification results rather than claiming the initial runs passed.
- The normal local database was not populated with test fixtures. Automated mutation workflows use temporary databases. Live verification uses read-only pages/API queries and a temporary login session.

## Remaining human/operational requirements

Sponsor-approved questions/rules/framework interpretation; representative SME/screen-reader UAT; independent clean-checkout/security review; trusted TLS certificate and encrypted-storage setup evidence; retention policy; research paper/reflection and actual sponsor demonstration/handover.

These are kept open in tickets. The prototype provides a full demonstration path while preserving the distinction between implemented software and external acceptance.

Final verification: 66 application tests and 13 browser tests passed; production build passed; npm audit reported zero vulnerabilities. Automated accessibility scans found no violations in the tested pages/themes. The live local instance returned successful responses for all 11 workspace screens and scoped APIs, with no browser page errors; its registry remained empty.
