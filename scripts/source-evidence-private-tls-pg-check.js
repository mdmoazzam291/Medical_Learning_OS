// DISPOSABLE TLS/SCRAM, least-privilege and pg_dump/restore acceptance.
// No hosted project access, real-user data, test artifact publication or
// provider-managed Auth schema. All keys/passwords are generated per run.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {createIsolatedPrivateTlsQuery,validateIsolatedTlsGatewayConfig} from './lib/source-evidence-private-tls-connector.js';
const execFile=promisify(execFileCallback);
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const server=await startDisposableNativePostgres({postgres,tls:true}),clients=[];
const actor='11111111-1111-4111-8111-111111111111',session='33333333-3333-4333-8333-333333333333',digest='a'.repeat(64);
const stageSql='select evidence_private.stage($1,$2,$3,$4) as r';
const intentSql='select evidence_private.reserve_intent($1,$2,$3,$4) as r';
const pwd=()=>randomBytes(32).toString('hex');
const gatewayPassword=pwd(),controllerPassword=pwd(),confirmerPassword=pwd();
const base={host:server.tls.host,port:server.tls.port,database:'postgres',user:'evidence_private_gateway',
 password:gatewayPassword,ca:server.tls.ca,confirmation:'DISPOSABLE_PRIVATE_TLS_ONLY'};
const clientFor=cfg=>new Client(cfg);
const socketClient=async database=>{
 const c=new Client({...server.config,database:database||'postgres'});await c.connect();clients.push(c);return c;
};
const tcpClient=async (user,password,overrides={})=>{
 const c=new Client({host:server.tls.host,port:server.tls.port,database:'postgres',user,password,
  ssl:{ca:server.tls.ca,rejectUnauthorized:true},connectionTimeoutMillis:3000,...overrides});
 await c.connect();clients.push(c);return c;
};
const probe=async cfg=>{
 let c;try{c=new Client(cfg);await c.connect();return {connected:true};}
 catch{return {connected:false};}
 finally{if(c)try{await c.end();}catch{}}
};
const audit=async (admin,expectedEnabled)=>{
 const rows=(await admin.query(`select
  (select rolcanlogin=false and rolbypassrls=false and rolsuper=false
   from pg_catalog.pg_roles where rolname='evidence_private_owner') as owner_safe,
  (select rolcanlogin=true and rolbypassrls=false and rolsuper=false
   from pg_catalog.pg_roles where rolname='evidence_private_gateway') as gateway_safe,
  pg_catalog.has_schema_privilege('evidence_private_gateway','evidence_private','USAGE') as schema_usage,
  pg_catalog.has_table_privilege('evidence_private_gateway','evidence_private.subjects','SELECT') as subjects_select,
  pg_catalog.has_table_privilege('evidence_private_gateway','evidence_private.receipts','SELECT') as receipts_select,
  pg_catalog.has_table_privilege('evidence_private_gateway','evidence_private.delivery_attempts','SELECT') as attempts_select,
  pg_catalog.has_function_privilege('evidence_private_gateway','evidence_private.stage(uuid,uuid,uuid,text)','EXECUTE') as stage_exec,
  pg_catalog.has_function_privilege('evidence_private_gateway','evidence_private.reserve_intent(uuid,uuid,uuid,text)','EXECUTE') as reserve_exec,
  pg_catalog.has_function_privilege('evidence_private_gateway','evidence_private.control(uuid,boolean,integer)','EXECUTE') as control_exec,
  pg_catalog.has_function_privilege('evidence_private_gateway','evidence_private.record_ack(uuid,uuid,text,text)','EXECUTE') as ack_exec,
  pg_catalog.has_function_privilege('evidence_private_controller','evidence_private.stage(uuid,uuid,uuid,text)','EXECUTE') as controller_stage,
  pg_catalog.has_function_privilege('evidence_private_confirmer','evidence_private.reserve_intent(uuid,uuid,uuid,text)','EXECUTE') as confirmer_reserve`)).rows[0];
 assert.deepEqual(rows,{owner_safe:true,gateway_safe:true,schema_usage:true,
  subjects_select:false,receipts_select:false,attempts_select:false,
  stage_exec:true,reserve_exec:true,control_exec:false,ack_exec:false,
  controller_stage:false,confirmer_reserve:false});
 // Restore-audit also checks functions remain SECURITY DEFINER with a
 // locked search_path, never invoker/public defaults.
 const funcs=(await admin.query(`select p.proname,p.prosecdef,
 p.proconfig from pg_catalog.pg_proc p join pg_catalog.pg_namespace n
 on n.oid=p.pronamespace where n.nspname='evidence_private'
 and p.proname in ('stage','reserve_intent','control','record_ack')
 order by p.proname`)).rows;
 assert.equal(funcs.length,4);
 for(const f of funcs){
  assert.equal(f.prosecdef,true);
  assert.ok(f.proconfig?.includes('search_path=""'));
 }
 if(expectedEnabled!==undefined){
  const state=(await admin.query('select enabled from evidence_private.subjects where actor=$1',[actor])).rows[0]?.enabled;
  assert.equal(state,expectedEnabled);
 }
};
try{
 const admin=await socketClient();
 const schema=await readFile(new URL('../ops/prototypes/source-evidence/private-authority.sql',import.meta.url),'utf8');
 await admin.query(schema);
 for(const [role,password] of [['evidence_private_gateway',gatewayPassword],
  ['evidence_private_controller',controllerPassword],['evidence_private_confirmer',confirmerPassword]]){
  await admin.query("alter role "+role+" password '"+password+"'");
 }
 await audit(admin);
 const sqlConn=createIsolatedPrivateTlsQuery({config:base,createClient:clientFor});
 const controller=await tcpClient('evidence_private_controller',controllerPassword);
 await controller.query('select evidence_private.control($1,true,600)',[actor]);
 const request=randomUUID();
 const staged=await sqlConn(stageSql,[actor,session,request,digest]);
 assert.equal(staged.rows[0].r.status,'staged');
 const reserved=await sqlConn(intentSql,[actor,session,request,digest]);
 assert.equal(reserved.rows[0].r.status,'intent-recorded');
 assert.equal((await sqlConn(intentSql,[actor,session,request,digest])).rows[0].r.status,'reconciliation-required');
 await audit(admin,true);
 console.log('Private TLS PASS: verified certificate, encrypted connection, SCRAM login, exact gateway role and locked RPC allowlist.');
 const plain=await probe({host:base.host,port:base.port,database:'postgres',user:base.user,
  password:gatewayPassword,ssl:false,connectionTimeoutMillis:2000});
 assert.equal(plain.connected,false);
 const invalidPass=await probe({host:base.host,port:base.port,database:'postgres',user:base.user,
  password:pwd(),ssl:{ca:base.ca,rejectUnauthorized:true},connectionTimeoutMillis:2000});
 assert.equal(invalidPass.connected,false);
 const wrongCa=join(server.root,'wrong-ca.crt');
 await execFile('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
  '-subj','/CN=Wrong Disposable CA','-keyout',join(server.root,'wrong-ca.key'),'-out',wrongCa],{timeout:5000});
 assert.equal((await probe({host:base.host,port:base.port,database:'postgres',user:base.user,
  password:gatewayPassword,ssl:{ca:await readFile(wrongCa,'utf8'),rejectUnauthorized:true},
  connectionTimeoutMillis:2000})).connected,false);
 assert.equal((await probe({host:base.host,port:base.port,database:'postgres',user:base.user,
  password:gatewayPassword,ssl:{ca:base.ca,rejectUnauthorized:true,servername:'wrong.example.invalid'},
  connectionTimeoutMillis:2000})).connected,false);
 for(const patch of [{user:'postgres'},{user:'evidence_private_controller'},
  {host:'localhost'},{port:5432},{database:'hosted'},{password:'x'},
  {ca:'not-a-ca'},{confirmation:'PRODUCTION'}]){
  assert.throws(()=>validateIsolatedTlsGatewayConfig({...base,...patch}),/private_tls_gateway_not_accepted/);
 }
 await assert.rejects(sqlConn('select * from evidence_private.receipts',[]),/private_tls_gateway_not_accepted/);
 await assert.rejects(sqlConn('select evidence_private.control($1,true,60)',[actor]),/private_tls_gateway_not_accepted/);
 const gateway=await tcpClient('evidence_private_gateway',gatewayPassword);
 await assert.rejects(gateway.query('select * from evidence_private.receipts'),/permission denied/);
 await assert.rejects(gateway.query('set role evidence_private_owner'),/permission denied|cannot set role/);
 await assert.rejects(gateway.query('select evidence_private.record_ack($1,$2,$3,$4)',[request,randomUUID(),digest,digest]),/permission denied/);
 await assert.rejects(controller.query(stageSql,[actor,session,randomUUID(),digest]),/permission denied/);
 // Inject a client that ignores the requested credential; attestation must
 // reject before making the gated SQL call.
 await assert.rejects(createIsolatedPrivateTlsQuery({
  config:base,createClient:()=>new Client({host:base.host,port:base.port,database:'postgres',
   user:'evidence_private_controller',password:controllerPassword,
   ssl:{ca:base.ca,rejectUnauthorized:true}})
 })(stageSql,[actor,session,randomUUID(),digest]),/private_tls_gateway_not_accepted/);
 console.log('Private TLS PASS: plaintext, wrong password/CA/hostname/role, cross-role grants and arbitrary SQL rejected.');
 const archive=join(server.root,'private-schema.dump'),bin=join(server.root,'native','bin');
 const env={...process.env,LD_LIBRARY_PATH:join(server.root,'native','lib')};
 await execFile(join(bin,'pg_dump'),['-h',server.config.host,'-p','55432','-U','postgres',
  '-d','postgres','-n','evidence_private','-F','c','-f',archive],{env,timeout:15000});
 // Disable generic CONNECT before the restored fixture is published. The
 // admin socket restores and freezes private epochs before any gateway access.
 await admin.query('create database mlos_private_restore');
 await admin.query('revoke connect on database mlos_private_restore from public');
 assert.equal((await probe({...base,database:'mlos_private_restore',ssl:{ca:base.ca,rejectUnauthorized:true}})).connected,false);
 await execFile(join(bin,'pg_restore'),['-h',server.config.host,'-p','55432','-U','postgres',
  '-d','mlos_private_restore','--no-password',archive],{env,timeout:15000});
 const restored=await socketClient('mlos_private_restore');
 await audit(restored,true);
 // A backup can contain enabled-but-stale authority: fail closed on restore.
 // The controller is not allowed to connect until a privileged, audited
 // restore procedure invalidates all previous private leases.
 await restored.query(`update evidence_private.subjects set enabled=false,epoch=epoch+1,
  lease_until=pg_catalog.clock_timestamp(),updated_at=pg_catalog.clock_timestamp()`);
 await audit(restored,false);
 await restored.query('grant connect on database mlos_private_restore to evidence_private_gateway');
 const restoredQuery=createIsolatedPrivateTlsQuery({
  config:{...base,database:'mlos_private_restore'},createClient:clientFor
 });
 await assert.rejects(restoredQuery(stageSql,[actor,session,randomUUID(),digest]),/private_denied/);
 await audit(restored,false);
 console.log('Private TLS RESTORE PASS: schema ACL/function manifest preserved, old lease force-revoked before gateway CONNECT, stale request denied.');
 // Negative controls: accidental broad table grant and function grant must
 // be detected immediately, not reported as a successful restore.
 await restored.query('grant select on evidence_private.receipts to evidence_private_gateway');
 await assert.rejects(audit(restored,false));
 await restored.query('revoke select on evidence_private.receipts from evidence_private_gateway');
 await restored.query('grant execute on function evidence_private.control(uuid,boolean,int) to evidence_private_gateway');
 await assert.rejects(audit(restored,false));
 await restored.query('revoke execute on function evidence_private.control(uuid,boolean,int) from evidence_private_gateway');
 await audit(restored,false);
 console.log('Private TLS RESTORE PASS: tampered grants detected, restoring exact least-privilege ACL manifest.');
}finally{
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Private TLS disposable native PostgreSQL cleanup PASS');
}
