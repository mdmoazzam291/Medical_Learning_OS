// Private fixture immediate-shutdown/WAL recovery, not hosted or hardware power-loss testing.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {canonicalize,digestCanonical} from '../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../src/domain/source-evidence-staging.js';
import {exportSourceEvidenceSnapshot,restoreSourceEvidenceSnapshot} from './lib/source-evidence-sql-snapshot.js';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',clients=[];
const server=await startDisposableNativePostgres({postgres});
async function connect(database='postgres'){
 const c=new Client({...server.config,database});c.on('error',()=>{});await c.connect();clients.push(c);
 await c.query("set statement_timeout='8s';set lock_timeout='8s'");return c;
}
async function envelope(actor=owner,hash='a'){
 const p={packageId:crypto.randomUUID(),packageVersion:1,cases:[{caseId:'crash-case',caseVersion:1,sourceSha256:hash.repeat(64),sourceEdition:'native-crash',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
 const m=await digestSourceRowPackage(p),b=await prepareSourceEvidenceStagingRequest({...p,requestId:crypto.randomUUID(),expectedPackageDigest:m.packageDigest},actor),{packageDigest,...manifest}=m;
 const payload={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
 return {p,b,args:[actor,canonicalize(p),canonicalize({contractId:'source-row-package-evidence-v1',...manifest}),b,canonicalize(payload),canonicalize({...payload,receiptDigest:(await digestCanonical(payload)).digestHex})]};
}
const stage=(c,e)=>c.query('select evidence_probe.stage($1,$2,$3,$4,$5,$6) r',e.args).then(r=>r.rows[0].r);
const read=(c,e)=>c.query('select evidence_probe.readback($1,$2,$3,$4,$5) r',[e.b.actorId,e.b.packageId,1,e.b.packageDigest,e.b.requestId]).then(r=>r.rows[0].r);
const adapter=c=>({exec:s=>c.query(s),query:(...args)=>c.query(...args)});
try{
 let g=await connect(),a=await connect(),pending=await connect();
 for(const setting of ['fsync','synchronous_commit','full_page_writes'])assert.equal((await g.query('show '+setting)).rows[0][setting],'on');
 await g.query('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const f of ['schema.sql','digests.sql'])await g.query(await readFile(new URL('../ops/prototypes/source-evidence/'+f,import.meta.url),'utf8'));
 for(const actor of [owner,other])await g.query('select evidence_probe.set_authority($1,true)',[actor]);
 for(const hash of ['a','d'])await g.query('select evidence_probe.set_source_policy($1,$2,true)',[hash.repeat(64),'native-crash']);
 await a.query('set role service_role');await pending.query('set role service_role');
 const good=await envelope(),withdrawn=await envelope(),policy=await envelope(owner,'d'),account=await envelope(other),lost=await envelope(),uncommitted=await envelope();
 const receipts=new Map();for(const e of [good,withdrawn,policy,account,lost])receipts.set(e.b.packageId,(await stage(a,e)).receipt);
 await g.query('select evidence_probe.withdraw_metadata($1,$2,$3,$4)',[owner,withdrawn.b.packageId,1,withdrawn.b.packageDigest]);
 await g.query('select evidence_probe.set_source_policy($1,$2,false)',['d'.repeat(64),'native-crash']);
 await g.query('select evidence_probe.set_authority($1,false)',[other]);
 const before=await exportSourceEvidenceSnapshot(adapter(g));
 await pending.query('begin');await stage(pending,uncommitted); // no COMMIT: never an acknowledged durable outcome
 assert.equal(typeof server.crashAndRestart,'function','immediate restart hook required');
 const crash=await server.crashAndRestart();
 assert.equal(crash.mode,'immediate');assert.notEqual(crash.previousPid,crash.newPid);
 assert.match(crash.recoveryLog,/database system was interrupted|not properly shut down/);
 assert.match(crash.recoveryLog,/automatic recovery|redo starts/);
 await Promise.allSettled(clients.map(c=>c.end()));
 g=await connect();a=await connect();await a.query('set role service_role');
 assert.equal((await g.query('select pg_is_in_recovery() r')).rows[0].r,false);
 assert.equal((await exportSourceEvidenceSnapshot(adapter(g))).snapshotDigest,before.snapshotDigest,'all committed state survives; uncommitted records vanish');
 for(const table of ['packages','revisions','cases','requests']){
  assert.equal((await g.query('select count(*)::int n from evidence_probe.'+table+' where package_id=$1',[uncommitted.b.packageId])).rows[0].n,0);
 }
 assert.equal((await g.query('select count(*)::int n from evidence_probe.events where request_id=$1',[uncommitted.b.requestId])).rows[0].n,0);
 for(const e of [good,lost]){
  const saved=JSON.parse((await read(a,e)).receipt);assert.deepEqual(saved,receipts.get(e.b.packageId));
  assert.equal(await matchesSourceEvidenceStagingReceipt(saved,e.b),true);
  assert.deepEqual((await stage(a,e)).receipt,saved,'retry reconciles original committed receipt, including simulated lost delivery');
 }
 for(const e of [withdrawn,policy,account]){await assert.rejects(read(a,e),/evidence_denied/);await assert.rejects(stage(a,e),/evidence_denied/);}
 console.log('Native WAL recovery PASS: durable settings, unclean recovery logs, committed receipts retained and uncommitted writes absent.');
 console.log('Native denial persistence PASS: withdrawal, source policy and account state remain denied; lost delivery retry returns original receipt.');
 const post=await exportSourceEvidenceSnapshot(adapter(g));await g.query('create database evidence_crash_restore');
 const target=await connect('evidence_crash_restore');
 for(const f of ['schema.sql','digests.sql'])await target.query(await readFile(new URL('../ops/prototypes/source-evidence/'+f,import.meta.url),'utf8'));
 await restoreSourceEvidenceSnapshot(adapter(target),post,post.snapshotDigest);
 assert.equal((await exportSourceEvidenceSnapshot(adapter(target))).snapshotDigest,post.snapshotDigest);
 await target.query('set role service_role');assert.deepEqual(JSON.parse((await read(target,good)).receipt),receipts.get(good.b.packageId));
 for(const e of [withdrawn,policy,account])await assert.rejects(read(target,e),/evidence_denied/);
 for(const role of ['anon','authenticated']){await target.query('reset role;set role '+role);await assert.rejects(read(target,good),/permission denied/);}
 console.log('Postcrash restore PASS: exact snapshot, original receipt, all denied states and browser ACL retained.');
}finally{
 await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));
 console.log('Crash fixture cleanup PASS: clients/server/private cluster removed.');
}
