import { resolve } from 'node:path';
import { createAccount } from './auth.js';
import { openDatabase } from './database.js';
const db=openDatabase(resolve(process.cwd(),process.env.DATABASE_PATH));
try{await createAccount(db,{organizationId:'fictional-sme',organizationName:'Fictional SME',login:'admin@example.test',displayName:'Fictional Administrator',role:'administrator',password:'correct horse battery'});}finally{db.close();}
await import('./index.js');
