import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDashboardSnapshot } from '../../server/domain/dashboard-summary.js';

const scope = { id: 'synthetic-scope', institutionIds: ['institution-a'], categories: ['Education', 'Research'], includeRiskSummary: true, includeActionSummary: true };
const records = [
  { id: 'a-education', institutionId: 'institution-a', category: 'Education', assessmentStatus: 'Not assessed' },
  { id: 'a-research', institutionId: 'institution-a', category: 'Research', assessmentStatus: 'Assessed', riskOutcome: { id: 'synthetic-review', label: 'Synthetic review' } },
  { id: 'a-admin-hidden', institutionId: 'institution-a', category: 'Administration', assessmentStatus: 'Assessed', riskOutcome: { id: 'synthetic-other', label: 'Synthetic other' } },
  { id: 'b-hidden', institutionId: 'institution-b', category: 'Education', assessmentStatus: 'Assessed', riskOutcome: { id: 'secret', label: 'Must not leak' } }
];
const actions = [
  { id: 'open-visible', aiUseId: 'a-education', status: 'In Progress', dueDate: '2026-09-19' },
  { id: 'done-visible', aiUseId: 'a-research', status: 'Complete', dueDate: '2026-09-18' },
  { id: 'hidden-action', aiUseId: 'b-hidden', status: 'Not Started', dueDate: '2026-09-01' }
];
const context = { asOfDate: '2026-09-21' };

test('filters before aggregating and reconciles visible totals', () => {
  const result = buildDashboardSnapshot(scope, records, actions, context);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.registry, { total: 2, assessed: 1, notAssessed: 1, byCategory: { Education: 1, Research: 1 } });
  assert.deepEqual(result.risk, { status: 'available', total: 1, byOutcome: [{ id: 'synthetic-review', label: 'Synthetic review', count: 1 }] });
  assert.deepEqual(result.actions, { status: 'available', total: 2, outstanding: 1, overdue: 1, byStatus: { 'Not Started': 0, 'In Progress': 1, Complete: 1 } });
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(result.registry.assessed + result.registry.notAssessed, result.registry.total);
  assert.equal(Object.values(result.registry.byCategory).reduce((sum, count) => sum + count, 0), result.registry.total);
  assert.ok(Object.isFrozen(result));
});

test('restricted summaries are explicit rather than reported as zero', () => {
  const result = buildDashboardSnapshot({ ...scope, includeRiskSummary: false, includeActionSummary: false }, records, actions, context);
  assert.deepEqual(result.risk, { status: 'restricted' });
  assert.deepEqual(result.actions, { status: 'restricted' });
  assert.equal(result.registry.total, 2);
});

test('authorised category filters preserve reconciliation', () => {
  const result = buildDashboardSnapshot(scope, records, actions, { ...context, category: 'Research' });
  assert.equal(result.registry.total, 1);
  assert.deepEqual(result.registry.byCategory, { Education: 0, Research: 1 });
  assert.equal(result.risk.total, 1);
  assert.equal(result.actions.total, 1);
});

test('category filters outside scope fail closed', () => {
  const result = buildDashboardSnapshot(scope, records, actions, { ...context, category: 'Administration' });
  assert.equal(result.status, 'invalid');
  assert.ok(result.findings.some(item => item.code === 'CATEGORY_OUTSIDE_SCOPE'));
});

test('invalid source data prevents partial summaries', () => {
  const badRecords = [...records, { id: 'a-education', institutionId: 'institution-a', category: 'Education', assessmentStatus: 'Unknown' }];
  const result = buildDashboardSnapshot(scope, badRecords, actions, context);
  assert.equal(result.status, 'invalid');
  assert.ok(result.findings.some(item => item.code === 'INVALID_RECORD_ID'));
  assert.ok(result.findings.some(item => item.code === 'INVALID_ASSESSMENT_STATUS'));
  assert.equal('registry' in result, false);
});

test('controlled date changes overdue counts deterministically', () => {
  const before = buildDashboardSnapshot(scope, records, actions, { asOfDate: '2026-09-19' });
  const after = buildDashboardSnapshot(scope, records, actions, { asOfDate: '2026-09-20' });
  assert.equal(before.actions.overdue, 0);
  assert.equal(after.actions.overdue, 1);
});


test('malformed data outside the authorised scope cannot invalidate or leak into the snapshot', () => {
  const outside = [...records, { id: '', institutionId: 'institution-b', category: 'Education', assessmentStatus: 'Unknown' }];
  const outsideActions = [...actions, { id: '', aiUseId: 'b-hidden', status: 'Unknown', dueDate: 'invalid' }];
  const result = buildDashboardSnapshot(scope, outside, outsideActions, context);
  assert.equal(result.status, 'complete');
  assert.equal(result.registry.total, 2);
  assert.equal(result.actions.total, 2);
});
