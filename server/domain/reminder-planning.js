import { createHash } from 'node:crypto';

const itemKinds = new Set(['action', 'policy-review']);

function finding(code, message, path) {
  return Object.freeze({ code, message, ...(path ? { path } : {}) });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function text(value, maximum = Infinity) {
  return typeof value === 'string' && value.trim() !== '' && value.trim().length <= maximum;
}

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function policyFindings(policy) {
  const findings = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return [finding('INVALID_POLICY', 'Reminder policy must be an object.', 'policy')];
  if (!text(policy.id, 120)) findings.push(finding('INVALID_POLICY_ID', 'Policy id is required.', 'policy.id'));
  if (!text(policy.version, 120)) findings.push(finding('INVALID_POLICY_VERSION', 'Policy version is required.', 'policy.version'));
  if (policy.status !== 'approved') findings.push(finding('POLICY_NOT_APPROVED', 'Only an approved reminder policy can produce reminder intents.', 'policy.status'));
  if (!Array.isArray(policy.upcomingDays) || new Set(policy.upcomingDays).size !== policy.upcomingDays.length || policy.upcomingDays.some(day => !Number.isSafeInteger(day) || day < 1)) {
    findings.push(finding('INVALID_UPCOMING_DAYS', 'upcomingDays must contain unique positive whole-day offsets.', 'policy.upcomingDays'));
  }
  if (typeof policy.includeDueToday !== 'boolean') findings.push(finding('INVALID_DUE_TODAY_RULE', 'includeDueToday must be boolean.', 'policy.includeDueToday'));
  if (typeof policy.includeOverdue !== 'boolean') findings.push(finding('INVALID_OVERDUE_RULE', 'includeOverdue must be boolean.', 'policy.includeOverdue'));
  if (policy.includeOverdue && (!Number.isSafeInteger(policy.overdueRepeatDays) || policy.overdueRepeatDays < 1)) {
    findings.push(finding('INVALID_OVERDUE_CADENCE', 'overdueRepeatDays must be a positive integer when overdue reminders are enabled.', 'policy.overdueRepeatDays'));
  }
  return findings;
}

function itemFindings(items) {
  if (!Array.isArray(items)) return [finding('INVALID_ITEMS', 'Reminder items must be an array.', 'items')];
  const findings = [];
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    const path = `items[${index}]`;
    if (!text(item?.id, 120) || ids.has(item.id)) findings.push(finding('INVALID_ITEM_ID', 'Item identifiers must be present and unique.', `${path}.id`));
    else ids.add(item.id);
    if (!itemKinds.has(item?.kind)) findings.push(finding('INVALID_ITEM_KIND', 'Item kind must be action or policy-review.', `${path}.kind`));
    if (!dateOnly(item?.dueDate)) findings.push(finding('INVALID_ITEM_DUE_DATE', 'Item dueDate must be a real YYYY-MM-DD date.', `${path}.dueDate`));
    if (typeof item?.isClosed !== 'boolean') findings.push(finding('INVALID_ITEM_CLOSED_STATE', 'isClosed must be boolean.', `${path}.isClosed`));
  }
  return findings;
}

function daysBetween(dueDate, asOfDate) {
  return (Date.parse(`${dueDate}T00:00:00.000Z`) - Date.parse(`${asOfDate}T00:00:00.000Z`)) / 86400000;
}

function keyFor(policy, item, asOfDate, timing) {
  return createHash('sha256').update([policy.id, policy.version, item.kind, item.id, asOfDate, timing].join('\n')).digest('hex');
}

export function planReminders(policy, items, context) {
  const findings = [...policyFindings(policy), ...itemFindings(items)];
  if (!dateOnly(context?.asOfDate)) findings.push(finding('INVALID_AS_OF_DATE', 'asOfDate must be a real YYYY-MM-DD date.', 'context.asOfDate'));
  if (findings.length) return freeze({ status: 'invalid', findings });

  const upcoming = new Set(policy.upcomingDays);
  const reminders = [];
  for (const item of items) {
    if (item.isClosed) continue;
    const difference = daysBetween(item.dueDate, context.asOfDate);
    let timing;
    if (difference > 0 && upcoming.has(difference)) timing = 'upcoming';
    else if (difference === 0 && policy.includeDueToday) timing = 'due-today';
    else if (difference < 0 && policy.includeOverdue && ((Math.abs(difference) - 1) % policy.overdueRepeatDays === 0)) timing = 'overdue';
    if (!timing) continue;
    reminders.push({
      itemId: item.id,
      kind: item.kind,
      dueDate: item.dueDate,
      timing,
      daysFromDueDate: difference,
      idempotencyKey: keyFor(policy, item, context.asOfDate, timing)
    });
  }
  reminders.sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.kind.localeCompare(right.kind) || left.itemId.localeCompare(right.itemId));
  return freeze({
    status: 'planned',
    policy: { id: policy.id, version: policy.version },
    asOfDate: context.asOfDate,
    reminders
  });
}
