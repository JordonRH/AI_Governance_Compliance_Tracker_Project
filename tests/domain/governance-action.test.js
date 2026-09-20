import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyActionTiming, createGovernanceAction, governanceActionStatuses, updateGovernanceAction } from '../../server/domain/governance-action.js';

const input = { id: 'action-1', aiUseId: 'fictional-ai-use', assessmentId: 'fictional-assessment', title: 'Document synthetic review', owner: 'Fictional governance team', dueDate: '2026-10-01' };
const context = { actorId: 'fictional-reviewer', timestamp: '2026-09-20T12:00:00.000Z' };

function createdAction() {
  const result = createGovernanceAction(input, context);
  assert.equal(result.status, 'created');
  return result.action;
}

test('creates a linked action with required initial status and history', () => {
  const action = createdAction();
  assert.equal(action.status, 'Not Started');
  assert.equal(action.version, 1);
  assert.equal(action.completedAt, null);
  assert.equal(action.history.length, 1);
  assert.deepEqual(action.history[0].changes.map(item => item.field), ['title', 'owner', 'dueDate', 'status']);
  assert.ok(Object.isFrozen(action));
  assert.deepEqual(governanceActionStatuses, ['Not Started', 'In Progress', 'Complete']);
});

test('updates fields and retains immutable versioned status history', () => {
  const original = createdAction();
  const result = updateGovernanceAction(original, { expectedVersion: 1, owner: 'Fictional action owner', status: 'In Progress' }, { actorId: 'fictional-editor', timestamp: '2026-09-21T10:00:00.000Z' });
  assert.equal(result.status, 'updated');
  assert.equal(result.action.version, 2);
  assert.equal(result.action.owner, 'Fictional action owner');
  assert.equal(result.action.status, 'In Progress');
  assert.deepEqual(result.action.history[1].changes.map(item => item.field), ['owner', 'status']);
  assert.equal(original.version, 1);
  assert.equal(original.status, 'Not Started');
});

test('completion and reopening retain timestamps in history', () => {
  const original = createdAction();
  const complete = updateGovernanceAction(original, { expectedVersion: 1, status: 'Complete' }, { actorId: 'fictional-editor', timestamp: '2026-09-22T10:00:00.000Z' });
  assert.equal(complete.action.completedAt, '2026-09-22T10:00:00.000Z');
  const reopened = updateGovernanceAction(complete.action, { expectedVersion: 2, status: 'In Progress' }, { actorId: 'fictional-editor', timestamp: '2026-09-23T10:00:00.000Z' });
  assert.equal(reopened.action.completedAt, null);
  assert.equal(reopened.action.history.length, 3);
});

test('stale, empty, unknown and invalid updates fail closed', () => {
  const action = createdAction();
  const cases = [
    [{ expectedVersion: 0, status: 'Complete' }, 'VERSION_CONFLICT'],
    [{ expectedVersion: 1 }, 'EMPTY_UPDATE'],
    [{ expectedVersion: 1, notes: 'unsupported' }, 'UNKNOWN_UPDATE_FIELD'],
    [{ expectedVersion: 1, status: 'Blocked' }, 'INVALID_STATUS'],
    [{ expectedVersion: 1, dueDate: '2026-02-30' }, 'INVALID_DUE_DATE']
  ];
  for (const [command, code] of cases) {
    const result = updateGovernanceAction(action, command, context);
    assert.equal(result.status, 'invalid');
    assert.ok(result.findings.some(item => item.code === code));
  }
});

test('no-op updates do not create misleading history', () => {
  const action = createdAction();
  const result = updateGovernanceAction(action, { expectedVersion: 1, owner: action.owner }, context);
  assert.equal(result.status, 'unchanged');
  assert.equal(result.action, action);
  assert.equal(result.action.history.length, 1);
});

test('controlled dates classify overdue, due-today, upcoming and complete actions', () => {
  const action = createdAction();
  assert.deepEqual(classifyActionTiming(action, '2026-10-02'), { status: 'classified', timing: 'overdue', daysFromDueDate: -1 });
  assert.deepEqual(classifyActionTiming(action, '2026-10-01'), { status: 'classified', timing: 'due-today', daysFromDueDate: 0 });
  assert.deepEqual(classifyActionTiming(action, '2026-09-28'), { status: 'classified', timing: 'upcoming', daysFromDueDate: 3 });
  const complete = updateGovernanceAction(action, { expectedVersion: 1, status: 'Complete' }, context).action;
  assert.deepEqual(classifyActionTiming(complete, '2026-10-02'), { status: 'classified', timing: 'complete', daysFromDueDate: null });
});

test('creation rejects invalid links, dates, status and actor context', () => {
  const result = createGovernanceAction({ ...input, aiUseId: '', dueDate: 'not-a-date', status: 'Complete' }, { actorId: '', timestamp: 'bad' });
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['INVALID_AI_USE_LINK', 'INVALID_DUE_DATE', 'INVALID_ACTOR', 'INVALID_TIMESTAMP', 'INVALID_INITIAL_STATUS']);
});
