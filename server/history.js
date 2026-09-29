// Append-only reporting snapshots. Capture time, rather than editable business dates,
// determines which state was known at a historical cutoff.
export function installHistory(db) {
  db.exec(`CREATE TABLE reporting_coverage (organization_id TEXT PRIMARY KEY REFERENCES organizations(id),started_at TEXT NOT NULL) STRICT;
    CREATE TABLE reporting_history (id INTEGER PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id),entity TEXT NOT NULL,record_id TEXT NOT NULL,record_json TEXT NOT NULL,recorded_at TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0) STRICT;
    CREATE INDEX reporting_history_cutoff ON reporting_history(organization_id,entity,recorded_at,record_id);
    INSERT INTO reporting_coverage SELECT id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM organizations;
    CREATE TRIGGER reporting_new_organization AFTER INSERT ON organizations BEGIN
      INSERT INTO reporting_coverage VALUES (NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;`);
  const fields={
    ai_uses:['id','organization_id','name','purpose','owner','business_area','data_description','data_sensitivity','approval_status','source','created_at','updated_at'],
    assessments:['id','organization_id','ai_use_id','created_by','state','revision','definition_json','responses_json','result_json','created_at','updated_at'],
    governance_actions:['id','organization_id','ai_use_id','assessment_id','title','owner','owner_account_id','due_date','status','version','created_at','updated_at','completed_at','history_json'],
    policies:['id','organization_id','document_id','version','title','filename','sha256','checklist_json','reviewer_id','review_due','reviewed_at','created_at']
  };
  for(const [table,columns] of Object.entries(fields)){
    const json=prefix=>`json_object(${columns.map(column=>`'${column}',${prefix}${column}`).join(',')})`;
    db.exec(`INSERT INTO reporting_history(organization_id,entity,record_id,record_json,recorded_at)
      SELECT organization_id,'${table}',id,${json('')},strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM ${table};`);
    for(const operation of ['INSERT','UPDATE','DELETE']){
      const row=operation==='DELETE'?'OLD.':'NEW.';
      db.exec(`CREATE TRIGGER reporting_${table}_${operation.toLowerCase()} AFTER ${operation} ON ${table} BEGIN
        INSERT INTO reporting_history(organization_id,entity,record_id,record_json,recorded_at,deleted)
        VALUES (${row}organization_id,'${table}',${row}id,${json(row)},strftime('%Y-%m-%dT%H:%M:%fZ','now'),${operation==='DELETE'?1:0});
      END;`);
    }
  }
}
