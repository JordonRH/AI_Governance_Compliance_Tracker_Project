# Governance action tracking design

Status: Partial implementation for GitHub issue #17
Prepared: 20 September 2026
Decision state: Pure lifecycle and timing aggregate implemented; persistence, permissions and interface remain unapproved.

## Current boundary

`server/domain/governance-action.js` creates and updates action records without database or HTTP access. Each action has a stable identifier, linked AI use, optional assessment link, title, owner, due date, one of the ticket-defined statuses, an optimistic version and immutable change history.

Supported statuses are **Not Started**, **In Progress** and **Complete**. New actions always begin as Not Started. Updates require the version the caller loaded. A stale version fails closed instead of overwriting another change. Completion and reopening timestamps remain traceable through history.

`classifyActionTiming(action, asOfDate)` uses a caller-supplied date and returns complete, overdue, due-today or upcoming. It does not read the system clock, schedule work or send notifications.

## Interfaces

```js
createGovernanceAction(input, context)
updateGovernanceAction(current, command, context)
classifyActionTiming(action, asOfDate)
```

The caller supplies stable actor and timestamp values after authentication and authorisation. The domain module records those values but does not decide whether that actor has permission.

## Invariants

1. Every action links to one AI use and may link to one assessment.
2. Owner, real calendar due date and one of the three named statuses are required.
3. New actions start as Not Started.
4. Each material change increments the version and adds changed fields, actor and timestamp to history.
5. No-op updates do not create history.
6. Stale updates fail with a version conflict.
7. Complete actions are never classified as overdue.
8. Timing depends on an explicit date, making tests and later reminder jobs repeatable.

## Remaining decisions and work

- approve who may create, reassign, update, complete or reopen actions;
- decide whether assessment links are required and whether links may change;
- approve status transition restrictions and cancellation/blocked handling;
- define owner identity once the account model exists;
- choose persistence, retention and audit-event requirements;
- add authorised API routes and role-appropriate interface;
- define reminder windows and channels under issue #18.

The current module is not an authorisation boundary. API adapters must deny access until issue #11 role decisions are implemented.
