import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

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
function publicPrincipal(row) {
  return Object.freeze({
    accountId: row.account_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    displayName: row.display_name,
    role: row.role,
    roleLabel: roleLabels[row.role],
    permissions: [...permissions[row.role]].sort()
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
  const row = db.prepare(`SELECT s.id session_id, s.expires_at, a.id account_id, a.organization_id, a.display_name, a.role, a.status, o.name organization_name
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
  return Boolean(principal && permissions[principal.role]?.has(permission));
}
export function sessionCookie(token, expiresAt, secure = false) {
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAt).toUTCString()}${secure ? '; Secure' : ''}`;
}
export function expiredSessionCookie(secure = false) {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure ? '; Secure' : ''}`;
}
export { roles as accountRoles, roleLabels };
