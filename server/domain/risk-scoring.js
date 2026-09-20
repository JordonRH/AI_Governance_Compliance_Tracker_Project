const states = new Set(['draft', 'approved', 'retired']);
const questionTypes = new Set(['boolean', 'singleChoice', 'number']);
const operators = new Set(['equals', 'oneOf', 'greaterThanOrEqual', 'lessThanOrEqual']);
const contextFields = new Set(['category']);
const categories = new Set(['Education', 'Administration', 'Research']);

function finding(code, message, path) {
  return Object.freeze({ code, message, ...(path ? { path } : {}) });
}

function immutable(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

function text(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function validateDefinition(definition) {
  const findings = [];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    return [finding('INVALID_DEFINITION', 'The assessment definition must be an object.', 'definition')];
  }
  for (const key of ['id', 'version', 'effectiveFrom']) {
    if (!text(definition[key])) findings.push(finding('INVALID_DEFINITION_FIELD', `${key} is required.`, `definition.${key}`));
  }
  if (!states.has(definition.status)) findings.push(finding('INVALID_DEFINITION_STATE', 'Definition status must be draft, approved or retired.', 'definition.status'));
  else if (definition.status !== 'approved') findings.push(finding('DEFINITION_NOT_APPROVED', 'Only an approved definition can produce an evaluation.', 'definition.status'));
  if (!definition.approval || !text(definition.approval.approvedAt) || !text(definition.approval.approvedBy)) {
    findings.push(finding('MISSING_APPROVAL_RECORD', 'An approval record with approvedAt and approvedBy is required.', 'definition.approval'));
  }
  if (!Array.isArray(definition.sources) || definition.sources.length === 0) {
    findings.push(finding('MISSING_SOURCE_REFERENCES', 'At least one source reference is required.', 'definition.sources'));
  }
  const sources = new Set();
  for (const [index, source] of (definition.sources || []).entries()) {
    if (!text(source?.id) || sources.has(source.id) || !text(source?.reference)) findings.push(finding('INVALID_SOURCE_REFERENCE', 'Source references need unique identifiers and reference text.', `definition.sources[${index}]`));
    else sources.add(source.id);
  }

  const questions = new Map();
  if (!Array.isArray(definition.questions) || definition.questions.length === 0) findings.push(finding('MISSING_QUESTIONS', 'At least one question is required.', 'definition.questions'));
  for (const [index, question] of (definition.questions || []).entries()) {
    const path = `definition.questions[${index}]`;
    if (!text(question?.id) || questions.has(question.id)) findings.push(finding('INVALID_QUESTION_ID', 'Question identifiers must be present and unique.', `${path}.id`));
    else questions.set(question.id, question);
    if (!questionTypes.has(question?.type)) findings.push(finding('INVALID_QUESTION_TYPE', 'Question type must be boolean, singleChoice or number.', `${path}.type`));
    if (question?.type === 'singleChoice' && (!Array.isArray(question.options) || question.options.length === 0 || new Set(question.options).size !== question.options.length || question.options.some(option => !text(option)))) {
      findings.push(finding('INVALID_QUESTION_OPTIONS', 'Single-choice questions require unique non-empty options.', `${path}.options`));
    }
  }

  const outcomes = new Map();
  if (!Array.isArray(definition.outcomes) || definition.outcomes.length === 0) findings.push(finding('MISSING_OUTCOMES', 'At least one outcome is required.', 'definition.outcomes'));
  for (const [index, outcome] of (definition.outcomes || []).entries()) {
    if (!text(outcome?.id) || outcomes.has(outcome.id) || !text(outcome?.label)) findings.push(finding('INVALID_OUTCOME', 'Outcomes need unique identifiers and display labels.', `definition.outcomes[${index}]`));
    else outcomes.set(outcome.id, outcome);
  }

  const priorities = new Set();
  const rules = new Set();
  if (!Array.isArray(definition.rules) || definition.rules.length === 0) findings.push(finding('MISSING_RULES', 'At least one deterministic rule is required.', 'definition.rules'));
  for (const [index, rule] of (definition.rules || []).entries()) {
    const path = `definition.rules[${index}]`;
    if (!text(rule?.id) || rules.has(rule.id)) findings.push(finding('INVALID_RULE_ID', 'Rule identifiers must be present and unique.', `${path}.id`));
    else rules.add(rule.id);
    if (!Number.isSafeInteger(rule?.priority) || priorities.has(rule.priority)) findings.push(finding('AMBIGUOUS_RULE_PRIORITY', 'Each rule requires a unique integer priority.', `${path}.priority`));
    else priorities.add(rule.priority);
    if (!outcomes.has(rule?.outcomeId)) findings.push(finding('UNKNOWN_OUTCOME_REFERENCE', 'The rule references an unknown outcome.', `${path}.outcomeId`));
    if (!text(rule?.explanation)) findings.push(finding('MISSING_RULE_EXPLANATION', 'Each rule requires approved explanation text.', `${path}.explanation`));
    if (!Array.isArray(rule?.sourceIds) || rule.sourceIds.length === 0 || rule.sourceIds.some(id => !sources.has(id))) findings.push(finding('INVALID_RULE_SOURCE', 'Each rule must reference known sources.', `${path}.sourceIds`));
    if (!Array.isArray(rule?.conditions)) findings.push(finding('INVALID_RULE_CONDITIONS', 'Rule conditions must be an array.', `${path}.conditions`));
    for (const [conditionIndex, condition] of (rule?.conditions || []).entries()) {
      const conditionPath = `${path}.conditions[${conditionIndex}]`;
      if (!['response', 'context'].includes(condition?.input)) findings.push(finding('INVALID_CONDITION_INPUT', 'Condition input must be response or context.', `${conditionPath}.input`));
      if (condition?.input === 'response' && !questions.has(condition.id)) findings.push(finding('UNKNOWN_QUESTION_REFERENCE', 'The condition references an unknown question.', `${conditionPath}.id`));
      if (condition?.input === 'context' && !contextFields.has(condition.id)) findings.push(finding('UNKNOWN_CONTEXT_REFERENCE', 'The condition references an unknown context field.', `${conditionPath}.id`));
      if (!operators.has(condition?.operator)) findings.push(finding('INVALID_CONDITION_OPERATOR', 'The condition uses an unsupported operator.', `${conditionPath}.operator`));
      if (condition?.operator === 'oneOf' && !Array.isArray(condition.value)) findings.push(finding('INVALID_CONDITION_VALUE', 'oneOf requires an array value.', `${conditionPath}.value`));
    }
    for (const [actionIndex, action] of (rule?.actions || []).entries()) {
      if (!text(action?.id) || !text(action?.label) || !['required', 'recommended'].includes(action?.kind)) findings.push(finding('INVALID_ACTION', 'Actions need an id, label and required or recommended kind.', `${path}.actions[${actionIndex}]`));
    }
  }
  return findings;
}

function validateInputs(definition, responses, context) {
  const findings = [];
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) return [finding('INVALID_RESPONSES', 'Responses must be keyed by question identifier.', 'responses')];
  const questions = new Map(definition.questions.map(question => [question.id, question]));
  for (const id of Object.keys(responses).sort()) if (!questions.has(id)) findings.push(finding('UNKNOWN_RESPONSE', 'The response does not match a defined question.', `responses.${id}`));
  for (const question of definition.questions) {
    const value = responses[question.id];
    if (value === undefined || value === null || value === '') {
      if (question.required !== false) findings.push(finding('MISSING_REQUIRED_RESPONSE', 'A required response is missing.', `responses.${question.id}`));
      continue;
    }
    const valid = question.type === 'boolean' ? typeof value === 'boolean'
      : question.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : typeof value === 'string' && question.options.includes(value);
    if (!valid) findings.push(finding('INVALID_RESPONSE_VALUE', 'The response does not match the question type or permitted options.', `responses.${question.id}`));
  }
  if (!context || typeof context !== 'object' || Array.isArray(context)) return [...findings, finding('INVALID_CONTEXT', 'Evaluation context must be an object.', 'context')];
  for (const key of Object.keys(context).sort()) if (!contextFields.has(key) && key !== 'evaluatedAt') findings.push(finding('UNKNOWN_CONTEXT_INPUT', 'The context field is not supported.', `context.${key}`));
  if (!categories.has(context.category)) findings.push(finding('INVALID_CATEGORY', 'Context category must be Education, Administration or Research.', 'context.category'));
  if (!text(context.evaluatedAt) || Number.isNaN(Date.parse(context.evaluatedAt))) findings.push(finding('INVALID_EVALUATED_AT', 'evaluatedAt must be an ISO-compatible timestamp supplied by the caller.', 'context.evaluatedAt'));
  if (Array.isArray(definition.appliesTo) && !definition.appliesTo.includes(context.category)) findings.push(finding('DEFINITION_NOT_APPLICABLE', 'The definition does not apply to this category.', 'context.category'));
  return findings;
}

function matches(condition, responses, context) {
  const actual = condition.input === 'response' ? responses[condition.id] : context[condition.id];
  if (condition.operator === 'equals') return actual === condition.value;
  if (condition.operator === 'oneOf') return condition.value.includes(actual);
  if (condition.operator === 'greaterThanOrEqual') return actual >= condition.value;
  return actual <= condition.value;
}

export function evaluateAssessment(definition, responses, context) {
  const definitionFindings = validateDefinition(definition);
  if (definitionFindings.length) return immutable({ status: 'invalid', findings: definitionFindings });
  const inputFindings = validateInputs(definition, responses, context);
  if (inputFindings.length) return immutable({ status: 'invalid', findings: inputFindings });

  const triggered = definition.rules.filter(rule => rule.conditions.every(condition => matches(condition, responses, context))).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  if (triggered.length === 0) return immutable({ status: 'invalid', findings: [finding('NO_MATCHING_OUTCOME', 'No approved rule matched the completed assessment.', 'definition.rules')] });
  const outcome = definition.outcomes.find(candidate => candidate.id === triggered[0].outcomeId);
  const actions = [];
  const actionIds = new Set();
  for (const rule of triggered) for (const action of rule.actions || []) if (!actionIds.has(action.id)) { actionIds.add(action.id); actions.push({ ...action }); }
  return immutable({
    status: 'complete',
    definition: { id: definition.id, version: definition.version },
    evaluatedAt: context.evaluatedAt,
    outcome: { id: outcome.id, label: outcome.label },
    triggeredRules: triggered.map(rule => ({
      id: rule.id,
      responseIds: [...new Set(rule.conditions.filter(condition => condition.input === 'response').map(condition => condition.id))].sort(),
      sourceIds: [...rule.sourceIds].sort(),
      explanation: rule.explanation
    })),
    actions
  });
}
