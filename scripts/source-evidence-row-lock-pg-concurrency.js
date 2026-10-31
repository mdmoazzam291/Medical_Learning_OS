// Fresh private native cluster only. Minimal authority schema, no provider mutation triggers.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {installPlatformFixture,platformFixture as f} from './lib/source-evidence-platform-fixture.js';
import {capabilityEnvelope} from './lib/source-evidence-capability-envelope.js';
import {createSourceEvidencePrivateQuery} from './lib/source-evidence-private-boundary.js';
import {createSourceEvidenceVerifiedUser} from './lib/source-evidence-private-boundary.js';
import {createSourceEvidenceOwnerDelegation} from './lib/source-evidence-owner-delegation.js';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const weak=process.argv.includes('--key-share');if(process.argv.slice(2).some(a=>a!=='--key-share'))throw Error('unknown option');
const server=await startDisposableNativePostgres({postgres}),clients=[],errors=[];
const outcome=p=>p.then(value=>({value}),error=>({error}));
async function connect(user='postgres'){
 const c=new Client({...server.config,user});c.on('error',e=>errors.push(e));await c.connect();clients.push(c);await c.query("set statement_timeout='8s';set lock_timeout='8s'");return c;
}
const stage=(c,e)=>c.query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args).then(r=>r.rows[0].r);
const read=(c,e)=>c.query('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[f.owner,f.session,e.b.packageId,e.b.packageVersion,e.b.packageDigest,e.b.requestId]).then(r=>r.rows[0].r);
try{
 const g=await connect();
 const expectedVersion=process.env.EXPECTED_NATIVE_PG_VERSION;
 if(expectedVersion){
  assert.match(expectedVersion,/^1[5-9]\.[0-9]+$/,'version guard requires a major.minor target');
  const serverVersion=Number((await g.query("select current_setting('server_version_num')::int as n")).rows[0].n);
  const actualVersion=`${Math.floor(serverVersion/10000)}.${serverVersion%10000}`;
  assert.equal(actualVersion,expectedVersion,'native PostgreSQL fixture does not match pinned expected version');
  console.log('Authority native PostgreSQL version PASS: '+actualVersion);
 }
 await installPlatformFixture({exec:s=>g.query(s),query:(...a)=>g.query(...a)},{capability:true});
 let overlay=await readFile(new URL('../ops/prototypes/source-evidence/authority-row-locks.sql',import.meta.url),'utf8');if(weak)overlay=overlay.replaceAll(' for share;',' for key share;');await g.query(overlay);
 await g.query('update evidence_probe.platform_feature set enabled=true');
 assert.equal((await g.query("select count(*)::int n from pg_trigger where not tgisinternal and tgrelid in ('auth.users'::regclass,'auth.sessions'::regclass,'public.content_admin_account'::regclass,'evidence_probe.platform_feature'::regclass)")).rows[0].n,0);
 const a=await connect('evidence_gateway'),b=await connect('evidence_gateway'),w=await connect();
 const pid=async c=>(await c.query('select pg_backend_pid() p')).rows[0].p;
 const [ap,bp,wp]=await Promise.all([a,b,w].map(pid));assert.equal(new Set([ap,bp,wp]).size,3);
 assert.deepEqual((await a.query('select session_user s,current_user c')).rows[0],{s:'evidence_gateway',c:'evidence_gateway'});
 for(const sql of ['set role evidence_authority_locker','select * from auth.users','select evidence_probe.lock_platform_authority(null,null)'])await assert.rejects(a.query(sql),/permission denied|cannot set role/);
 async function reaches(p,target,seen=new Set()){
  if(p===target)return true;if(seen.has(p))return false;seen.add(p);
  for(const q of (await g.query('select pg_blocking_pids($1) p',[p])).rows[0].p)if(await reaches(q,target,seen))return true;return false;
 }
 async function blocked(waiters,blocker){
  const end=Date.now()+2500;
  while(Date.now()<end){
   const rows=(await g.query("select pid from pg_locks where locktype in ('transactionid','tuple') and not granted and pid=any($1::int[])",[waiters])).rows;
   if(waiters.every(p=>rows.some(r=>r.pid===p))){for(const p of waiters)assert.ok(await reaches(p,blocker),'row wait must reach expected writer');return;}
   await new Promise(r=>setTimeout(r,20));
  }throw Error('row_authority_barrier_not_observed');
 }
 async function counts(e,n){
  for(const t of ['packages','revisions','cases','requests'])assert.equal((await g.query('select count(*)::int n from evidence_probe.'+t+' where package_id=$1',[e.b.packageId])).rows[0].n,n,t);
  assert.equal((await g.query('select count(*)::int n from evidence_probe.events where request_id=$1',[e.b.requestId])).rows[0].n,n,'events');
 }
 const mutations=[
  ['session deletion','delete from auth.sessions where id=$1',[f.session],()=>g.query('insert into auth.sessions(id,user_id) values($1,$2)',[f.session,f.owner])],
  ['retained session expiry',"update auth.sessions set not_after=now()-interval '1 hour' where id=$1",[f.session],()=>g.query('update auth.sessions set not_after=null where id=$1',[f.session])],
  ['account suspension',"update auth.users set banned_until=now()+interval '1 hour' where id=$1",[f.owner],()=>g.query('update auth.users set banned_until=null where id=$1',[f.owner])],
  ['account deletion flag','update auth.users set deleted_at=now() where id=$1',[f.owner],()=>g.query('update auth.users set deleted_at=null where id=$1',[f.owner])],
  ['Admin transfer','update public.content_admin_account set admin_user_id=$1',[f.other],()=>g.query('update public.content_admin_account set admin_user_id=$1',[f.owner])],
  ['feature disable','update evidence_probe.platform_feature set enabled=false',[],()=>g.query('update evidence_probe.platform_feature set enabled=true')]
 ];
 const e=await capabilityEnvelope();assert.equal((await stage(a,e)).status,'committed');
 // Live-independent proof: a new direct-login connection for each fixed SQL
 // statement, refusing postgres as a replacement for the narrow identity.
 const privateQuery=createSourceEvidencePrivateQuery({createClient:()=>new Client({...server.config,user:'evidence_gateway'})});
 assert.equal((await privateQuery('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args)).rows[0].r.status,'committed');
 const guardedRead=await privateQuery('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[f.owner,f.session,e.b.packageId,e.b.packageVersion,e.b.packageDigest,e.b.requestId]);
 assert.equal(JSON.parse(guardedRead.rows[0].r.receipt).requestId,e.b.requestId);
 const broadQuery=createSourceEvidencePrivateQuery({createClient:()=>new Client({...server.config,user:'postgres'})});
 await assert.rejects(broadQuery('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args),/evidence_private_database_unavailable/);
 console.log('Private query adapter PASS: fresh direct narrow login, two exact calls, broad-login denial and canonical readback.');
 // Simulate a provider-documented still-valid access JWT after session expiry.
 // This verifier intentionally continues to return an authentic user identity.
 const retainedToken='e30.'+Buffer.from(JSON.stringify({sub:f.owner,session_id:f.session})).toString('base64url')+'.synthetic';
 const verifyUser=createSourceEvidenceVerifiedUser({getUser:async token=>token===retainedToken?{data:{user:{id:f.owner}},error:null}:{data:{user:null},error:{message:'invalid'}}});
 const delegation=createSourceEvidenceOwnerDelegation({verifyUser,query:privateQuery});
 const retainedCandidate=await capabilityEnvelope();
 const retainedInput={accessToken:retainedToken,candidate:{...retainedCandidate.p,requestId:retainedCandidate.b.requestId,expectedPackageDigest:retainedCandidate.b.packageDigest}};
 const retainedTarget={accessToken:retainedToken,target:{packageId:e.b.packageId,packageVersion:e.b.packageVersion,packageDigest:e.b.packageDigest,requestId:e.b.requestId}};
 await g.query("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[f.session]);
 assert.equal((await g.query('select count(*)::int n from auth.sessions where id=$1',[f.session])).rows[0].n,1);
 await assert.rejects(stage(a,e),/evidence_platform_denied/);
 await assert.rejects(read(b,e),/evidence_platform_denied/);
 assert.deepEqual(await delegation.stage(retainedInput),{status:'denied'});
 assert.deepEqual(await delegation.readback(retainedTarget),{status:'denied'});
 assert.equal((await g.query('select count(*)::int n from evidence_probe.requests where request_id=$1',[retainedCandidate.b.requestId])).rows[0].n,0);
 await g.query("update auth.sessions set not_after=now()+interval '1 hour' where id=$1",[f.session]);
 assert.equal((await stage(a,e)).status,'committed');
 assert.equal((await delegation.stage(retainedInput)).status,'accepted');
 await g.query('update auth.sessions set not_after=null where id=$1',[f.session]);
 assert.equal((await stage(a,e)).status,'committed');
 console.log('Authority retained session expiry PASS: expired retained row denied, future/null deadline accepted.');
 for(const [label,sql,args,restore] of mutations){
  await w.query('begin');await w.query(sql,args);
  assert.equal((await g.query("select count(*)::int n from pg_locks where pid=$1 and locktype='advisory'",[wp])).rows[0].n,0);
  const s=outcome(stage(a,e)),r=outcome(read(b,e));await blocked([ap,bp],wp);await w.query('commit');
  for(const result of await Promise.all([s,r]))assert.match(result.error?.message||'',/evidence_platform_denied/);
  await restore();assert.equal((await stage(a,e)).status,'committed');
  console.log('Authority row race PASS: writer-first '+label+' blocks retry/readback without triggers.');
 }
 for(const [label,sql,args,restore] of mutations){
  const fresh=await capabilityEnvelope();await a.query('begin');assert.equal((await stage(a,fresh)).status,'committed');
  const writing=outcome(w.query(sql,args));await blocked([wp],ap);await a.query('commit');assert.equal((await writing).error,undefined);
  await counts(fresh,1);await assert.rejects(read(b,fresh),/evidence_platform_denied/);await restore();await read(b,fresh);
  console.log('Authority row race PASS: evidence-first '+label+' waits for commit, then later delivery denies.');
 }
 await w.query('begin');await w.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[f.owner]);
 const retry=outcome(stage(a,e));await blocked([ap],wp);await w.query('rollback');assert.equal((await retry).value?.status,'committed');await counts(e,1);
 const rolled=await capabilityEnvelope();await a.query('begin');await stage(a,rolled);
 const feature=outcome(w.query('update evidence_probe.platform_feature set enabled=false'));await blocked([wp],ap);await a.query('rollback');assert.equal((await feature).error,undefined);await counts(rolled,0);
 await g.query('update evidence_probe.platform_feature set enabled=true');assert.equal((await stage(a,rolled)).status,'committed');await counts(rolled,1);
 console.log('Authority rollback PASS: writer rollback releases valid retry; evidence rollback leaves no package/case/request/event and reconciles once.');
 await a.query('begin');await stage(a,e);
 await w.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[f.other]);await a.query('commit');
 await g.query('update auth.users set banned_until=null where id=$1',[f.other]);
 console.log('Authority independence PASS: unrelated account update proceeds while owner evidence holds row locks.');
 // Deliberately inverse lock order: representative writer holds Admin before account.
 const dead=await capabilityEnvelope();await w.query('begin');await w.query('select singleton from public.content_admin_account where singleton=true for update');
 const staging=outcome(stage(a,dead));await blocked([ap],wp);
 const writing=outcome(w.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[f.owner])).then(async r=>{await w.query(r.error?'rollback':'commit');return r;});
 const [sr,wr]=await Promise.all([staging,writing]);assert.equal([sr,wr].filter(r=>r.error?.code==='40P01').length,1);
 assert.ok(sr.error?.code==='40P01'||sr.value?.status==='committed');await counts(dead,sr.error?0:1);
 await g.query('update auth.users set banned_until=null where id=$1',[f.owner]);assert.equal((await stage(a,dead)).status,'committed');await counts(dead,1);
 console.log('Authority deadlock PASS: mixed lock order yields40P01, victim metadata rolls back, same-request retry reconciles once; no deadlock-free claim.');
 assert.equal(errors.length,0);
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));console.log('Authority row fixture cleanup PASS');
}
