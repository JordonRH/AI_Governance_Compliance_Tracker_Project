import { classifyActionTiming } from './governance-action.js';

const categories = Object.freeze(['Education', 'Administration', 'Research']);

function finding(code, message, path) {
  return Object.freeze({ code, message, ...(path ? { path } : {}) });
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function text(value) {
  return typeof value === 'string' && value.trim() !== '';
}
function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateScope(scope) {
  const findings = [];
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) return [finding('INVALID_SCOPE', 'Dashboard scope must be an object.', 'scope')];
  if (!text(scope.id)) findings.push(finding('INVALID_SCOPE_ID', 'A stable authorised scope id is required.', 'scope.id'));
  if (!Array.isArray(scope.institutionIds) || scope.institutionIds.length === 0 || new Set(scope.institutionIds).size !== scope.institutionIds.length || scope.institutionIds.some(id => !text(id))) findings.push(finding('INVALID_INSTITUTION_SCOPE', 'At least one unique institution id is required.', 'scope.institutionIds'));
  if (!Array.isArray(scope.categories) || scope.categories.length === 0 || new Set(scope.categories).size !== scope.categories.length || scope.categories.some(category => !categories.includes(category))) findings.push(finding('INVALID_CATEGORY_SCOPE', 'Scope categories must be unique supported categories.', 'scope.categories'));
  if (typeof scope.includeRiskSummary !== 'boolean') findings.push(finding('INVALID_RISK_CAPABILITY', 'includeRiskSummary must be boolean.', 'scope.includeRiskSummary'));
  if (typeof scope.includeActionSummary !== 'boolean') findings.push(finding('INVALID_ACTION_CAPABILITY', 'includeActionSummary must be boolean.', 'scope.includeActionSummary'));
  return findings;
}

function validateRecords(records) {
  if (!Array.isArray(records)) return [finding('INVALID_RECORDS', 'Registry records must be an array.', 'records')];
  const findings = [], ids = new Set();
  for (const [index, record] of records.entries()) {
    const path = `records[${index}]`;
    if (!text(record?.id) || ids.has(record.id)) findings.push(finding('INVALID_RECORD_ID', 'Record ids must be present and unique.', `${path}.id`));
    else ids.add(record.id);
    if (!text(record?.institutionId)) findings.push(finding('INVALID_RECORD_INSTITUTION', 'Record institution id is required.', `${path}.institutionId`));
    if (!categories.includes(record?.category)) findings.push(finding('INVALID_RECORD_CATEGORY', 'Record category is unsupported.', `${path}.category`));
    if (!['Not assessed', 'Assessed'].includes(record?.assessmentStatus)) findings.push(finding('INVALID_ASSESSMENT_STATUS', 'Assessment status must be Not assessed or Assessed.', `${path}.assessmentStatus`));
    if (record?.assessmentStatus === 'Assessed' && (!text(record?.riskOutcome?.id) || !text(record?.riskOutcome?.label))) findings.push(finding('MISSING_RISK_OUTCOME', 'Assessed records require a risk outcome id and label.', `${path}.riskOutcome`));
    if (record?.assessmentStatus === 'Not assessed' && record?.riskOutcome !== undefined) findings.push(finding('UNEXPECTED_RISK_OUTCOME', 'Not assessed records must not include a risk outcome.', `${path}.riskOutcome`));
  }
  return findings;
}

function validateActions(actions) {
  if (!Array.isArray(actions)) return [finding('INVALID_ACTIONS', 'Actions must be an array.', 'actions')];
  const findings = [], ids = new Set();
  for (const [index, action] of actions.entries()) {
    const path = `actions[${index}]`;
    if (!text(action?.id) || ids.has(action.id)) findings.push(finding('INVALID_ACTION_ID', 'Action ids must be present and unique.', `${path}.id`));
    else ids.add(action.id);
    if (!text(action?.aiUseId)) findings.push(finding('INVALID_ACTION_LINK', 'Action AI use link is required.', `${path}.aiUseId`));
    if (!['Not Started', 'In Progress', 'Complete'].includes(action?.status)) findings.push(finding('INVALID_ACTION_STATUS', 'Action status is unsupported.', `${path}.status`));
    if (!dateOnly(action?.dueDate)) findings.push(finding('INVALID_ACTION_DUE_DATE', 'Action due date must be a real YYYY-MM-DD date.', `${path}.dueDate`));
  }
  return findings;
}

export function buildDashboardSnapshot(scope, records, actions, context) {
  const findings = [...validateScope(scope), ...validateRecords(records), ...validateActions(actions)];
  if (!dateOnly(context?.asOfDate)) findings.push(finding('INVALID_AS_OF_DATE', 'asOfDate must be a real YYYY-MM-DD date.', 'context.asOfDate'));
  if (context?.category !== undefined && !categories.includes(context.category)) findings.push(finding('INVALID_CATEGORY_FILTER', 'Category filter is unsupported.', 'context.category'));
  if (context?.category !== undefined && Array.isArray(scope?.categories) && !scope.categories.includes(context.category)) findings.push(finding('CATEGORY_OUTSIDE_SCOPE', 'Category filter is outside the authorised scope.', 'context.category'));
  if (findings.length) return freeze({ status: 'invalid', findings });

  const institutions = new Set(scope.institutionIds);
  const allowedCategories = new Set(scope.categories);
  const visible = records.filter(record => institutions.has(record.institutionId) && allowedCategories.has(record.category) && (!context.category || record.category === context.category));
  const visibleIds = new Set(visible.map(record => record.id));
  const byCategory = Object.fromEntries(categories.map(category => [category, visible.filter(record => record.category === category).length]));
  const notAssessed = visible.filter(record => record.assessmentStatus === 'Not assessed').length;
  const assessed = visible.length - notAssessed;

  const risk = scope.includeRiskSummary ? (() => {
    const byOutcome = {};
    for (const record of visible.filter(item => item.assessmentStatus === 'Assessed')) {
      const key = record.riskOutcome.id;
      byOutcome[key] ??= { id: key, label: record.riskOutcome.label, count: 0 };
      if (byOutcome[key].label !== record.riskOutcome.label) return { conflict: key };
      byOutcome[key].count += 1;
    }
    if (Object.values(byOutcome).some(value => value.conflict)) return null;
    return { status: 'available', total: assessed, byOutcome: Object.values(byOutcome).sort((left, right) => left.id.localeCompare(right.id)) };
  })() : { status: 'restricted' };
  if (risk === null || risk?.conflict) return freeze({ status: 'invalid', findings: [finding('RISK_LABEL_CONFLICT', 'The same risk outcome id has conflicting labels.', 'records')] });

  const actionSummary = scope.includeActionSummary ? (() => {
    const relevant = actions.filter(action => visibleIds.has(action.aiUseId));
    const open = relevant.filter(action => action.status !== 'Complete');
    const overdue = open.filter(action => classifyActionTiming(action, context.asOfDate).timing === 'overdue').length;
    return {
      status: 'available',
      total: relevant.length,
      outstanding: open.length,
      overdue,
      byStatus: Object.fromEntries(['Not Started', 'In Progress', 'Complete'].map(status => [status, relevant.filter(action => action.status === status).length]))
    };
  })() : { status: 'restricted' };

  return freeze({
    status: 'complete',
    scopeId: scope.id,
    filter: { category: context.category ?? null, asOfDate: context.asOfDate },
    registry: { total: visible.length, assessed, notAssessed, byCategory },
    risk,
    actions: actionSummary
  });
}
