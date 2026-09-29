import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import {capabilities,currentConfiguration} from './governance-config.js';

const scrypt = promisify(scryptCallback);
const roles = Object.freeze(['administrator', 'compliance_officer', 'staff_user']);
const roleLabels = Object.freeze({
  administrator: 'Administrator',
  compliance_officer: 'Compliance Officer',
  staff_user: 'Staff User'
});
const permissions = Object.freeze({
  administrator: new Set(['registry:read', 'registry:create', 'registry:update', 'assessment:submit', 'assessment:review', 'action:manage', 'report:export', 'shadow:create', 'account:manage']),
  compliance_officer: new Set(['registry:read', 'registry:create', 'registry:update', 'assessment:submit', 'assessment:review', 'action:manage', 'report:export', 'shadow:create']),
  staff_user: new Set(['registry:read', 'assessment:submit', 'shadow:create'])
});
const parameters = Object.freeze({ cost: 32768, blockSize: 8, parallelization: 1, keyLength: 32, maxmem: 64 * 1024 * 1024 });
const cookieName = 'aitrace_session';

function normalizeLogin(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}
async function derive(password, salt, settings = parameters) {
  return scrypt(password, salt, settings.keyLength, { N: settings.cost, r: settings.blockSize, p: settings.parallelization, maxmem: settings.maxmem });
}
function parseCookies(value) {
  const cookies = {};
  for (const part of String(value || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}
export function effectivePermissions(row) {
  return [...new Set([...permissions[row.role],...JSON.parse(row.capabilities_json||'[]'),...(JSON.parse(row.custom_role_json||'null')?.permissions||[])])].sort();
}
function publicPrincipal(row) {
  return Object.freeze({
    accountId: row.account_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    displayName: row.display_name,
    role: row.role,
    roleLabel: roleLabels[row.role],
    mustChangePassword: Boolean(row.must_change_password),
    permissions: effectivePermissions(row)
  });
}

export async function createAccount(db, { organizationId, organizationName, login, displayName, role, password }, now = new Date().toISOString()) {
  if (!roles.includes(role)) throw new Error('Role must be administrator, compliance_officer or staff_user.');
  const normalized = normalizeLogin(login);
  if (!normalized || normalized.length > 160) throw new Error('Login is required and must not exceed 160 characters.');
  if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 120) throw new Error('Display name is required and must not exceed 120 characters.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new Error('Password must contain 12 to 200 characters.');
  if (typeof organizationId !== 'string' || !organizationId.trim() || typeof organizationName !== 'string' || !organizationName.trim()) throw new Error('Organisation id and name are required.');
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  db.prepare('INSERT OR IGNORE INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(organizationId.trim(), organizationName.trim(), now, now);
  const id = randomUUID();
  db.prepare(`INSERT INTO accounts (id, organization_id, login, display_name, role, password_salt, password_hash, password_cost, password_block_size, password_parallelization, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`).run(id, organizationId.trim(), normalized, displayName.trim(), role, salt.toString('hex'), hash.toString('hex'), parameters.cost, parameters.blockSize, parameters.parallelization, now, now);
  return id;
}

export async function login(db, loginIdentifier, password, now = new Date()) {
  const loginName = normalizeLogin(loginIdentifier);
  const row = db.prepare(`SELECT a.*, o.name organization_name FROM accounts a JOIN organizations o ON o.id=a.organization_id WHERE a.login=?`).get(loginName);
  const salt = row ? Buffer.from(row.password_salt, 'hex') : Buffer.alloc(16);
  const settings = row ? { ...parameters, cost: row.password_cost, blockSize: row.password_block_size, parallelization: row.password_parallelization } : parameters;
  const candidate = await derive(typeof password === 'string' ? password : '', salt, settings);
  const stored = row ? Buffer.from(row.password_hash, 'hex') : Buffer.alloc(parameters.keyLength);
  const valid = stored.length === candidate.length && timingSafeEqual(stored, candidate);
  if (!row || !valid || row.status !== 'active') return null;
  const current=db.prepare('SELECT password_hash,status FROM accounts WHERE id=?').get(row.id);
  if(!current||current.status!=='active'||current.password_hash!==row.password_hash)return null;
  const token = randomBytes(32).toString('base64url');
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.valueOf() + 8 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, token_hash, account_id, created_at, last_used_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, NULL)')
    .run(randomUUID(), tokenHash(token), row.id, createdAt, createdAt, expiresAt);
  return { token, expiresAt, principal: publicPrincipal({ ...row, account_id: row.id }) };
}

export function resolveRequestPrincipal(db, request, now = new Date()) {
  const token = parseCookies(request.headers.cookie)[cookieName];
  if (!token) return null;
  const current = now.toISOString();
  const row = db.prepare(`SELECT s.id session_id, s.expires_at, a.id account_id, a.organization_id, a.display_name, a.role, a.status, a.must_change_password,a.capabilities_json,a.custom_role_json, o.name organization_name
    FROM sessions s JOIN accounts a ON a.id=s.account_id JOIN organizations o ON o.id=a.organization_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL`).get(tokenHash(token));
  if (!row || row.status !== 'active' || row.expires_at <= current || !permissions[row.role]) return null;
  db.prepare('UPDATE sessions SET last_used_at=? WHERE id=?').run(current, row.session_id);
  return publicPrincipal(row);
}

export function revokeRequestSession(db, request, now = new Date().toISOString()) {
  const token = parseCookies(request.headers.cookie)[cookieName];
  if (token) db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(now, tokenHash(token));
}
export function hasPermission(principal, permission) {
  return Boolean(principal && (principal.permissions ? principal.permissions.includes(permission) : permissions[principal.role]?.has(permission)));
}
export function sessionCookie(token, expiresAt, secure = false) {
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAt).toUTCString()}${secure ? '; Secure' : ''}`;
}
export function expiredSessionCookie(secure = false) {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure ? '; Secure' : ''}`;
}
export { roles as accountRoles, roleLabels };

// All account mutations are scoped to the current administrator's organisation.
export async function manageAccount(db, principal, accountId, change) {
  const fail = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
  const check = () => {
    const actor=db.prepare('SELECT role,status,organization_id FROM accounts WHERE id=?').get(principal.accountId);
    if (!actor || actor.status!=='active' || actor.role!=='administrator' || actor.organization_id!==principal.organizationId) fail('Administrator access is required.',403);
    const row=db.prepare('SELECT id,role,status FROM accounts WHERE id=? AND organization_id=?').get(accountId,principal.organizationId);
    if (!row) fail('Account was not found.',404);
    return row;
  };
  check();
  let salt, hash;
  if (change.kind==='password') {
    if (typeof change.password!=='string' || change.password.length<12 || change.password.length>200) fail('Password must contain 12 to 200 characters.');
    salt=randomBytes(16); hash=await derive(change.password,salt);
  } else if (change.kind==='access') {
    if (!roles.includes(change.role) || !['active','disabled'].includes(change.status)) fail('Choose a valid role and account status.');
    if(change.capabilities!==undefined&&(!Array.isArray(change.capabilities)||change.capabilities.some(p=>!capabilities.includes(p))||new Set(change.capabilities).size!==change.capabilities.length))fail('Choose supported capabilities.');
    if(change.customRoleId!==undefined&&change.customRoleId!==''&&!currentConfiguration(db,principal.organizationId).customRoles.some(r=>r.id===change.customRoleId))fail('Choose an existing custom role.');
  } else fail('Unknown account change.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row=check(), now=new Date().toISOString();
    if (change.kind==='password') {
      db.prepare('UPDATE accounts SET must_change_password=1,password_salt=?,password_hash=?,password_cost=?,password_block_size=?,password_parallelization=?,updated_at=? WHERE id=? AND organization_id=?')
        .run(salt.toString('hex'),hash.toString('hex'),parameters.cost,parameters.blockSize,parameters.parallelization,now,accountId,principal.organizationId);
    } else {
      if (accountId===principal.accountId && (change.role!=='administrator' || change.status!=='active')) fail('You cannot remove your own administrator access.');
      if (row.role==='administrator' && row.status==='active' && (change.role!=='administrator' || change.status!=='active')) {
        const count=db.prepare("SELECT COUNT(*) n FROM accounts WHERE organization_id=? AND role='administrator' AND status='active'").get(principal.organizationId).n;
        if (count<=1) fail('Keep at least one active administrator.');
      }
      db.prepare('UPDATE accounts SET role=?,status=?,updated_at=? WHERE id=? AND organization_id=?').run(change.role,change.status,now,accountId,principal.organizationId);
    }
    if(change.kind==='access'){
      if(change.capabilities!==undefined)db.prepare('UPDATE accounts SET capabilities_json=? WHERE id=?').run(JSON.stringify(change.capabilities),accountId);
      if(change.customRoleId!==undefined){
        const config=currentConfiguration(db,principal.organizationId),role=config.customRoles.find(r=>r.id===change.customRoleId);
        db.prepare('UPDATE accounts SET custom_role_json=? WHERE id=?').run(role?JSON.stringify({...role,configurationVersion:config.version}):null,accountId);
      }
      if(change.capabilities!==undefined||change.customRoleId!==undefined){
        const access=db.prepare('SELECT capabilities_json,custom_role_json FROM accounts WHERE id=?').get(accountId);
        db.prepare('INSERT INTO account_audit (organization_id,actor_id,account_id,action,created_at) VALUES (?,?,?,?,?)').run(principal.organizationId,principal.accountId,accountId,`capabilities:${JSON.stringify(access)}`,now);
      }
    }
    db.prepare('UPDATE sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now,accountId);
    db.prepare('INSERT INTO account_audit (organization_id,actor_id,account_id,action,created_at) VALUES (?,?,?,?,?)')
      .run(principal.organizationId,principal.accountId,accountId,change.kind==='password'?'password-reset':`access:${change.role}:${change.status}`,now);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export async function changeOwnPassword(db,principal,currentPassword,newPassword){
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
  if(typeof newPassword!=='string'||newPassword.length<12||newPassword.length>200)fail('Password must contain 12 to 200 characters.');
  if(newPassword===currentPassword)fail('Choose a different new password.');
  const row=db.prepare("SELECT * FROM accounts WHERE id=? AND status='active'").get(principal.accountId);
  if(!row)fail('Account is unavailable.',401);
  const candidate=await derive(typeof currentPassword==='string'?currentPassword:'',Buffer.from(row.password_salt,'hex'),{...parameters,cost:row.password_cost,blockSize:row.password_block_size,parallelization:row.password_parallelization});
  if(!timingSafeEqual(candidate,Buffer.from(row.password_hash,'hex')))fail('Current password was not accepted.');
  const salt=randomBytes(16),hash=await derive(newPassword,salt),now=new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try{
    const result=db.prepare("UPDATE accounts SET password_salt=?,password_hash=?,password_cost=?,password_block_size=?,password_parallelization=?,must_change_password=0,updated_at=? WHERE id=? AND password_hash=? AND status='active'").run(salt.toString('hex'),hash.toString('hex'),parameters.cost,parameters.blockSize,parameters.parallelization,now,row.id,row.password_hash);
    if(!result.changes)fail('Account changed. Sign in again.',409);
    db.prepare('UPDATE sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now,row.id);
    db.prepare('INSERT INTO account_audit (organization_id,actor_id,account_id,action,created_at) VALUES (?,?,?,?,?)').run(row.organization_id,row.id,row.id,'password-change',now);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
