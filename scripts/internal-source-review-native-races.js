// Native PostgreSQL 17/18 concurrency acceptance — disposable GitHub CI
// service ONLY. Does not establish authenticated caller identity, hosted
// authorization, grant provenance, durable backup or clinical approval.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const creds={
 host:process.env.PGHOST||'127.0.0.1',port:Number(process.env.PGPORT||5432),
 user:process.env.PGUSER||'postgres',password:process.env.PGPASSWORD,
 database:process.env.PGDATABASE||'postgres',
 connectionTimeoutMillis:5000,statement_timeout:12000
};
if(!process.env.PGPASSWORD)throw Error('isolated_native_db_password_required');
const clients=[];
async function connect(){
 const client=new Client(creds);client.on('error',()=>{});
 await client.connect();clients.push(client);return client;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function assertBlocked(observer,waitingPid,ownerPid){
 for(let i=0;i<100;i++){
  const result=(await observer.query(
   'select pg_catalog.pg_blocking_pids($1) p',[waitingPid])).rows[0].p;
  if(result.includes(ownerPid))return;
  await sleep(25);
 }
 throw Error('internal_review_lock_barrier_not_observed');
}
const owner='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const grant='33333333-3333-4333-8333-333333333333';
const hex=c=>c.repeat(64);
const digest=hex('a'),caseDigest=hex('b'),appearance=hex('c'),source=hex('d');
const requestId='44444444-4444-4444-8444-444444444444';
const request={requestId,targetType:'source-row-case',packageId:owner,
 packageVersion:1,packageDigest:digest,caseId:'case-a',caseVersion:1,
 caseDigest,sourceSha256:source,appearanceEvidenceDigest:appearance,
 disposition:'retain-unresolved',rationale:'Original extracted source identity requires independent review.',
 attestationVersion:'source-row-review-v1'};
const secondId='55555555-5555-4555-8555-555555555555';
const sql='select evidence_internal.record_review($1,$2::jsonb,$3) r';
const read='select evidence_internal.read_review($1,$2) r';
const reqBody=q=>[reviewer,JSON.stringify(q),grant];
try{
 const admin=await connect(),writer=await connect(),
  gateway=await connect(),gateway2=await connect(),observer=await connect();
 const pg=(await admin.query('show server_version_num')).rows[0].server_version_num;
 if(process.env.EXPECTED_NATIVE_PG_MAJOR)
  assert.equal(String(Math.floor(Number(pg)/10000)),process.env.EXPECTED_NATIVE_PG_MAJOR);
 await admin.query('create role anon;create role authenticated;create role service_role;');
 await admin.query(await readFile(new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 await admin.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',
  [owner,digest,owner]);
 await admin.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
  [owner,digest,'case-a',caseDigest,appearance,source]);
 await admin.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grant,reviewer,owner,digest,'case-a']);
 for(const client of [gateway,gateway2])await client.query('set role evidence_internal_gateway');
 const gatewayPid=(await gateway.query('select pg_backend_pid() p')).rows[0].p;
 const writerPid=(await writer.query('select pg_backend_pid() p')).rows[0].p;

 // Revocation obtains a row lock BEFORE the review transaction:
 // the write must wait, observe the fresh disabled grant, and fail closed.
 await writer.query('begin');
 await writer.query('update evidence_internal.grants set active=false where grant_event_id=$1',[grant]);
 const rejected=assert.rejects(gateway.query(sql,reqBody(request)),/internal_review_denied/);
 await assertBlocked(observer,gatewayPid,writerPid);
 await writer.query('commit');
 await rejected;
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,0);
 console.log('Native internal review revoke-first PASS: denied without event');

 // Re-enable only inside the synthetic fixture, then a review transaction
 // obtains the grant lock BEFORE revocation. Commit order is explicit:
 // review event is durable, then revocation blocks future readback.
 await admin.query('update evidence_internal.grants set active=true where grant_event_id=$1',[grant]);
 await gateway.query('begin');
 const recorded=(await gateway.query(sql,reqBody(request))).rows[0].r;
 assert.equal(recorded.sourceReviewOnly,true);
 assert.equal(recorded.learnerRelease,false);
 await writer.query('begin');
 const waitingUpdate=writer.query(
  'update evidence_internal.grants set active=false where grant_event_id=$1',[grant]);
 await assertBlocked(observer,writerPid,gatewayPid);
 await gateway.query('commit');
 await waitingUpdate;
 await writer.query('commit');
 await assert.rejects(gateway.query(read,[reviewer,requestId]),/internal_review_denied/);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,1);
 assert.equal((await admin.query('select event_payload->>\'decisionId\' id from evidence_internal.decisions')).rows[0].id,recorded.decisionId);
 console.log('Native internal review decision-first PASS: one committed event, subsequent read denied');

 // Multiple genuine concurrent database calls must resolve to one immutable
 // event per actor/request, with no second receipt or side effects.
 await admin.query('update evidence_internal.grants set active=true where grant_event_id=$1',[grant]);
 const second={...request,requestId:secondId};
 const [one,two]=await Promise.all([
  gateway.query(sql,reqBody(second)),gateway2.query(sql,reqBody(second))
 ]);
 const a=one.rows[0].r,b=two.rows[0].r;
 assert.equal(a.decisionId,b.decisionId);
 assert.deepEqual(a,b);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,2);
 await assert.rejects(gateway2.query(sql,reqBody({...second,rationale:second.rationale+' altered'})),
  /internal_review_conflict/);
 // The server-generated timestamp and event payload remain immutable even
 // to a privileged fixture writer (no successful UPDATE or DELETE).
 await assert.rejects(admin.query('update evidence_internal.decisions set recorded_at=now()'),
  /internal_review_immutable/);
 await assert.rejects(admin.query('delete from evidence_internal.decisions'),
  /internal_review_immutable/);
 console.log('Native internal review idempotency PASS: concurrent exact retries, immutable history');
 // No gateway may directly read the ledger, despite being able to invoke
 // guarded functions. This does NOT prove actor ID possession/verification.
 await assert.rejects(gateway.query('select * from evidence_internal.decisions'),/permission denied/);
 await admin.query('update evidence_internal.packages set active=false where package_id=$1',[owner]);
 await assert.rejects(gateway.query(read,[reviewer,secondId]),/internal_review_denied/);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,2);
 console.log('Native internal review withdrawal isolation PASS; original ledger retained');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
}
