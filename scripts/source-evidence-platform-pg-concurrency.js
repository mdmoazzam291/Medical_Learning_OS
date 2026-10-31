// Private native fixture; no database URL, production Auth objects or credentials.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {installPlatformFixture,platformFixture as f} from './lib/source-evidence-platform-fixture.js';
import {capabilityEnvelope} from './lib/source-evidence-capability-envelope.js';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const omit=process.argv.includes('--omit-auth-locks');
if(process.argv.slice(2).some(a=>a!=='--omit-auth-locks'))throw new Error('unknown option');
const server=await startDisposableNativePostgres({postgres}),clients=[],connectionErrors=[];
const outcome=p=>p.then(value=>({value}),error=>({error}));
async function connect(user='postgres'){
 const c=new Client({...server.config,user});c.on('error',e=>connectionErrors.push(e));await c.connect();clients.push(c);
 await c.query("set statement_timeout='8s';set lock_timeout='8s'");return c;
}
const stage=(c,e)=>c.query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args).then(r=>r.rows[0].r);
const read=(c,e)=>c.query('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[f.owner,f.session,e.b.packageId,e.b.packageVersion,e.b.packageDigest,e.b.requestId]).then(r=>r.rows[0].r);
try{
 const g=await connect();await installPlatformFixture({exec:s=>g.query(s),query:(...a)=>g.query(...a)},{capability:true});
 if(!omit)await g.query(await readFile(new URL('../ops/prototypes/source-evidence/platform-mutation-lock.sql',import.meta.url),'utf8'));
 await g.query('update evidence_probe.platform_feature set enabled=true');
 const a=await connect('evidence_gateway'),b=await connect('evidence_gateway'),w=await connect();
 const pid=async c=>(await c.query('select pg_backend_pid() p')).rows[0].p;
 const [ap,bp,wp]=await Promise.all([a,b,w].map(pid));assert.equal(new Set([ap,bp,wp]).size,3);
 assert.equal((await a.query('select session_user s,current_user c')).rows[0].s,'evidence_gateway');
 for(const sql of ['set role evidence_executor','set role service_role','set session authorization postgres','select * from evidence_probe.requests','select evidence_probe.platform_guard(null,null)'])await assert.rejects(a.query(sql),/permission denied|cannot set role/);
 async function blocked(waiters,blocker){
  const end=Date.now()+2500;
  while(Date.now()<end){
   const rows=(await g.query("select pid from pg_locks where locktype='advisory' and not granted and pid=any($1::int[])",[waiters])).rows;
   if(waiters.every(p=>rows.some(r=>r.pid===p))){for(const p of waiters)assert.ok((await g.query('select pg_blocking_pids($1) p',[p])).rows[0].p.includes(blocker));return;}
   await new Promise(r=>setTimeout(r,20));
  }throw new Error('platform_advisory_barrier_not_observed');
 }
 const e=await capabilityEnvelope();assert.equal((await stage(a,e)).status,'committed');
 async function denyFirst(label,sql,params,restore){
  await w.query('begin');await w.query(sql,params);
  const retry=outcome(stage(a,e)),reading=outcome(read(b,e));
  await blocked([ap,bp],wp);await w.query('commit');
  for(const result of await Promise.all([retry,reading]))assert.match(result.error?.message||'',/evidence_platform_denied/);
  await restore();assert.equal((await stage(a,e)).status,'committed');
  console.log('Native platform race PASS: '+label+' commits before blocked retry/readback.');
 }
 await denyFirst('plain session deletion','delete from auth.sessions where id=$1',[f.session],()=>g.query('insert into auth.sessions values($1,$2)',[f.session,f.owner]));
 await denyFirst('plain account suspension',"update auth.users set banned_until=now()+interval '1 hour' where id=$1",[f.owner],()=>g.query('update auth.users set banned_until=null where id=$1',[f.owner]));
 await denyFirst('plain feature disable','update evidence_probe.platform_feature set enabled=false',[],()=>g.query('update evidence_probe.platform_feature set enabled=true'));
 await denyFirst('plain Admin transfer','update public.content_admin_account set admin_user_id=$1',[f.other],()=>g.query('update public.content_admin_account set admin_user_id=$1',[f.owner]));
 const fresh=await capabilityEnvelope();await a.query('begin');assert.equal((await stage(a,fresh)).status,'committed');
 const deletion=outcome(w.query('delete from auth.sessions where id=$1',[f.session]));
 await blocked([wp],ap);await a.query('commit');assert.equal((await deletion).error,undefined);
 await assert.rejects(read(b,fresh),/evidence_platform_denied/);
 assert.equal((await g.query('select count(*)::int n from evidence_probe.requests where request_id=$1',[fresh.b.requestId])).rows[0].n,1);
 assert.equal(connectionErrors.length,0,'no idle connection errors');
 console.log('Native platform race PASS: staged transaction precedes plain revocation; audit retained, later delivery denied.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));
 console.log('Native platform fixture cleanup PASS');
}
