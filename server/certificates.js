import {createHash, createPrivateKey, X509Certificate, randomUUID} from 'node:crypto';
import {createSecureContext} from 'node:tls';
import {mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {generate} from 'selfsigned';

export function validateCertificatePair({cert,key},{requireCurrent=true}={}) {
  if(typeof cert!=='string'||typeof key!=='string'||cert.length>20000||key.length>12000)throw new Error('Provide a PEM certificate chain and private key within the size limits.');
  let certificate;
  try {
    certificate=new X509Certificate(cert);
    if(!certificate.checkPrivateKey(createPrivateKey(key)))throw new Error();
    createSecureContext({cert,key,minVersion:'TLSv1.2'});
  }catch {throw new Error('The certificate and private key must be valid, matching PEM files.');}
  if(requireCurrent&&(Date.parse(certificate.validFrom)>Date.now()||Date.parse(certificate.validTo)<=Date.now()))throw new Error('The certificate must currently be valid.');
  if(!certificate.checkHost('localhost')||!certificate.checkIP('127.0.0.1'))throw new Error('The local certificate must cover localhost and 127.0.0.1.');
  return {subject:certificate.subject,issuer:certificate.issuer,validFrom:certificate.validFrom,validTo:certificate.validTo,fingerprint:certificate.fingerprint256,selfSigned:certificate.subject===certificate.issuer&&certificate.verify(certificate.publicKey)};
}

export function readTlsBundle(path){
  const pair=JSON.parse(readFileSync(path,'utf8'));
  validateCertificatePair(pair);
  return {cert:pair.cert,key:pair.key};
}

export function createCertificateStore(directory,{activeFingerprint=null,secure=false}={}){
  const pending=new Set();
  const filename=org=>join(directory,createHash('sha256').update(org).digest('hex')+'.json');
  function status(org){
    const path=filename(org);
    const stored=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
    return {secure,activeFingerprint,bundlePath:path,staged:stored?{...validateCertificatePair(stored,{requireCurrent:false}),kind:stored.kind,updatedAt:stored.updatedAt,updatedBy:stored.updatedBy}:null};
  }
  function save(org,actor,pair,kind){
    validateCertificatePair(pair);
    mkdirSync(directory,{recursive:true,mode:0o700});
    const path=filename(org),temporary=path+'.'+randomUUID()+'.tmp';
    try{writeFileSync(temporary,JSON.stringify({...pair,kind,updatedAt:new Date().toISOString(),updatedBy:actor}),{mode:0o600,flag:'wx'});renameSync(temporary,path);}finally{rmSync(temporary,{force:true});}
    return status(org);
  }
  return {status,replace:(org,actor,pair)=>save(org,actor,{cert:pair.cert,key:pair.key},'uploaded'),async generate(org,actor){
    if(pending.has(org))throw new Error('Certificate generation is already running.');
    pending.add(org);
    try {
      const pair=await generate([{name:'commonName',value:'localhost'}],{keySize:2048,algorithm:'sha256',notAfterDate:new Date(Date.now()+30*86400000),extensions:[{name:'basicConstraints',cA:false},{name:'keyUsage',digitalSignature:true,keyEncipherment:true},{name:'extKeyUsage',serverAuth:true},{name:'subjectAltName',altNames:[{type:2,value:'localhost'},{type:7,ip:'127.0.0.1'}]}]});
      return save(org,actor,{cert:pair.cert,key:pair.private},'temporary');
    }finally{pending.delete(org);}
  }};
}

export function registerCertificates(app,requirePermission,store){
  const guard=requirePermission('account:manage');
  app.get('/api/certificates',guard,(req,res)=>res.json(store?store.status(req.principal.organizationId):{available:false}));
  for(const action of ['generate','replace'])app.post('/api/certificates/'+action,guard,async(req,res,next)=>{
    if(!store)return res.status(503).json({error:'Certificate storage is not configured.'});
    try{res.json(await store[action](req.principal.organizationId,req.principal.accountId,req.body||{}));}
    catch(error){if(error.code)return next(error);res.status(400).json({error:error.message});}
  });
}

