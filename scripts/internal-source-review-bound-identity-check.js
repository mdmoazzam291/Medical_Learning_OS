// Disposable native PostgreSQL 17/18 session identity + append-only grant log.
// No hosted URLs, user tokens, source bytes or production credentials.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const pg=await import(process.env.PG_MODULE_URL||'pg');
const Client=pg.Client??pg.default?.Client;
if(typeof Client!=='function')throw Error('native_pg_client_unavailable');
const conf={host:process.env.PGHOST||'127.0.0.1',
 port:Number(process.env.PGPORT||5432),database:process.env.PGDATABASE||'postgres',
 connectionTimeoutMillis:5000,statement_timeout:12000};
if(!process.env.PGPASSWORD)throw Error('native_test_password_missing');
const clients=[];
async function connect(user,password){
 const c=new Client({...conf,user,password});c.on('error',()=>{});
 await c.connect();clients.push(c);return c;
}
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function waitForBlock(observer,waiting,holder){
 for(let i=0;i<120;i++){
  const row=(await observer.query('select pg_blocking_pids($1) p',[waiting])).rows[0];
  if(row.p.includes(holder))return;
  await sleep(20);
 }
 throw Error('bound_review_transaction_lock_not_observed');
}
const owner='11111111-1111-4111-8111-111111111111',
 reviewerA='22222222-2222-4222-8222-222222222222',
 reviewerB='66666666-6666-4666-8666-666666666666',
 grant='33333333-3333-4333-8333-333333333333',
 hx=c=>c.repeat(64),
 digest=hx('a'),caseDigest=hx('b'),appearance=hx('c'),source=hx('d');
const reqId='44444444-4444-4444-8444-444444444444';
const request={requestId:reqId,targetType:'source-row-case',packageId:owner,
 packageVersion:1,packageDigest:digest,caseId:'case-a',caseVersion:1,
 caseDigest,sourceSha256:source,appearanceEvidenceDigest:appearance,
 disposition:'retain-unresolved',
 rationale:'Independent reviewer could not confirm this source row identity.',
 attestationVersion:'source-row-review-v1'};
const rolePassA='offline-review-a-only',rolePassB='offline-review-b-only';
const write='select evidence_internal.record_review_bound($1::jsonb,$2::uuid) r',
 read='select evidence_internal.read_review_bound($1::uuid,$2::uuid) r';
const send=(c,q=request)=>c.query(write,[JSON.stringify(q),grant]);
try{
 const admin=await connect('postgres',process.env.PGPASSWORD);
 await admin.query("create role anon;create role authenticated;create role service_role;");
 await admin.query("create role review_test_a login password '"+rolePassA+"'");
 await admin.query("create role review_test_b login password '"+rolePassB+"'");
 await admin.query(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 await admin.query(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-bound-identity.sql',import.meta.url),'utf8'));
 await admin.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',[owner,digest,owner]);
 await admin.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
  [owner,digest,'case-a',caseDigest,appearance,source]);
 await admin.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grant,reviewerA,owner,digest,'case-a']);
 await admin.query('insert into evidence_internal.reviewer_principals values($1,$2),($3,$4)',
  ['review_test_a',reviewerA,'review_test_b',reviewerB]);
 await admin.query('insert into evidence_internal.grant_events(grant_event_id,transition) values($1,$2)',
  [grant,'granted']);

 await assert.rejects(connect('review_test_a','incorrect-password'),/password authentication failed/);
 const a=await connect('review_test_a',rolePassA),
  a2=await connect('review_test_a',rolePassA),
  b=await connect('review_test_b',rolePassB),
  observer=await connect('postgres',process.env.PGPASSWORD),
  governor=await connect('postgres',process.env.PGPASSWORD);
 assert.equal((await a.query('select session_user u')).rows[0].u,'review_test_a');
 assert.equal((await b.query('select session_user u')).rows[0].u,'review_test_b');
 for(const [label,call] of [
  ['wrong reviewer',()=>send(b)],
  ['fake actor',()=>send(a,{...request,actorId:reviewerB})],
  ['old caller-supplied actor API',()=>a.query(
   'select evidence_internal.record_review($1,$2::jsonb,$3)',[reviewerB,JSON.stringify(request),grant])],
  ['raw decision table',()=>a.query('select * from evidence_internal.decisions')],
  ['raw principal lookup',()=>a.query('select * from evidence_internal.reviewer_principals')],
  ['forge revocation',()=>a.query("insert into evidence_internal.grant_events(grant_event_id,transition) values($1,'revoked')",[grant])],
  ['call trusted revocation',()=>a.query('select evidence_internal.revoke_bound_grant($1)',[grant])],
  ['assume superuser session',()=>a.query("set session authorization postgres")],
  ['assume gateway role',()=>a.query('set role evidence_internal_gateway')]
 ]){
  await assert.rejects(call(),undefined,label);
 }
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,0);
 console.log('Bound reviewer identity PASS: native SCRAM login and actor spoofing denied');

 // Real concurrent identical reviewer calls return one decision/ID.
 const [r1,r2]=await Promise.all([send(a),send(a2)]);
 const first=r1.rows[0].r;
 assert.deepEqual(r2.rows[0].r,first);
 assert.equal(first.reviewerId,reviewerA);
 assert.equal(first.sourceReviewOnly,true);
 for(const k of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(first[k],false);
 assert.deepEqual((await a.query(read,[reqId,grant])).rows[0].r,first);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,1);
 await assert.rejects(send(a,{...request,rationale:request.rationale+' changed'}),/internal_review_conflict/);
 console.log('Bound reviewer idempotency PASS: concurrent exact retry, no duplicate');

 const aPid=(await a.query('select pg_backend_pid() p')).rows[0].p;
 const governorPid=(await governor.query('select pg_backend_pid() p')).rows[0].p;

 // Decision first: reviewer locks package, revocation must wait; immutable
 // event survives, but subsequent read is forbidden.
 const next={...request,requestId:'55555555-5555-4555-8555-555555555555'};
 await a.query('begin');
 const decision=(await send(a,next)).rows[0].r;
 await governor.query('begin');
 const pendingRevoke=governor.query('select evidence_internal.revoke_bound_grant($1)',[grant]);
 await waitForBlock(observer,governorPid,aPid);
 await a.query('commit');
 await pendingRevoke;await governor.query('commit');
 await assert.rejects(a.query(read,[reqId,grant]),/internal_review_denied/);
 await assert.rejects(send(a,{...request,requestId:'77777777-7777-4777-8777-777777777777'}),/internal_review_denied/);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,2);
 assert.equal(decision.reviewerId,reviewerA);
 await assert.rejects(admin.query("update evidence_internal.grant_events set transition='granted'"),
  /internal_review_immutable/);
 await assert.rejects(admin.query('delete from evidence_internal.grant_events'),
  /internal_review_immutable/);
 assert.deepEqual((await admin.query('select transition from evidence_internal.grant_events order by event_id')).rows.map(r=>r.transition),
  ['granted','revoked']);
 console.log('Bound reviewer decision-first revocation PASS: lock order and append-only journal');

 // Revocation first: a new grant is revoked while the governor holds the
 // package lock; a competing bound reviewer must wait then reject. A revoked
 // grant ID cannot be resurrected by adding a second 'granted' journal row.
 const grant2='88888888-8888-4888-8888-888888888888';
 await admin.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grant2,reviewerA,owner,digest,'case-a']);
 await admin.query('insert into evidence_internal.grant_events(grant_event_id,transition) values($1,$2)',
  [grant2,'granted']);
 await governor.query('begin');
 await governor.query('select evidence_internal.revoke_bound_grant($1)',[grant2]);
 const blockedRequest={...request,requestId:'99999999-9999-4999-8999-999999999999'};
 const deniedPending=assert.rejects(a.query(write,[JSON.stringify(blockedRequest),grant2]),/internal_review_denied/);
 await waitForBlock(observer,aPid,governorPid);
 await governor.query('commit');
 await deniedPending;
 await assert.rejects(admin.query('insert into evidence_internal.grant_events(grant_event_id,transition) values($1,$2)',
  [grant2,'granted']),/duplicate key value violates unique constraint/);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,2);
 console.log('Bound reviewer revoke-first PASS: blocked transaction denied without decision');

}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
}
