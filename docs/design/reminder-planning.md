# Action and policy-review reminder planning

Status: Partial implementation for GitHub issue #18
Prepared: 20 September 2026
Decision state: Channel-neutral planning implemented; scheduling, delivery channels, persistence and permissions remain unapproved.

## Current boundary

`server/domain/reminder-planning.js` turns an approved, versioned timing policy plus open action or policy-review due dates into deterministic reminder intents. The caller supplies the date being evaluated. The module does not read the system clock.

A policy explicitly defines upcoming whole-day offsets, whether due-today and overdue reminders are enabled, and the overdue repeat interval. Overdue cadence begins on the first day after the due date and repeats at the configured interval. Closed items never produce reminders.

Each intent contains the item link, kind, due date, timing category, day difference and a SHA-256 idempotency key derived from the policy version, item, evaluation date and timing. Repeating the same run produces the same key.

## Interface

```js
planReminders(policy, items, { asOfDate }) -> reminder plan | validation findings
```

The output is channel-neutral. It contains no email address, notification provider, message template or delivery claim.

## Invariants

1. Only an approved, internally valid timing policy produces a plan.
2. Invalid or duplicate items fail the whole run; partial plans are not emitted.
3. Closed items produce no reminder.
4. Dates use explicit calendar-day comparisons in UTC.
5. Input order does not change reminder order or idempotency keys.
6. The same item/date/policy/timing combination has the same key.
7. Planning does not mean a notification was scheduled, sent or received.
8. No communication channel is assumed.

## Remaining decisions and work

- approve reminder windows and overdue repeat cadence;
- choose in-app, email or another channel and its service configuration;
- define recipient identity and role permissions;
- decide policy-review lifecycle and closed-state mapping;
- persist reminder runs, delivery attempts and acknowledgements;
- define retry, suppression, escalation and timezone rules;
- add a scheduler only after deployment expectations are known;
- test an approved adapter without contacting real recipients.

The pure plan can later feed an authorised delivery adapter. That adapter must enforce idempotency and keep delivery history separate from action status history.
