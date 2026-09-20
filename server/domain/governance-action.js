const statuses = Object.freeze(['Not Started', 'In Progress', 'Complete']);

function issue(code, message, path) {
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

function timestamp(value) {
  return typeof value === 'string' && value !== '' && !Number.isNaN(Date.parse(value));
}

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
  if (!current || typeof current !== 'object' || !Number.isSafeInteger(current.version) || !Array.isArray(current.history)) {
    return freeze({ status: 'invalid', findings: [issue('INVALID_CURRENT_ACTION', 'A valid current action is required.', 'current')] });
  }
  findings.push(...contextFindings(context));
  if (!Number.isSafeInteger(command?.expectedVersion) || command.expectedVersion !== current.version) findings.push(issue('VERSION_CONFLICT', 'The action changed after it was loaded.', 'expectedVersion'));
  const editable = ['title', 'owner', 'dueDate', 'status'];
  const supplied = editable.filter(field => Object.hasOwn(command || {}, field));
  for (const key of Object.keys(command || {})) if (key !== 'expectedVersion' && !editable.includes(key)) findings.push(issue('UNKNOWN_UPDATE_FIELD', 'The update contains an unsupported field.', key));
  if (supplied.length === 0) findings.push(issue('EMPTY_UPDATE', 'At least one editable field is required.', 'command'));
  const candidate = { title: command?.title ?? current.title, owner: command?.owner ?? current.owner, dueDate: command?.dueDate ?? current.dueDate };
  findings.push(...commonInputFindings(candidate));
  if (command?.status !== undefined && !statuses.includes(command.status)) findings.push(issue('INVALID_STATUS', 'Status must be Not Started, In Progress or Complete.', 'status'));
  if (findings.length) return freeze({ status: 'invalid', findings });

  const changes = supplied.filter(field => command[field] !== current[field]).map(field => change(field, current[field], typeof command[field] === 'string' ? command[field].trim() : command[field]));
  if (changes.length === 0) return freeze({ status: 'unchanged', action: current });
  const nextStatus = command.status ?? current.status;
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
