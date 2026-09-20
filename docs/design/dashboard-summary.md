# Scoped dashboard summary design

Status: Partial implementation for GitHub issue #19
Prepared: 21 September 2026
Decision state: Policy-neutral scoped aggregation implemented; authenticated role mapping and UI integration remain unapproved.

## Current boundary

`server/domain/dashboard-summary.js` builds a deterministic snapshot from registry records and governance actions after applying an authorised scope. The scope lists permitted institutions and categories and whether risk and action summaries are available. The module does not accept role names or infer permissions.

Filtering happens before aggregation. Records outside the scope cannot affect totals, outcome labels or action counts. A category filter outside the scope fails closed. Restricted risk/action summaries are returned as `restricted`, not as zero, so the interface cannot confuse unavailable information with an empty result.

Registry totals reconcile across assessment state and category. Risk summaries count only assessed visible records. Action summaries count only actions linked to visible records and use the controlled-date action timing classifier for overdue totals.

## Interface

```js
buildDashboardSnapshot(scope, records, actions, { asOfDate, category? })
```

An authentication/authorisation adapter must create the scope. Browser input must never directly grant institutions, categories or capabilities.

## Invariants

1. Scope is applied before any aggregation.
2. Unsupported or out-of-scope filters fail closed.
3. Assessed plus not assessed equals visible registry total.
4. Category counts sum to visible registry total.
5. Risk totals equal visible assessed records.
6. Restricted information is marked restricted rather than represented as zero.
7. Actions only count when linked to a visible AI-use record.
8. Overdue totals use an explicit date and exclude complete actions.
9. Invalid source data prevents a partial snapshot.

## Remaining decisions and work

- approve institution/department boundaries and the role-to-scope matrix;
- connect scope creation to server-enforced authentication and authorisation;
- approve risk labels and persisted assessment-result shape;
- persist governance actions and define visibility rules for owners/reviewers;
- add scoped API contracts and role-appropriate interface states;
- decide whether users may filter across departments or only within one scope;
- reconcile the proposal High priority with the spreadsheet Medium priority;
- test every approved role/scope combination and direct API access.

The existing overview remains an unauthenticated registry scaffold. This module is not wired into it until the role model and persisted risk/action sources exist.
