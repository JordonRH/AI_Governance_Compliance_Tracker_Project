import { finding as issue, freeze, isDateOnly as dateOnly, isTimestamp as timestamp, nonEmptyText as text } from './validation.js';

const statuses = Object.freeze(['Not Started', 'In Progress', 'Complete']);
function commonInputFindings(input) {
  const findings = [];
  if (!text(input?.title, 240)) findings.push(issue('INVALID_TITLE', 'Action title is required and must not exceed 240 characters.', 'title'));
  if (!text(input?.owner, 120)) findings.push(issue('INVALID_OWNER', 'Action owner is required and must not exceed 120 characters.', 'owner'));
  if (!dateOnly(input?.dueDate)) findings.push(issue('INVALID_DUE_DATE', 'Due date must be a real date in YYYY-MM-DD format.', 'dueDate'));
  return findings;
}

function contextFindings(context) {
  const findings = [];
  if (!text(context?.actorId, 120)) findings.push(issue('INVALID_ACTOR', 'A stable actor identifier is required.', 'context.actorId'));
  if (!timestamp(context?.timestamp)) findings.push(issue('INVALID_TIMESTAMP', 'A valid caller-supplied timestamp is required.', 'context.timestamp'));
  return findings;
}

function change(field, from, to) {
  return Object.freeze({ field, from, to });
}

function currentActionFindings(current) {
  if (!current || typeof current !== 'object' || Array.isArray(current)) return [issue('INVALID_CURRENT_ACTION', 'A valid current action is required.', 'current')];
  const findings = [];
  if (!text(current.id, 120) || !text(current.aiUseId, 120) || (current.assessmentId !== undefined && !text(current.assessmentId, 120))) findings.push(issue('INVALID_CURRENT_ACTION', 'Current action links are invalid.', 'current'));
  findings.push(...commonInputFindings(current));
  if (!statuses.includes(current.status) || !Number.isSafeInteger(current.version) || current.version < 1 || !timestamp(current.createdAt) || !timestamp(current.updatedAt) || !Array.isArray(current.history) || current.history.length !== current.version) findings.push(issue('INVALID_CURRENT_ACTION', 'Current action state and version history are invalid.', 'current'));
  if (current.status === 'Complete' ? !timestamp(current.completedAt) : current.completedAt !== null) findings.push(issue('INVALID_CURRENT_ACTION', 'Current action completion timestamp is inconsistent with its status.', 'current.completedAt'));
  for (const [index, entry] of (Array.isArray(current.history) ? current.history : []).entries()) {
    if (entry?.version !== index + 1 || !timestamp(entry?.changedAt) || !text(entry?.changedBy, 120) || !Array.isArray(entry?.changes) || entry.changes.length === 0) findings.push(issue('INVALID_CURRENT_ACTION', 'Current action history is malformed.', `current.history[${index}]`));
  }
  return findings;
}

export function createGovernanceAction(input, context) {
  const findings = [];
  if (!text(input?.id, 120)) findings.push(issue('INVALID_ACTION_ID', 'A stable action identifier is required.', 'id'));
  if (!text(input?.aiUseId, 120)) findings.push(issue('INVALID_AI_USE_LINK', 'A linked AI use identifier is required.', 'aiUseId'));
  if (input?.assessmentId !== undefined && !text(input.assessmentId, 120)) findings.push(issue('INVALID_ASSESSMENT_LINK', 'Assessment identifier must be non-empty when supplied.', 'assessmentId'));
  findings.push(...commonInputFindings(input), ...contextFindings(context));
  if (input?.status !== undefined && input.status !== 'Not Started') findings.push(issue('INVALID_INITIAL_STATUS', 'New actions must start as Not Started.', 'status'));
  if (findings.length) return freeze({ status: 'invalid', findings });

  const action = {
    id: input.id.trim(),
    aiUseId: input.aiUseId.trim(),
    ...(input.assessmentId ? { assessmentId: input.assessmentId.trim() } : {}),
    title: input.title.trim(),
    owner: input.owner.trim(),
    dueDate: input.dueDate,
    status: 'Not Started',
    version: 1,
    createdAt: context.timestamp,
    updatedAt: context.timestamp,
    completedAt: null,
    history: [{
      version: 1,
      changedAt: context.timestamp,
      changedBy: context.actorId.trim(),
      changes: [
        change('title', null, input.title.trim()),
        change('owner', null, input.owner.trim()),
        change('dueDate', null, input.dueDate),
        change('status', null, 'Not Started')
      ]
    }]
  };
  return freeze({ status: 'created', action });
}

export function updateGovernanceAction(current, command, context) {
  const findings = [];
  findings.push(...currentActionFindings(current), ...contextFindings(context));
  if (!Number.isSafeInteger(command?.expectedVersion) || command.expectedVersion !== current.version) findings.push(issue('VERSION_CONFLICT', 'The action changed after it was loaded.', 'expectedVersion'));
  const editable = ['title', 'owner', 'dueDate', 'status'];
  const supplied = editable.filter(field => Object.hasOwn(command || {}, field));
  for (const key of Object.keys(command || {})) if (key !== 'expectedVersion' && !editable.includes(key)) findings.push(issue('UNKNOWN_UPDATE_FIELD', 'The update contains an unsupported field.', key));
  if (supplied.length === 0) findings.push(issue('EMPTY_UPDATE', 'At least one editable field is required.', 'command'));
  const candidate = { title: command?.title ?? current.title, owner: command?.owner ?? current.owner, dueDate: command?.dueDate ?? current.dueDate };
  findings.push(...commonInputFindings(candidate));
  if (command?.status !== undefined && !statuses.includes(command.status)) findings.push(issue('INVALID_STATUS', 'Status must be Not Started, In Progress or Complete.', 'status'));
  if (findings.length) return freeze({ status: 'invalid', findings });

  const normalized = {
    title: candidate.title.trim(),
    owner: candidate.owner.trim(),
    dueDate: candidate.dueDate,
    status: command?.status ?? current.status
  };
  const changes = supplied.filter(field => normalized[field] !== current[field]).map(field => change(field, current[field], normalized[field]));
  if (changes.length === 0) return freeze({ status: 'unchanged', action: current });
  if (context.timestamp <= current.updatedAt) return freeze({ status: 'invalid', findings: [issue('NON_MONOTONIC_TIMESTAMP', 'Update timestamp must be later than the current action timestamp.', 'context.timestamp')] });
  const nextStatus = normalized.status;
  const nextVersion = current.version + 1;
  const action = {
    ...current,
    title: candidate.title.trim(),
    owner: candidate.owner.trim(),
    dueDate: candidate.dueDate,
    status: nextStatus,
    version: nextVersion,
    updatedAt: context.timestamp,
    completedAt: nextStatus === 'Complete' ? (current.status === 'Complete' ? current.completedAt : context.timestamp) : null,
    history: [...current.history, {
      version: nextVersion,
      changedAt: context.timestamp,
      changedBy: context.actorId.trim(),
      changes
    }]
  };
  return freeze({ status: 'updated', action });
}

export function classifyActionTiming(action, asOfDate) {
  if (!action || !statuses.includes(action.status) || !dateOnly(action.dueDate)) return freeze({ status: 'invalid', findings: [issue('INVALID_ACTION', 'A valid action with status and due date is required.', 'action')] });
  if (!dateOnly(asOfDate)) return freeze({ status: 'invalid', findings: [issue('INVALID_AS_OF_DATE', 'asOfDate must be a real date in YYYY-MM-DD format.', 'asOfDate')] });
  if (action.status === 'Complete') return freeze({ status: 'classified', timing: 'complete', daysFromDueDate: null });
  const day = 86400000;
  const difference = (Date.parse(`${action.dueDate}T00:00:00.000Z`) - Date.parse(`${asOfDate}T00:00:00.000Z`)) / day;
  return freeze({
    status: 'classified',
    timing: difference < 0 ? 'overdue' : difference === 0 ? 'due-today' : 'upcoming',
    daysFromDueDate: difference
  });
}

export const governanceActionStatuses = statuses;
