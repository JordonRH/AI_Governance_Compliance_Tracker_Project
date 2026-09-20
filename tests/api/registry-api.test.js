import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../../server/database.js';
import { createApp } from '../../server/app.js';

const directory = mkdtempSync(join(tmpdir(), 'aitrace-api-')), filename = join(directory, 'registry.sqlite');
const http = { requestBodyLimitBytes: 32768, allowedHostnames: ['127.0.0.1', 'localhost'] };
let db, server, base;
before(async () => { db = openDatabase(filename); server = createServer(createApp(db,http)); await new Promise(ok => server.listen(0,'127.0.0.1',ok)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(ok => server.close(ok)); db.close(); rmSync(directory,{recursive:true,force:true}); });
async function api(path, options={}) { const response = await fetch(base+path,options); return { response, body: await response.json() }; }
function statusWithHost(host) { return new Promise((resolve, reject) => { const target = new URL('/api/health', base); const request = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname, headers: { Host: host } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }); request.on('error', reject); request.end(); }); }
const valid = { name:'Fictional AI helper', owner:'Fictional team', category:'Education', purpose:'Demonstrate registry behaviour.', dataDescription:'Synthetic data only.' };

test('health and empty registry', async () => {
  assert.deepEqual((await api('/api/health')).body,{status:'ok',mode:'local-prototype'});
  assert.deepEqual((await api('/api/registry')).body,{records:[]});
});
test('create, read, filter and update', async () => {
  const made = await api('/api/registry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});
  assert.equal(made.response.status,201); assert.equal(made.body.assessmentStatus,'Not assessed');
  assert.equal((await api(`/api/registry/${made.body.id}`)).body.dataDescription,valid.dataDescription);
  assert.equal((await api('/api/registry?q=helper&category=Education')).body.records.length,1);
  const changed = await api(`/api/registry/${made.body.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...valid,name:'Updated helper'})});
  assert.equal(changed.body.name,'Updated helper');
});
test('invalid and untrusted requests are rejected', async () => {
  const bad = await api('/api/registry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...valid,name:''})});
  assert.equal(bad.response.status,400); assert.ok(bad.body.fields.name);
  assert.equal((await api('/api/registry',{method:'POST',body:'{}'})).response.status,415);
  assert.equal((await api('/api/registry/missing')).response.status,404);
  assert.equal((await api('/api/registry',{headers:{Origin:'https://example.com'}})).response.status,403);
  assert.equal((await api('/api/registry',{headers:{Origin:'http://localhost:65535'}})).response.status,403);
  assert.equal(await statusWithHost('example.com'),403);
});
test('examples are idempotent and counted', async () => {
  assert.equal((await api('/api/examples',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).body.added,3);
  assert.equal((await api('/api/examples',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).body.added,0);
  const summary=(await api('/api/overview')).body; assert.equal(summary.total,4); assert.equal(summary.unassessed,4);
});