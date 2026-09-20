import { randomUUID } from 'node:crypto';
import express from 'express';
import { isAllowedHostHeader } from './config.js';

const categories = ['Education', 'Administration', 'Research'];
const limits = { name: 120, owner: 120, purpose: 2000, dataDescription: 1000 };
const samples = [
  ['Fictional student support assistant','Fictional learning team','Education','Demonstrate an AI-assisted student support use case.','Synthetic questions and fictional course information only.'],
  ['Fictional timetable helper','Fictional operations team','Administration','Demonstrate assistance with fictional timetable enquiries.','Synthetic timetable records only.'],
  ['Fictional literature explorer','Fictional research team','Research','Demonstrate exploration of synthetic research topics.','Fictional prompts and public sample metadata only.']
];
const map = row => ({ id: row.id, name: row.name, purpose: row.purpose, owner: row.owner, category: row.category,
  dataDescription: row.data_description, createdAt: row.created_at, updatedAt: row.updated_at, assessmentStatus: 'Not assessed' });
function validate(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { _request: 'A JSON object is required.' };
  for (const [key, max] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || !body[key].trim()) errors[key] = 'This field is required.';
    else if (body[key].trim().length > max) errors[key] = `Must be ${max} characters or fewer.`;
  }
  if (!categories.includes(body.category)) errors.category = 'Choose a valid category.';
  return errors;
}
const clean = body => ({ name: body.name.trim(), owner: body.owner.trim(), category: body.category,
  purpose: body.purpose.trim(), dataDescription: body.dataDescription.trim() });

export function createApp(db, http) {
  if (!db || !http?.allowedHostnames || !http?.requestBodyLimitBytes) throw new Error('Database and HTTP configuration are required.');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!isAllowedHostHeader(req.headers.host, http.allowedHostnames)) return res.status(403).json({ error: 'Host is not allowed.' });
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', (req, res, next) => {
    if (!req.headers.origin) return next();
    try {
      const origin = new URL(req.headers.origin);
      if (['http:','https:'].includes(origin.protocol) && http.allowedHostnames.includes(origin.hostname.toLowerCase())) return next();
    } catch {}
    res.status(403).json({ error: 'Origin is not allowed.' });
  });
  app.use('/api', express.json({ limit: http.requestBodyLimitBytes, strict: true, type: 'application/json' }));
  app.use('/api', (error, _req, res, next) => {
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Request body must contain valid JSON.' });
    next(error);
  });
  app.use('/api', (req, res, next) => {
    if (['POST','PUT','PATCH'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json.' });
    next();
  });
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', mode: 'local-prototype' }); });
  app.get('/api/registry', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    if (category && !categories.includes(category)) return res.status(400).json({ error: 'Choose a valid category.' });
    const conditions = [], values = [];
    if (q) { conditions.push('(name LIKE ? OR owner LIKE ? OR purpose LIKE ?)'); values.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (category) { conditions.push('category = ?'); values.push(category); }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    res.json({ records: db.prepare(`SELECT * FROM ai_uses${where} ORDER BY updated_at DESC, id DESC`).all(...values).map(map) });
  });
  app.get('/api/registry/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM ai_uses WHERE id = ?').get(req.params.id);
    row ? res.json(map(row)) : res.status(404).json({ error: 'AI use was not found.' });
  });
  app.post('/api/registry', (req, res) => {
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body), id = randomUUID(), now = new Date().toISOString();
    db.prepare('INSERT INTO ai_uses VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id,value.name,value.purpose,value.owner,value.category,value.dataDescription,now,now);
    res.status(201).json(map(db.prepare('SELECT * FROM ai_uses WHERE id = ?').get(id)));
  });
  app.put('/api/registry/:id', (req, res) => {
    if (!db.prepare('SELECT 1 FROM ai_uses WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'AI use was not found.' });
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body), now = new Date().toISOString();
    db.prepare('UPDATE ai_uses SET name=?, purpose=?, owner=?, category=?, data_description=?, updated_at=? WHERE id=?')
      .run(value.name,value.purpose,value.owner,value.category,value.dataDescription,now,req.params.id);
    res.json(map(db.prepare('SELECT * FROM ai_uses WHERE id = ?').get(req.params.id)));
  });
  app.post('/api/examples', (_req, res) => {
    const exists = db.prepare('SELECT 1 FROM ai_uses WHERE name = ?'), insert = db.prepare('INSERT INTO ai_uses VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    let added = 0;
    for (const [name,owner,category,purpose,data] of samples) if (!exists.get(name)) {
      const now = new Date().toISOString(); insert.run(randomUUID(),name,purpose,owner,category,data,now,now); added++;
    }
    res.json({ added });
  });
  app.get('/api/overview', (_req, res) => {
    const total = db.prepare('SELECT COUNT(*) count FROM ai_uses').get().count;
    const byCategory = Object.fromEntries(categories.map(name => [name, 0]));
    for (const row of db.prepare('SELECT category, COUNT(*) count FROM ai_uses GROUP BY category').all()) byCategory[row.category] = row.count;
    res.json({ total, unassessed: total, byCategory });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route was not found.' }));
  return app;
}