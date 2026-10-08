import { demoDefinition } from './assessment-definition.js';
export const capabilities = ['registry:create', 'registry:update', 'assessment:review', 'action:manage', 'report:export'];
export const defaultWorkflow = () => ({
  allowLinkedActions: true,
  mandatoryPolicyReading: false,
  requireInProgressBeforeCompletion: false,
  allowReopen: true
});
export const workflowFunctionCatalog = Object.freeze([
  { key: 'start', label: 'Start', description: 'Begin a governed workflow.' },
  { key: 'register', label: 'Register AI use', description: 'Capture the AI use, owner and business context.' },
  { key: 'assess', label: 'Run assessment', description: 'Collect the bounded governance evidence questions.' },
  { key: 'policy', label: 'Acknowledge policy', description: 'Require acknowledgement of linked policy versions.' },
  { key: 'decision', label: 'Review decision', description: 'Review the synthetic result and supporting evidence.' },
  { key: 'action', label: 'Create follow-up action', description: 'Create owned, dated follow-up work.' },
  { key: 'review', label: 'Manual review gate', description: 'Pause for a named person to review the record.' },
  { key: 'notify', label: 'Notify participants', description: 'Send an in-app workflow notification.' },
  { key: 'report', label: 'Capture report snapshot', description: 'Make the current state available to reporting.' },
  { key: 'end', label: 'Complete', description: 'Finish this workflow path.' }
]);
const workflowFunctionKeys = new Set(workflowFunctionCatalog.map(item => item.key));
export const defaultWorkflowCanvas = () => {
  const nodes = [
    ['node-start', 'start', 'Start'], ['node-register', 'register', 'Register AI use'], ['node-assess', 'assess', 'Run assessment'],
    ['node-decision', 'decision', 'Review decision'], ['node-action', 'action', 'Create follow-up action'],
    ['node-review', 'review', 'Manual review gate'], ['node-report', 'report', 'Capture report snapshot'], ['node-end', 'end', 'Complete']
  ].map(([id, functionKey, title]) => ({ id, function: functionKey, title, description: workflowFunctionCatalog.find(item => item.key === functionKey).description, manualReview: functionKey === 'review', requiresEvidence: functionKey === 'assess' || functionKey === 'policy' }));
  return { version: 1, nodes, edges: nodes.slice(0, -1).map((node, index) => ({ id: `edge-${index + 1}`, from: node.id, to: nodes[index + 1].id, label: 'Continue' })) };
};
export const defaultAutomationRules = () => [];
export const defaults = () => ({
  questions: demoDefinition('All').questions.map(({
    id,
    label,
    topic
  }) => ({
    id,
    label,
    topic,
    required: true
  })),
  businessAreas: [],
  customRoles: [],
  workflow: defaultWorkflow(),
  automationRules: defaultAutomationRules(),
  workflowCanvas: defaultWorkflowCanvas()
});
const decode = row => ({
  version: row.version,
  ...defaults(),
  ...JSON.parse(row.configuration_json),
  workflowCanvas: JSON.parse(row.configuration_json).workflowCanvas || defaultWorkflowCanvas()
});
export async function currentConfiguration(db, organizationId) {
  const row = await db.get('SELECT * FROM governance_configurations WHERE organization_id=? ORDER BY version DESC LIMIT 1', organizationId);
  return row ? decode(row) : {
    version: 0,
    ...defaults()
  };
}
export async function activeConfiguration(db, organizationId) {
  const event = await db.get('SELECT * FROM configuration_events WHERE organization_id=? ORDER BY id DESC LIMIT 1', organizationId);
  if (!event) return {
    version: 0,
    ...defaults()
  };
  if (event.action === 'retired') return null;
  return decode(await db.get('SELECT * FROM governance_configurations WHERE organization_id=? AND version=?', organizationId, event.version));
}
export async function assessmentDefinition(db, organizationId, category) {
  const config = await activeConfiguration(db, organizationId);
  const fail = message => {
    throw Object.assign(new Error(message), {
      status: 409
    });
  };
  if (!config) fail('Configuration is retired. An administrator must activate a version before starting assessments.');
  if (config.businessAreas?.length && !config.businessAreas.includes(category)) fail('The active assessment definition does not apply to this business area.');
  const definition = config.assessmentDefinition || demoDefinition(category);
  definition.appliesTo = [category];
  definition.version = String(config.version + 1);
  definition.configurationVersion = config.version;
  definition.questions = config.questions.map(q => ({
    ...demoDefinition(category).questions.find(base => base.id === q.id),
    ...q,
    type: 'boolean',
    required: q.required !== false
  }));
  definition.requiredPolicies = [];
  if (config.workflow.mandatoryPolicyReading) {
    const policies = await db.all(`SELECT id,document_id,version,title,sha256,checklist_json FROM policies p WHERE organization_id=? AND version=(SELECT MAX(version) FROM policies v WHERE v.organization_id=p.organization_id AND v.document_id=p.document_id)`, organizationId);
    definition.requiredPolicies = policies.filter(p => JSON.parse(p.checklist_json).some(id => definition.questions.some(q => q.id === id))).map(({
      checklist_json,
      ...p
    }) => p);
    if (!definition.requiredPolicies.length) fail('Mandatory policy acknowledgement is enabled, but no current policy is linked to this questionnaire. Link a policy before starting an assessment.');
  }
  return definition;
}
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function validate(input) {
  const base = defaults();
  if (!input || Object.keys(input).some(k => !['expectedVersion', 'questions', 'businessAreas', 'customRoles', 'workflow', 'automationRules', 'workflowCanvas', 'activate', 'approvalReference', 'expectedLifecycleRevision'].includes(k))) return false;
  if (input.expectedLifecycleRevision !== undefined && !Number.isSafeInteger(input.expectedLifecycleRevision)) return false;
  if (input.activate !== undefined && typeof input.activate !== 'boolean') return false;
  if (input.approvalReference !== undefined && !validText(input.approvalReference, 500)) return false;
  if (!Array.isArray(input.questions) || input.questions.length < 4 || input.questions.length > 24 || new Set(input.questions.map(q => q?.id)).size !== input.questions.length) return false;
  if (base.questions.some(q => !input.questions.some(x => x?.id === q.id && x.required !== false))) return false;
  if (input.questions.some(q => !q || Object.keys(q).some(k => !['id', 'label', 'topic', 'required'].includes(k)) || !validText(q.label, 240) || q.topic !== undefined && q.topic !== '' && !validText(q.topic, 240) || q.required !== undefined && typeof q.required !== 'boolean' || !base.questions.some(b => b.id === q.id) && !(typeof q.id === 'string' && /^additional-[a-z0-9-]{1,40}$/.test(q.id)))) return false;
  if (input.businessAreas !== undefined && (!Array.isArray(input.businessAreas) || input.businessAreas.length > 40 || new Set(input.businessAreas).size !== input.businessAreas.length || input.businessAreas.some(area => !validText(area, 120) || area !== area.trim()))) return false;
  if (!Array.isArray(input.customRoles) || input.customRoles.length > 12 || input.customRoles.some(r => !r || Object.keys(r).some(k => !['id', 'name', 'permissions'].includes(k)) || typeof r.id !== 'string' || !/^custom-[a-z0-9-]{1,40}$/.test(r.id) || !validText(r.name, 80) || !Array.isArray(r.permissions) || r.permissions.some(p => !capabilities.includes(p)) || new Set(r.permissions).size !== r.permissions.length) || new Set(input.customRoles.map(r => r.id)).size !== input.customRoles.length) return false;
  if (input.automationRules !== undefined && (!Array.isArray(input.automationRules) || input.automationRules.length > 12 || input.automationRules.some(rule => !rule || Object.keys(rule).some(k => !['id', 'name', 'event', 'outcome', 'title', 'dueDays'].includes(k)) || typeof rule.id !== 'string' || !/^automation-[a-z0-9-]{1,40}$/.test(rule.id) || !validText(rule.name, 100) || rule.event !== 'assessment.submitted' || rule.outcome !== undefined && rule.outcome !== '' && !['High (demo)', 'Medium (demo)', 'Low (demo)'].includes(rule.outcome) || !validText(rule.title, 200) || !Number.isInteger(rule.dueDays) || rule.dueDays < 0 || rule.dueDays > 365) || new Set(input.automationRules.map(r => r.id)).size !== input.automationRules.length)) return false;
  if (!(input.workflow && typeof input.workflow === 'object' && !Array.isArray(input.workflow) && Object.keys(input.workflow).every(k => Object.hasOwn(defaultWorkflow(), k)) && ['allowLinkedActions', 'mandatoryPolicyReading'].every(k => typeof input.workflow[k] === 'boolean') && ['requireInProgressBeforeCompletion', 'allowReopen'].every(k => input.workflow[k] === undefined || typeof input.workflow[k] === 'boolean'))) return false;
  if (input.workflowCanvas === undefined) return true;
  const canvas = input.workflowCanvas;
  if (!canvas || canvas.version !== 1 || !Array.isArray(canvas.nodes) || canvas.nodes.length < 2 || canvas.nodes.length > 24 || !Array.isArray(canvas.edges) || canvas.edges.length !== canvas.nodes.length - 1 || canvas.edges.length > 23) return false;
  const ids = new Set(canvas.nodes.map(node => node?.id));
  if (ids.size !== canvas.nodes.length || canvas.nodes.some(node => !node || typeof node.id !== 'string' || !/^node-[a-z0-9-]{1,40}$/.test(node.id) || !workflowFunctionKeys.has(node.function) || !validText(node.title, 120) || node.description !== undefined && (typeof node.description !== 'string' || node.description.length > 500) || node.manualReview !== undefined && typeof node.manualReview !== 'boolean' || node.requiresEvidence !== undefined && typeof node.requiresEvidence !== 'boolean')) return false;
  const starts = canvas.nodes.filter(node => node.function === 'start'), ends = canvas.nodes.filter(node => node.function === 'end');
  if (starts.length !== 1 || ends.length !== 1) return false;
  const edgeIds = new Set(), outgoing = new Map(), incoming = new Map();
  for (const edge of canvas.edges) {
    if (!edge || typeof edge.id !== 'string' || !/^edge-[a-z0-9-]{1,40}$/.test(edge.id) || edgeIds.has(edge.id) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || edge.label !== undefined && (typeof edge.label !== 'string' || edge.label.length > 120)) return false;
    edgeIds.add(edge.id); outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge.to]); incoming.set(edge.to, [...(incoming.get(edge.to) || []), edge.from]);
  }
  if ((incoming.get(starts[0].id) || []).length || (outgoing.get(ends[0].id) || []).length) return false;
  const visited = new Set(), visiting = new Set();
  const walk = id => { if (visiting.has(id)) return false; if (visited.has(id)) return true; visiting.add(id); if (!(outgoing.get(id) || []).every(walk)) return false; visiting.delete(id); visited.add(id); return true; };
  return walk(starts[0].id) && visited.size === canvas.nodes.length && visited.has(ends[0].id);
}
async function event(db, principal, version, action, reference) {
  await db.run('INSERT INTO configuration_events(organization_id,version,action,actor_id,reference,created_at) VALUES (?,?,?,?,?,?)', principal.organizationId, version, action, principal.accountId, reference, new Date().toISOString());
}
export function registerGovernanceConfiguration(app, db, requirePermission) {
  app.get('/api/governance-configuration', requirePermission('account:manage'), async (req, res) => {
    const events = await db.all('SELECT * FROM configuration_events WHERE organization_id=? ORDER BY id DESC', req.principal.organizationId);
    res.json({
      ...(await currentConfiguration(db, req.principal.organizationId)),
      activeVersion: (await activeConfiguration(db, req.principal.organizationId))?.version ?? null,
      activeCustomRoles: (await activeConfiguration(db, req.principal.organizationId))?.customRoles || [],
      lifecycleRevision: events[0]?.id ?? 0,
      events,
      history: await db.all('SELECT version,actor_id,created_at,configuration_json FROM governance_configurations WHERE organization_id=? ORDER BY version DESC', req.principal.organizationId)
    });
  });
  app.put('/api/governance-configuration', requirePermission('account:manage'), async (req, res) => {
    const input = req.body;
    if (!validate(input)) return res.status(400).json({
      error: 'Choose valid questions, business areas, bounded capability roles and supported workflow settings. Scoring rules are fixed.'
    });
    await db.exec('BEGIN IMMEDIATE');
    try {
      const previous = await currentConfiguration(db, req.principal.organizationId);
      if (input.expectedVersion !== previous.version) {
        await db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Configuration changed. Reload before saving.'
        });
      }
      if (input.activate !== false && input.expectedLifecycleRevision !== undefined) {
        const revision = (await db.get('SELECT MAX(id) revision FROM configuration_events WHERE organization_id=?', req.principal.organizationId)).revision ?? 0;
        if (revision !== input.expectedLifecycleRevision) {
          await db.exec('ROLLBACK');
          return res.status(409).json({
            error: 'Activation changed. Reload before saving.'
          });
        }
      }
      const definition = demoDefinition('All'),
        base = defaults();
      const questions = input.questions.map(q => ({
        ...q,
        label: q.label.trim(),
        topic: q.topic?.trim() || base.questions.find(b => b.id === q.id)?.topic || 'Additional governance evidence',
        required: q.required !== false
      }));
      definition.version = String(previous.version + 2);
      definition.configurationVersion = previous.version + 1;
      definition.questions = questions.map(q => ({
        ...q,
        type: 'boolean'
      }));
      const configuration = {
          questions,
          businessAreas: input.businessAreas || [],
          customRoles: input.customRoles,
          workflow: {
            ...defaultWorkflow(),
            ...input.workflow
          },
          automationRules: input.automationRules || [],
          workflowCanvas: input.workflowCanvas || defaultWorkflowCanvas(),
          assessmentDefinition: definition
        },
        now = new Date().toISOString();
      await db.run('INSERT INTO governance_configurations VALUES (?,?,?,?,?)', req.principal.organizationId, previous.version + 1, JSON.stringify(configuration), req.principal.accountId, now);
      if (input.activate !== false) await event(db, req.principal, previous.version + 1, 'activated', input.approvalReference || 'Administrator publication; synthetic scoring remains unchanged.');
      await db.exec('COMMIT');
      res.json({
        version: previous.version + 1,
        ...configuration
      });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  });
  app.post('/api/governance-configuration/:version/lifecycle', requirePermission('account:manage'), async (req, res) => {
    const version = Number(req.params.version),
      input = req.body;
    if (!Number.isSafeInteger(version) || version < 1 || !input || !['activated', 'retired'].includes(input.action) || !validText(input.reference, 500) || !Number.isSafeInteger(input.expectedLifecycleRevision) || Object.keys(input).some(k => !['action', 'reference', 'expectedLifecycleRevision'].includes(k))) return res.status(400).json({
      error: 'Choose a version, lifecycle action and approval/change reference.'
    });
    await db.exec('BEGIN IMMEDIATE');
    try {
      const latest = await db.get('SELECT * FROM configuration_events WHERE organization_id=? ORDER BY id DESC LIMIT 1', req.principal.organizationId);
      if (!(await db.get('SELECT 1 FROM governance_configurations WHERE organization_id=? AND version=?', req.principal.organizationId, version))) {
        await db.exec('ROLLBACK');
        return res.status(404).json({
          error: 'Configuration version was not found.'
        });
      }
      if ((latest?.id ?? 0) !== input.expectedLifecycleRevision) {
        await db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Activation changed. Reload before continuing.'
        });
      }
      if (input.action === 'retired' && (latest?.action !== 'activated' || latest.version !== version)) {
        await db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Only the currently active version can be retired.'
        });
      }
      await event(db, req.principal, version, input.action, input.reference.trim());
      await db.exec('COMMIT');
      res.json({
        status: input.action,
        version
      });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  });
}
