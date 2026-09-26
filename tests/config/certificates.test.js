import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer,request} from 'node:https';
import {createCertificateStore,readTlsBundle,validateCertificatePair} from '../../server/certificates.js';
import {loadConfig} from '../../server/config.js';
test('temporary certificates support verified local TLS and mismatched replacements preserve the pair',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'aitrace-tls-'));let server;
 try{
 const store=createCertificateStore(directory),a=await store.generate('org','admin'),b=await store.generate('other','other-admin');
 const pair=readTlsBundle(a.bundlePath),other=readTlsBundle(b.bundlePath);
 assert.throws(()=>store.replace('org','admin',{cert:pair.cert,key:other.key}),/matching/);
 assert.equal(store.status('org').staged.fingerprint,a.staged.fingerprint);
 assert.ok(Date.parse(a.staged.validTo)-Date.now()<31*86400000);
 assert.throws(()=>validateCertificatePair({cert:'invalid',key:'invalid'}),/matching/);
 const config=loadConfig({rootDir:directory,env:{AITRACE_TLS_BUNDLE_PATH:a.bundlePath},args:[]});assert.equal(config.http.secure,true);
 assert.throws(()=>loadConfig({rootDir:directory,env:{AITRACE_TLS_BUNDLE_PATH:a.bundlePath,AITRACE_TLS_CERT_PATH:'cert',AITRACE_TLS_KEY_PATH:'key'},args:[]}),/not both/);
 server=createServer(pair,(_req,res)=>res.end('secure'));await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const body=await new Promise((ok,fail)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,ca:pair.cert},res=>{let text='';res.on('data',x=>text+=x);res.on('end',()=>ok(text));});req.on('error',fail);req.end();});assert.equal(body,'secure');
 }finally{if(server)await new Promise(ok=>server.close(ok));rmSync(directory,{recursive:true,force:true});}
});
