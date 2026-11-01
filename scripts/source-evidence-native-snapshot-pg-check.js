// Native PostgreSQL 17/18 concurrency proof for the FOUNDATION snapshot fix.
// A disposable, schema-minimal local database; no hosted endpoints or payloads.
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {exportSourceEvidenceSnapshot} from './lib/source-evidence-sql-snapshot.js';
import {digestCanonical} from '../src/domain/canonical-integrity.js';

const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const server=await startDisposableNativePostgres({postgres}),clients=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(){
 const c=new Client({...server.config,user:'postgres',
  connectionTimeoutMillis:5000,statement_timeout:12000});
 c.on('error',()=>{});await c.connect();clients.push(c);return c;
}
function adapter(c){return {
 exec:sql=>c.query(sql),query:sql=>c.query(sql)
};}
async function assertBlocked(observer,blockedPid,byPid){
 for(let i=0;i<100;i++){
  const b=(await observer.query('select pg_catalog.pg_blocking_pids($1) p',
   [blockedPid])).rows[0].p;
  if(b.includes(byPid))return;
  await pause(20);
 }
 throw new Error('snapshot_writer_lock_barrier_not_observed');
}
try{
 const admin=await connect(),writer=await connect(),legacy=await connect(),
  current=await connect(),observer=await connect();
 const ver=(await admin.query("select current_setting('server_version_num')::int n")).rows[0].n;
 if(process.env.EXPECTED_NATIVE_PG_VERSION)
  assert.equal(Math.floor(ver/10000)+'.'+ver%10000,
   process.env.EXPECTED_NATIVE_PG_VERSION);
 await admin.query(`create schema evidence_probe;
 create table evidence_probe.authority(actor int,version int);
 create table evidence_probe.source_policy(hash text,edition text,version int);
 create table evidence_probe.packages(package_id int);
 create table evidence_probe.revisions(package_id int,version int);
 create table evidence_probe.cases(package_id int,version int,case_id text);
 create table evidence_probe.requests(actor int,request_id int);
 create table evidence_probe.events(id int);
 create table evidence_probe.withdrawals(package_id int,version int,digest text);`);
 const writerPid=(await writer.query('select pg_backend_pid() p')).rows[0].p;
 const legacyPid=(await legacy.query('select pg_backend_pid() p')).rows[0].p;
 const currentPid=(await current.query('select pg_backend_pid() p')).rows[0].p;

 // Counterexample: repeatable-read freezes the MVCC view at the first
 // advisory-lock SELECT, BEFORE the preceding writer can commit.
 await writer.query('begin');
 await writer.query('select pg_advisory_xact_lock(730031)');
 await writer.query('insert into evidence_probe.authority values(1,1)');
 await legacy.query('begin isolation level repeatable read');
 const oldWait=legacy.query('select pg_advisory_xact_lock(730031)');
 await assertBlocked(observer,legacyPid,writerPid);
 await writer.query('commit');
 await oldWait;
 const stale=(await legacy.query(
  "select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb)::text data from evidence_probe.authority t"
 )).rows[0].data;
 assert.equal(stale,'[]','legacy repeatable-read must expose the stale snapshot');
 await legacy.query('commit');

 // Corrected implementation: a READ COMMITTED lock wait, then ONE statement
 // containing all eight table projections, must see the freshly committed
 // writer and bind them to one consistent MVCC statement snapshot.
 await writer.query('begin');
 await writer.query('select pg_advisory_xact_lock(730031)');
 await writer.query('insert into evidence_probe.authority values(2,2)');
 const pending=exportSourceEvidenceSnapshot(adapter(current));
 await assertBlocked(observer,currentPid,writerPid);
 await writer.query('commit');
 const exported=await pending;
 const rows=JSON.parse(exported.tables.authority);
 assert.deepEqual(rows,[{actor:1,version:1},{actor:2,version:2}]);
 for(const [name,payload] of Object.entries(exported.tables)){
  assert.ok(Array.isArray(JSON.parse(payload)),name);
  if(name!=='authority')assert.equal(payload,'[]',name);
 }
 const {snapshotDigest,...body}=exported;
 assert.equal(snapshotDigest,(await digestCanonical(body)).digestHex);
 assert.ok(Object.isFrozen(exported));
 console.log('Native source snapshot lock PASS: legacy stale repeatable-read counterexample; post-lock single-statement export sees both commits with eight-table canonical digest.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Native source snapshot fixture cleanup PASS');
}
