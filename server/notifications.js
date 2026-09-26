import {randomUUID} from 'node:crypto';
import {planReminders} from './domain/reminder-planning.js';
export function reminderSettings(db,organizationId){return db.prepare('SELECT enabled,upcoming_days upcomingDays,repeat_days repeatDays FROM reminder_settings WHERE organization_id=?').get(organizationId)||{enabled:1,upcomingDays:7,repeatDays:7}}
export function deliverReminders(db,now=new Date(),onlyOrganization){
 let delivered=0;const timestamp=now.toISOString();
 db.exec('BEGIN IMMEDIATE');
 try{
  const organizations=onlyOrganization?[{id:onlyOrganization}]:db.prepare('SELECT id FROM organizations').all();
  for(const org of organizations){
   const settings=reminderSettings(db,org.id);if(!settings.enabled)continue;
   const actions=db.prepare("SELECT id,title,owner_account_id recipient,due_date dueDate,status FROM governance_actions WHERE organization_id=?").all(org.id).map(a=>({...a,kind:'action',isClosed:a.status==='Complete'}));
   const policies=db.prepare('SELECT p.id,p.title,p.reviewer_id recipient,p.review_due dueDate FROM policies p WHERE p.organization_id=? AND p.version=(SELECT MAX(q.version) FROM policies q WHERE q.organization_id=p.organization_id AND q.document_id=p.document_id)').all(org.id).map(p=>({...p,kind:'policy-review',isClosed:false}));
   const items=[...actions,...policies];
   const result=planReminders({id:'in-app-reminders',version:'1',status:'approved',upcomingDays:[settings.upcomingDays],includeDueToday:true,includeOverdue:true,overdueRepeatDays:settings.repeatDays},items,{asOfDate:timestamp.slice(0,10)});
   if(result.status!=='planned')throw new Error('Reminder source data is invalid.');
   for(const reminder of result.reminders){const item=items.find(i=>i.id===reminder.itemId);
    if(!item.recipient||!db.prepare("SELECT 1 FROM accounts WHERE id=? AND organization_id=? AND status='active'").get(item.recipient,org.id))continue;
    const key=[org.id,reminder.idempotencyKey,item.recipient,reminder.dueDate].join(':');
    const change=db.prepare('INSERT OR IGNORE INTO notifications VALUES (?,?,?,?,?,?,?,?,?,NULL)').run(randomUUID(),org.id,item.recipient,key,item.kind,item.id,item.title,`${reminder.timing}: ${item.kind} due ${reminder.dueDate}.`,timestamp);delivered+=Number(change.changes);
   }
  }
  db.prepare("INSERT INTO reminder_runs (started_at,status,delivered,error) VALUES (?,'complete',?,NULL)").run(timestamp,delivered);db.exec('COMMIT');return {delivered};
 }catch(error){db.exec('ROLLBACK');db.prepare("INSERT INTO reminder_runs (started_at,status,delivered,error) VALUES (?,'failed',0,?)").run(timestamp,'Delivery failed; pending items will be retried on the next run.');throw error;}
}
export function registerNotifications(app,db,requirePermission){
 app.get('/api/notifications',requirePermission('registry:read'),(req,res)=>res.json({notifications:db.prepare('SELECT id,kind,item_id,title,message,delivered_at,read_at FROM notifications WHERE organization_id=? AND account_id=? ORDER BY delivered_at DESC LIMIT 200').all(req.principal.organizationId,req.principal.accountId)}));
 app.post('/api/notifications/:id/read',requirePermission('registry:read'),(req,res)=>{
  const result=db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND organization_id=? AND account_id=?').run(new Date().toISOString(),req.params.id,req.principal.organizationId,req.principal.accountId);
  res.status(result.changes?200:404).json(result.changes?{status:'read'}:{error:'Notification was not found.'});
 });
 app.get('/api/reminders/settings',requirePermission('action:manage'),(req,res)=>res.json(reminderSettings(db,req.principal.organizationId)));
 app.put('/api/reminders/settings',requirePermission('account:manage'),(req,res)=>{
  const b=req.body;if(typeof b?.enabled!=='boolean'||!Number.isInteger(b.upcomingDays)||b.upcomingDays<1||b.upcomingDays>365||!Number.isInteger(b.repeatDays)||b.repeatDays<1||b.repeatDays>365)return res.status(400).json({error:'Choose reminder intervals from 1 to 365 days.'});
  db.prepare('INSERT INTO reminder_settings VALUES (?,?,?,?) ON CONFLICT(organization_id) DO UPDATE SET enabled=excluded.enabled,upcoming_days=excluded.upcoming_days,repeat_days=excluded.repeat_days').run(req.principal.organizationId,Number(b.enabled),b.upcomingDays,b.repeatDays);res.json(reminderSettings(db,req.principal.organizationId));
 });
 app.post('/api/reminders/run',requirePermission('action:manage'),(req,res)=>res.json(deliverReminders(db,new Date(),req.principal.organizationId)));
}
