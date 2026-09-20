import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateAssessment } from '../../server/domain/risk-scoring.js';

function definition(overrides = {}) {
  return {
    id: 'synthetic-demo', version: 'test-v1', status: 'approved', effectiveFrom: '2026-09-20',
    approval: { approvedAt: '2026-09-20T00:00:00.000Z', approvedBy: 'Test fixture only' },
    appliesTo: ['Education', 'Administration', 'Research'],
    sources: [{ id: 'synthetic-source', reference: 'Synthetic test source; not governance policy.' }],
    questions: [
      { id: 'usesPersonalData', type: 'boolean', required: true },
      { id: 'oversight', type: 'singleChoice', required: true, options: ['documented', 'absent'] },
      { id: 'affectedPeople', type: 'number', required: true }
    ],
    outcomes: [{ id: 'review', label: 'Synthetic review' }, { id: 'baseline', label: 'Synthetic baseline' }],
    rules: [
      { id: 'personal-data-review', priority: 10, outcomeId: 'review', sourceIds: ['synthetic-source'], explanation: 'Synthetic personal-data condition matched.', conditions: [{ input: 'response', id: 'usesPersonalData', operator: 'equals', value: true }], actions: [{ id: 'human-review', kind: 'required', label: 'Complete a synthetic human review.' }] },
      { id: 'scale-review', priority: 20, outcomeId: 'review', sourceIds: ['synthetic-source'], explanation: 'Synthetic scale condition matched.', conditions: [{ input: 'response', id: 'affectedPeople', operator: 'greaterThanOrEqual', value: 100 }] },
      { id: 'fallback', priority: 100, outcomeId: 'baseline', sourceIds: ['synthetic-source'], explanation: 'Synthetic fallback condition matched.', conditions: [{ input: 'response', id: 'usesPersonalData', operator: 'equals', value: false }, { input: 'response', id: 'affectedPeople', operator: 'lessThanOrEqual', value: 99 }] }
    ],
    ...overrides
  };
}
const responses = { usesPersonalData: true, oversight: 'documented', affectedPeople: 120 };
const context = { category: 'Education', evaluatedAt: '2026-09-20T10:00:00.000Z' };

test('returns a deterministic trace ordered by explicit rule priority', () => {
  const result = evaluateAssessment(definition(), responses, context);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.definition, { id: 'synthetic-demo', version: 'test-v1' });
  assert.deepEqual(result.outcome, { id: 'review', label: 'Synthetic review' });
  assert.deepEqual(result.triggeredRules.map(rule => rule.id), ['personal-data-review', 'scale-review']);
  assert.deepEqual(result.triggeredRules[0].responseIds, ['usesPersonalData']);
  assert.deepEqual(result.triggeredRules[0].sourceIds, ['synthetic-source']);
  assert.deepEqual(result.actions, [{ id: 'human-review', kind: 'required', label: 'Complete a synthetic human review.' }]);
  assert.equal('approval' in result, false);
  assert.equal('compliance' in result, false);
  assert.ok(Object.isFrozen(result));
});

test('input and definition ordering do not change the result', () => {
  const first = evaluateAssessment(definition(), responses, context);
  const reordered = definition({ rules: [...definition().rules].reverse() });
  const second = evaluateAssessment(reordered, { affectedPeople: 120, oversight: 'documented', usesPersonalData: true }, context);
  assert.deepEqual(second, first);
});

test('draft and retired definitions fail closed without an outcome', () => {
  for (const status of ['draft', 'retired']) {
    const result = evaluateAssessment(definition({ status }), responses, context);
    assert.equal(result.status, 'invalid');
    assert.ok(result.findings.some(item => item.code === 'DEFINITION_NOT_APPROVED'));
    assert.equal('outcome' in result, false);
  }
});

test('missing, malformed and unknown responses return stable findings', () => {
  const result = evaluateAssessment(definition(), { usesPersonalData: 'yes', extra: true }, context);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['UNKNOWN_RESPONSE', 'INVALID_RESPONSE_VALUE', 'MISSING_REQUIRED_RESPONSE', 'MISSING_REQUIRED_RESPONSE']);
  assert.equal('outcome' in result, false);
});

test('definition inconsistencies fail before responses are evaluated', () => {
  const broken = definition();
  broken.rules[1].priority = 10;
  broken.rules[0].sourceIds = ['missing-source'];
  broken.rules[2].outcomeId = 'missing-outcome';
  const result = evaluateAssessment(broken, responses, context);
  assert.equal(result.status, 'invalid');
  assert.ok(result.findings.some(item => item.code === 'AMBIGUOUS_RULE_PRIORITY'));
  assert.ok(result.findings.some(item => item.code === 'INVALID_RULE_SOURCE'));
  assert.ok(result.findings.some(item => item.code === 'UNKNOWN_OUTCOME_REFERENCE'));
});

test('category applicability and unknown context fail closed', () => {
  const result = evaluateAssessment(definition({ appliesTo: ['Research'] }), responses, { ...context, unexpected: true });
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['UNKNOWN_CONTEXT_INPUT', 'DEFINITION_NOT_APPLICABLE']);
});

test('a completed assessment with no matching rule has no inferred outcome', () => {
  const noFallback = definition({ rules: [definition().rules[0]] });
  const result = evaluateAssessment(noFallback, { usesPersonalData: false, oversight: 'documented', affectedPeople: 1 }, context);
  assert.equal(result.status, 'invalid');
  assert.equal(result.findings[0].code, 'NO_MATCHING_OUTCOME');
});


test('malformed dates, typed conditions and rule actions fail closed without throwing', () => {
  const badDate = evaluateAssessment(definition({ effectiveFrom: '2026-02-30' }), responses, context);
  assert.ok(badDate.findings.some(item => item.code === 'INVALID_EFFECTIVE_DATE'));

  const badApproval = definition();
  badApproval.approval.approvedAt = 'not-a-timestamp';
  assert.ok(evaluateAssessment(badApproval, responses, context).findings.some(item => item.code === 'MISSING_APPROVAL_RECORD'));

  const badCondition = definition();
  badCondition.rules[0].conditions[0].value = 'true';
  assert.ok(evaluateAssessment(badCondition, responses, context).findings.some(item => item.code === 'INVALID_CONDITION_VALUE'));

  const badActions = definition();
  badActions.rules[0].actions = {};
  assert.ok(evaluateAssessment(badActions, responses, context).findings.some(item => item.code === 'INVALID_RULE_ACTIONS'));
});

test('conflicting repeated action identifiers fail closed', () => {
  const broken = definition();
  broken.rules[1].actions = [{ id: 'human-review', kind: 'recommended', label: 'Conflicting action.' }];
  const result = evaluateAssessment(broken, responses, context);
  assert.equal(result.status, 'invalid');
  assert.ok(result.findings.some(item => item.code === 'CONFLICTING_ACTION_DEFINITION'));
});
