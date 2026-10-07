import { randomUUID } from 'node:crypto';
import { assessmentDefinition } from './governance-config.js';
import { evaluateAssessment } from './domain/risk-scoring.js';
import { createGovernanceAction } from './domain/governance-action.js';
import { activeConfiguration } from './governance-config.js';
const map = row => ({
  ...row,
  definition: JSON.parse(row.definition_json),
  responses: JSON.parse(row.responses_json),
  result: row.result_json ? JSON.parse(row.result_json) : null,
  definition_json: undefined,
  responses_json: undefined,
  result_json: undefined
});
export function registerAssessments(app, db, requirePermission) {
  const present = async (row, principal) => ({
    ...map(row),
    acknowledgedPolicyIds: (await db.all('SELECT policy_id FROM policy_acknowledgements WHERE assessment_id=? AND account_id=?', row.id, principal.accountId)).map(a => a.policy_id)
  });
  app.get('/api/assessments', requirePermission('assessment:submit'), async (req, res) => {
    const rows = await db.all('SELECT * FROM assessments WHERE organization_id=? ORDER BY updated_at DESC,id', req.principal.organizationId);
    res.json({
      assessments: await Promise.all(rows.filter(row => req.principal.permissions.includes('assessment:review') || row.created_by === req.principal.accountId).map(row => present(row, req.principal)))
    });
  });
  app.post('/api/assessments', requirePermission('assessment:submit'), async (req, res) => {
    const record = await db.get('SELECT * FROM ai_uses WHERE id=? AND organization_id=?', req.body?.aiUseId, req.principal.organizationId);
    if (!record) return res.status(404).json({
      error: 'AI use was not found.'
    });
    let definition;
    try {
      definition = await assessmentDefinition(db, req.principal.organizationId, record.business_area);
    } catch (error) {
      if (error.status) return res.status(error.status).json({
        error: error.message
      });
      throw error;
    }
    const id = randomUUID(),
      now = new Date().toISOString();
    await db.run("INSERT INTO assessments VALUES (?,?,?,?,'Draft',1,?,'{}',NULL,?,?)", id, req.principal.organizationId, record.id, req.principal.accountId, JSON.stringify(definition), now, now);
    res.status(201).json(await present(await db.get('SELECT * FROM assessments WHERE id=?', id), req.principal));
  });
  app.post('/api/assessments/:id/acknowledgements', requirePermission('assessment:submit'), async (req, res) => {
    const row = await db.get('SELECT * FROM assessments WHERE id=? AND organization_id=?', req.params.id, req.principal.organizationId);
    if (!row || !req.principal.permissions.includes('assessment:review') && row.created_by !== req.principal.accountId) return res.status(404).json({
      error: 'Assessment was not found.'
    });
    if (row.state !== 'Draft') return res.status(409).json({
      error: 'Submitted acknowledgement evidence cannot be changed.'
    });
    const policy = JSON.parse(row.definition_json).requiredPolicies?.find(p => p.id === req.body?.policyId);
    if (!policy || req.body?.acknowledge !== true) return res.status(400).json({
      error: 'Explicitly acknowledge a policy version required by this assessment.'
    });
    await db.run(`INSERT OR IGNORE INTO policy_acknowledgements(organization_id,assessment_id,policy_id,account_id,sha256,acknowledged_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM assessments WHERE id=? AND state='Draft')`, req.principal.organizationId, row.id, policy.id, req.principal.accountId, policy.sha256, new Date().toISOString(), row.id);
    if ((await db.get('SELECT state FROM assessments WHERE id=?', row.id)).state !== 'Draft') return res.status(409).json({
      error: 'Submitted acknowledgement evidence cannot be changed.'
    });
    res.json(await present(row, req.principal));
  });
  app.put('/api/assessments/:id', requirePermission('assessment:submit'), async (req, res) => {
    const row = await db.get('SELECT * FROM assessments WHERE id=? AND organization_id=?', req.params.id, req.principal.organizationId);
    if (!row || !req.principal.permissions.includes('assessment:review') && row.created_by !== req.principal.accountId) return res.status(404).json({
      error: 'Assessment was not found.'
    });
    if (row.state !== 'Draft' || row.revision !== req.body?.expectedRevision) return res.status(409).json({
      error: 'This assessment changed or was submitted. Reload before editing.'
    });
    const responses = req.body?.responses,
      definition = JSON.parse(row.definition_json);
    if (!responses || typeof responses !== 'object' || Array.isArray(responses) || Object.entries(responses).some(([id, value]) => !definition.questions.some(q => q.id === id) || typeof value !== 'boolean')) return res.status(400).json({
      error: 'Choose valid assessment responses.'
    });
    const now = new Date().toISOString();
    let result = null;
    if (req.body.submit === true) {
      const acknowledgements = await db.all('SELECT policy_id policyId,account_id accountId,sha256,acknowledged_at acknowledgedAt FROM policy_acknowledgements WHERE assessment_id=? AND account_id=?', row.id, req.principal.accountId);
      if ((definition.requiredPolicies || []).some(policy => !acknowledgements.some(a => a.policyId === policy.id && a.sha256 === policy.sha256))) return res.status(400).json({
        error: 'Acknowledge each required policy version before submitting.'
      });
      result = evaluateAssessment(definition, responses, {
        category: definition.appliesTo[0],
        evaluatedAt: now
      });
      if (result.status !== 'complete') return res.status(400).json({
        error: 'Answer every required question before submitting.',
        findings: result.findings
      });
      result = {
        ...result,
        policyAcknowledgements: acknowledgements
      };
    }
    const updated = await db.run("UPDATE assessments SET responses_json=?,result_json=?,state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state='Draft'", JSON.stringify(responses), result ? JSON.stringify(result) : null, result ? 'Submitted' : 'Draft', now, row.id, row.revision);
    if (!updated.changes) return res.status(409).json({
      error: 'This assessment changed or was submitted. Reload before editing.'
    });
    if (result) {
      const config = await activeConfiguration(db, req.principal.organizationId),
        outcome = result.outcome?.label;
      for (const rule of config?.automationRules || []) {
        if (rule.event !== 'assessment.submitted' || rule.outcome && rule.outcome !== outcome) continue;
        const due = new Date(Date.now() + rule.dueDays * 86400000).toISOString().slice(0, 10),
          action = createGovernanceAction({
            id: randomUUID(),
            aiUseId: row.ai_use_id,
            assessmentId: row.id,
            title: rule.title,
            ownerAccountId: row.created_by,
            owner: req.principal.displayName,
            dueDate: due
          }, {
            actorId: req.principal.accountId,
            timestamp: now
          });
        if (action.status === 'created') {
          const record = {
            ...action.action,
            workflowConfigurationVersion: config.version
          };
          record.history = record.history.map((entry, index) => index === 0 ? {
            ...entry,
            workflowConfigurationVersion: config.version,
            automationRuleId: rule.id,
            workflow: {
              ...config.workflow
            }
          } : entry);
          await db.run(`INSERT INTO governance_actions (id,organization_id,ai_use_id,assessment_id,title,owner,due_date,status,version,created_at,updated_at,completed_at,history_json,owner_account_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, req.principal.organizationId, record.aiUseId, record.assessmentId, record.title, record.owner, record.dueDate, record.status, record.version, record.createdAt, record.updatedAt, record.completedAt, JSON.stringify(record.history), row.created_by);
        }
      }
    }
  res.json(await present(await db.get('SELECT * FROM assessments WHERE id=?', row.id), req.principal));
  });
}
export async function assessmentSummary(db, organizationId, record) {
  const row = await db.get("SELECT id,result_json FROM assessments WHERE organization_id=? AND ai_use_id=? AND state='Submitted' ORDER BY updated_at DESC,id DESC LIMIT 1", organizationId, record.id);
  if (!row) return record;
  const result = JSON.parse(row.result_json);
  return {
    ...record,
    assessmentStatus: 'Assessed',
    assessmentId: row.id,
    riskOutcome: result.outcome
  };
}
