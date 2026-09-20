import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planReminders } from '../../server/domain/reminder-planning.js';

function policy(overrides = {}) {
  return { id: 'synthetic-reminders', version: 'test-v1', status: 'approved', upcomingDays: [7, 1], includeDueToday: true, includeOverdue: true, overdueRepeatDays: 3, ...overrides };
}
const items = [
  { id: 'action-upcoming', kind: 'action', dueDate: '2026-09-27', isClosed: false },
  { id: 'policy-tomorrow', kind: 'policy-review', dueDate: '2026-09-21', isClosed: false },
  { id: 'action-today', kind: 'action', dueDate: '2026-09-20', isClosed: false },
  { id: 'action-overdue', kind: 'action', dueDate: '2026-09-19', isClosed: false },
  { id: 'closed-overdue', kind: 'action', dueDate: '2026-09-01', isClosed: true },
  { id: 'outside-window', kind: 'policy-review', dueDate: '2026-09-25', isClosed: false }
];
const context = { asOfDate: '2026-09-20' };

test('plans channel-neutral reminders in deterministic order', () => {
  const result = planReminders(policy(), items, context);
  assert.equal(result.status, 'planned');
  assert.deepEqual(result.policy, { id: 'synthetic-reminders', version: 'test-v1' });
  assert.deepEqual(result.reminders.map(item => [item.itemId, item.timing]), [
    ['action-overdue', 'overdue'],
    ['action-today', 'due-today'],
    ['policy-tomorrow', 'upcoming'],
    ['action-upcoming', 'upcoming']
  ]);
  assert.ok(result.reminders.every(item => /^[a-f0-9]{64}$/.test(item.idempotencyKey)));
  assert.ok(result.reminders.every(item => !Object.hasOwn(item, 'channel')));
  assert.ok(Object.isFrozen(result));
});

test('same inputs produce the same idempotency keys', () => {
  const first = planReminders(policy(), items, context);
  const second = planReminders(policy(), [...items].reverse(), context);
  assert.deepEqual(second, first);
});

test('overdue cadence starts one day late and repeats at the configured interval', () => {
  const item = [{ id: 'late', kind: 'action', dueDate: '2026-09-19', isClosed: false }];
  assert.equal(planReminders(policy(), item, { asOfDate: '2026-09-20' }).reminders.length, 1);
  assert.equal(planReminders(policy(), item, { asOfDate: '2026-09-21' }).reminders.length, 0);
  assert.equal(planReminders(policy(), item, { asOfDate: '2026-09-23' }).reminders.length, 1);
});

test('closed items and disabled timing categories produce no intents', () => {
  const disabled = policy({ upcomingDays: [], includeDueToday: false, includeOverdue: false, overdueRepeatDays: undefined });
  const result = planReminders(disabled, items, context);
  assert.equal(result.status, 'planned');
  assert.deepEqual(result.reminders, []);
});

test('draft and inconsistent policies fail closed', () => {
  const result = planReminders(policy({ status: 'draft', upcomingDays: [1, 1], overdueRepeatDays: 0 }), items, context);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['POLICY_NOT_APPROVED', 'INVALID_UPCOMING_DAYS', 'INVALID_OVERDUE_CADENCE']);
  assert.equal('reminders' in result, false);
});

test('invalid and duplicate items prevent a partial reminder plan', () => {
  const invalid = [
    { id: 'duplicate', kind: 'email', dueDate: 'not-a-date', isClosed: 'no' },
    { id: 'duplicate', kind: 'action', dueDate: '2026-09-20', isClosed: false }
  ];
  const result = planReminders(policy(), invalid, context);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['INVALID_ITEM_KIND', 'INVALID_ITEM_DUE_DATE', 'INVALID_ITEM_CLOSED_STATE', 'INVALID_ITEM_ID']);
  assert.equal('reminders' in result, false);
});

test('invalid controlled date fails closed', () => {
  const result = planReminders(policy(), items, { asOfDate: '2026-02-30' });
  assert.equal(result.status, 'invalid');
  assert.equal(result.findings.at(-1).code, 'INVALID_AS_OF_DATE');
});
