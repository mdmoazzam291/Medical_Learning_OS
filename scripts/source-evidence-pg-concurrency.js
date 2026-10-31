// Owns a fresh private local cluster. No database URL or hosted connection option.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {canonicalize,digestCanonical} from '../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../src/domain/source-evidence-staging.js';
import {exportSourceEvidenceSnapshot,restoreSourceEvidenceSnapshot} from './lib/source-evidence-sql-snapshot.js';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const omitLocks=process.argv.includes('--omit-locks');
if(process.argv.slice(2).some(a=>a!=='--omit-locks'))throw new Error('unknown option');
const owner='11111111-1111-4111-8111-111111111111',clients=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startDisposableNativePostgres({postgres});
async function connect(database='postgres'){
 const c=new Client({...server.config,database});await c.connect();clients.push(c);
 await c.query("set statement_timeout='8s';set lock_timeout='8s'");return c;
}
async function envelope(p=null,requestId=crypto.randomUUID()){
 p??={packageId:crypto.randomUUID(),packageVersion:1,cases:[{caseId:'native-case',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'native-fixture',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
 const m=await digestSourceRowPackage(p),b=await prepareSourceEvidenceStagingRequest({...p,requestId,expectedPackageDigest:m.packageDigest},owner),{packageDigest,...manifest}=m;
 const r={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
 return {p,b,args:[owner,canonicalize(p),canonicalize({contractId:'source-row-package-evidence-v1',...manifest}),b,canonicalize(r),canonicalize({...r,receiptDigest:(await digestCanonical(r)).digestHex})]};
}
const stage=(c,e)=>c.query('select evidence_probe.stage($1,$2,$3,$4,$5,$6) result',e.args).then(r=>r.rows[0].result);
const read=(c,e)=>c.query('select evidence_probe.readback($1,$2,$3,$4,$5) result',[owner,e.b.packageId,e.b.packageVersion,e.b.packageDigest,e.b.requestId]).then(r=>r.rows[0].result);
const outcome=p=>p.then(value=>({value}),error=>({error}));
const sqlAdapter=c=>({exec:sql=>c.query(sql),query:(...args)=>c.query(...args)});
try{
 const g=await connect(),a=await connect(),b=await connect();
 const pid=async c=>(await c.query('select pg_backend_pid() pid')).rows[0].pid;
 const ids=await Promise.all([g,a,b].map(pid));assert.equal(new Set(ids).size,3);
 const version=(await g.query('select version() v')).rows[0].v;console.log(version.split(' on ')[0]+': three distinct native backend PIDs confirmed.');
 await g.query('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const file of ['schema.sql','digests.sql']){
  let sql=await readFile(new URL('../ops/prototypes/source-evidence/'+file,import.meta.url),'utf8');
  if(omitLocks)sql=sql.replaceAll('perform pg_advisory_xact_lock(730031);','null;');
  await g.query(sql);
 }
 await g.query('select evidence_probe.set_authority($1,true)',[owner]);
 await g.query('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'native-fixture']);
 await a.query('set role service_role');await b.query('set role service_role');
 async function blocked(waiters,blocker){
  const deadline=Date.now()+2500;
  while(Date.now()<deadline){
   const r=(await g.query("select pid from pg_locks where locktype='advisory' and not granted and pid=any($1::int[])",[waiters])).rows;
   if(waiters.every(p=>r.some(x=>x.pid===p))){
    for(const p of waiters)assert.ok((await g.query('select pg_blocking_pids($1) p',[p])).rows[0].p.includes(blocker),'expected actual blocker');return;
   }
   await pause(20);
  }
  throw new Error('advisory_barrier_not_observed');
 }
 async function counts(e){
  for(const t of ['packages','revisions','requests','events']){
   const result=t==='events'?await g.query('select count(*)::int n from evidence_probe.events where request_id=$1',[e.b.requestId]):await g.query('select count(*)::int n from evidence_probe.'+t+' where package_id=$1',[e.b.packageId]);
   assert.equal(result.rows[0].n,1,t+' has one committed record');
  }
 }
 async function receipt(c,e){const r=await read(c,e);assert.equal(await matchesSourceEvidenceStagingReceipt(JSON.parse(r.receipt),e.b),true);}
 const same=await envelope();
 await g.query('begin;select pg_advisory_xact_lock(730031)');
 const sameA=outcome(stage(a,same)),sameB=outcome(stage(b,await envelope(same.p,same.b.requestId)));
 await blocked([ids[1],ids[2]],ids[0]);await g.query('commit');
 const sr=await Promise.all([sameA,sameB]);assert.ok(sr.every(x=>x.value?.status==='committed'));assert.deepEqual(sr[0].value,sr[1].value);await counts(same);await receipt(a,same);
 console.log('Native race PASS: identical requests wait at real barrier and converge to original receipt.');

 const original=await envelope(),changed=structuredClone(original.p);changed.cases[0].caseVersion++;
 const alternative=await envelope(changed,original.b.requestId);
 await g.query('begin;select pg_advisory_xact_lock(730031)');
 const ca=outcome(stage(a,original)),cb=outcome(stage(b,alternative));
 await blocked([ids[1],ids[2]],ids[0]);await g.query('commit');
 const cr=await Promise.all([ca,cb]);assert.equal(cr.filter(x=>x.value?.status==='committed').length,1);assert.equal(cr.filter(x=>x.error?.message==='evidence_conflict').length,1);
 const winner=cr[0].value?original:alternative;await counts(winner);await receipt(a,winner);
 console.log('Native race PASS: conflicting concurrent payloads produce one commit and one conflict.');

 const withdrawn=await envelope();await stage(a,withdrawn);
 await g.query('begin');await g.query('select evidence_probe.withdraw_metadata($1,$2,$3,$4)',[owner,withdrawn.b.packageId,1,withdrawn.b.packageDigest]);
 const wa=outcome(stage(a,withdrawn)),wb=outcome(read(b,withdrawn));await blocked([ids[1],ids[2]],ids[0]);await g.query('commit');
 assert.ok((await Promise.all([wa,wb])).every(x=>x.error?.message==='evidence_denied'));await counts(withdrawn);
 console.log('Native race PASS: withdrawal commits first; waiting stage and readback both deny.');

 const stagedFirst=await envelope();
 await a.query('begin');await stage(a,stagedFirst);await b.query('reset role;begin');
 const withdrawal=outcome(b.query('select evidence_probe.withdraw_metadata($1,$2,$3,$4)',[owner,stagedFirst.b.packageId,1,stagedFirst.b.packageDigest]));
 await blocked([ids[2]],ids[1]);await a.query('commit');assert.ok(!(await withdrawal).error);await b.query('commit;set role service_role');
 await assert.rejects(read(a,stagedFirst),/evidence_denied/);await counts(stagedFirst);
 console.log('Native race PASS: staging commits first, queued withdrawal commits, later readback denies.');

 for(const kind of ['authority','policy']){
  const e=await envelope();await stage(a,e);await g.query('begin');
  if(kind==='authority')await g.query('select evidence_probe.set_authority($1,false)',[owner]);
  else await g.query('select evidence_probe.set_source_policy($1,$2,false)',['a'.repeat(64),'native-fixture']);
  const da=outcome(stage(a,e)),db=outcome(read(b,e));await blocked([ids[1],ids[2]],ids[0]);await g.query('commit');
  assert.ok((await Promise.all([da,db])).every(x=>x.error?.message==='evidence_denied'));await counts(e);
  if(kind==='authority')await g.query('select evidence_probe.set_authority($1,true)',[owner]);
  else await g.query('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'native-fixture']);
  console.log('Native race PASS: '+kind+' denial visible after lock wait; explicit fixture re-enable starts next scenario.');
 }
 const rolled=await envelope();await a.query('begin');await stage(a,rolled);
 const retry=outcome(stage(b,await envelope(rolled.p,rolled.b.requestId)));await blocked([ids[2]],ids[1]);await a.query('rollback');assert.equal((await retry).value?.status,'committed');await counts(rolled);await receipt(b,rolled);
 console.log('Native race PASS: full transaction rollback releases waiter without orphan/duplicate records.');

 const snapshot=await exportSourceEvidenceSnapshot(sqlAdapter(g));
 await g.query('create database evidence_restore_probe');
 const restored=await connect('evidence_restore_probe');
 for(const file of ['schema.sql','digests.sql'])await restored.query(await readFile(new URL('../ops/prototypes/source-evidence/'+file,import.meta.url),'utf8'));
 await restoreSourceEvidenceSnapshot(sqlAdapter(restored),snapshot,snapshot.snapshotDigest);
 assert.equal((await exportSourceEvidenceSnapshot(sqlAdapter(restored))).snapshotDigest,snapshot.snapshotDigest);
 await restored.query('set role service_role');await receipt(restored,same);await assert.rejects(read(restored,withdrawn),/evidence_denied/);
 for(const role of ['anon','authenticated']){await restored.query('reset role;set role '+role);await assert.rejects(restored.query('select * from evidence_probe.revisions'),/permission denied/);await assert.rejects(read(restored,same),/permission denied/);}
 console.log('Native recovery PASS: exact snapshot digest, receipt/withdrawal and browser ACL parity.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Native fixture cleanup PASS: clients closed, server stopped and private cluster removed.');
}
