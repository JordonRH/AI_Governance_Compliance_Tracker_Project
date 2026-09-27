import { resolve } from 'node:path';
import { createAccount, accountRoles } from './auth.js';
import { openDatabase } from './database.js';

const options={};
for(let i=2;i<process.argv.length;i+=2) options[process.argv[i]?.replace(/^--/,'')]=process.argv[i+1];
const password=process.env.AITRACE_ACCOUNT_PASSWORD;
if(!password) throw new Error('Set AITRACE_ACCOUNT_PASSWORD for this command, then clear it from the terminal environment.');
const required=['organization-id','organization-name','login','display-name','role'];
for(const key of required) if(!options[key]) throw new Error(`Missing --${key}.`);
if(!accountRoles.includes(options.role)) throw new Error(`--role must be one of: ${accountRoles.join(', ')}.`);
const db=openDatabase(resolve(process.cwd(),process.env.DATABASE_PATH || 'data/aitrace.sqlite'));
try {
  const id=await createAccount(db,{organizationId:options['organization-id'],organizationName:options['organization-name'],login:options.login,displayName:options['display-name'],role:options.role,password});
  console.log(`Created account ${id} for ${options.login}.`);
} finally { db.close(); }
