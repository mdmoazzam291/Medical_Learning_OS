// Disposable application-owned authorization acceptance using real local GoTrue
// JWTs and PostgREST. This does NOT prove provider signout atomicity or managed
// Supabase privileges. Absolutely NEVER connect to a hosted database.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const env=process.env,origin='http://127.0.0.1:54321';
if(env.MLOS_LOCAL_ATOMIC_CONFIRM!=='ISOLATED_LOCAL_GOTRUE_TEST_STACK'||
 env.MLOS_LOCAL_ATOMIC_URL!==origin||
 !/^postgres(?:ql)?:\/\/postgres:[^/@\s]+@127\.0\.0\.1:54322\/postgres$/.test(env.MLOS_LOCAL_ATOMIC_DB_URL||'')||
 !env.MLOS_LOCAL_ATOMIC_KEY?.startsWith('sb_publishable_')||
 !env.MLOS_LOCAL_ATOMIC_SDK?.startsWith('file:///')||
 !env.MLOS_LOCAL_ATOMIC_PG?.startsWith('file:///'))
 throw Error('owned_reviewer_test_isolation_denied');
const sdk=await import(env.MLOS_LOCAL_ATOMIC_SDK);
const native=await import(env.MLOS_LOCAL_ATOMIC_PG);
const Client=native.Client??native.default?.Client;
if(typeof sdk.createClient!=='function'||typeof Client!=='function')
 throw Error('owned_reviewer_test_dependencies_denied');
const makeAuth=()=>sdk.createClient(origin,env.MLOS_LOCAL_ATOMIC_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
const authA=makeAuth(),authB=makeAuth();
const admin=new Client({connectionString:env.MLOS_LOCAL_ATOMIC_DB_URL,connectionTimeoutMillis:5000,
 statement_timeout:12000,query_timeout:12000});
const revoker=new Client({connectionString:env.MLOS_LOCAL_ATOMIC_DB_URL,connectionTimeoutMillis:5000,
 statement_timeout:12000,query_timeout:12000});
const nonce=randomBytes(12).toString('hex'),hex=c=>c.repeat(64);
const packageId='11111111-1111-4111-8111-111111111111';
const grants={
 'case-a':'33333333-3333-4333-8333-333333333331',
 'case-b':'33333333-3333-4333-8333-333333333332',
 'case-c':'33333333-3333-4333-8333-333333333333',
 'case-d':'33333333-3333-4333-8333-333333333334'
};
const request=(caseId,requestId)=>({
 requestId,targetType:'source-row-case',packageId,packageVersion:1,
 packageDigest:hex('a'),caseId,caseVersion:1,caseDigest:hex('b'),
 appearanceEvidenceDigest:hex('d'),sourceSha256:hex('c'),
 disposition:'retain-unresolved',
 rationale:'Synthetic unverified source appearance requires an independent original source.',
 attestationVersion:'source-row-review-v1'
});
const q0=request('case-a','44444444-4444-4444-8444-444444444444');
const qDecisionSession=request('case-a','66666666-6666-4666-8666-666666666666');
const qRevokeGrantFirst=request('case-b','55555555-5555-4555-8555-555555555555');
const qDecisionGrant=request('case-c','77777777-7777-4777-8777-777777777777');
const qRevokeSessionFirst=request('case-d','88888888-8888-4888-8888-888888888888');
const rpc=origin+'/rest/v1/rpc/';
async function call(name,token,params){
 const res=await fetch(rpc+name,{method:'POST',redirect:'error',cache:'no-store',
  headers:{'Content-Type':'application/json',Accept:'application/json',
   apikey:env.MLOS_LOCAL_ATOMIC_KEY,
   ...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
 const raw=await res.text();let body;
 try{body=JSON.parse(raw);}catch{body=raw;}
 return {status:res.status,body};
}
const accepted=(r,n)=>assert.ok(r.status>=200&&r.status<300,
 n+': expected 2xx, got '+r.status+' '+JSON.stringify(r.body).slice(0,400));
const denied=(r,n)=>assert.ok(r.status>=400,n+': expected denied, got '+r.status);
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function waitFor(predicate,label){
 for(let i=0;i<80;i++){if(await predicate())return;await delay(40);}
 throw Error('owned_review_race_barrier_not_observed: '+label);
}
const count=async()=>Number((await admin.query('select count(*)::integer as n from evidence_internal.decisions')).rows[0].n);
const pendingLock=async()=>Boolean((await admin.query(
 "select cardinality(pg_catalog.pg_blocking_pids($1))>0 as blocked",[revoker.processID])).rows[0].blocked);
const activeWriter=async()=>Boolean((await admin.query(
 "select exists(select 1 from pg_catalog.pg_stat_activity where wait_event='PgSleep' and query like '%mlos_owned_source_review_local_v1%') as found")).rows[0].found);
async function tokenSession(token,expected){
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 assert.equal(claims.sub,expected);assert.equal(claims.iss,origin+'/auth/v1');
 assert.equal(claims.aud,'authenticated');
 assert.match(claims.session_id,/^[a-f0-9-]{36}$/i);
 return claims.session_id;
}
const account=n=>({email:n+'+owned-'+nonce+'@mlos.local',
 password:randomBytes(32).toString('base64url')});
async function signUp(auth,data){
 const out=await auth.auth.signUp(data);
 if(out.error||!out.data?.user?.id||!out.data?.session?.access_token)
  throw Error('owned_local_signup_failed');
 const token=out.data.session.access_token,user=out.data.user.id;
 const check=await auth.auth.getUser(token);
 assert.equal(check.error,null);assert.equal(check.data.user.id,user);
 return {token,user,sid:await tokenSession(token,user)};
}
let connected=false,revokerConnected=false,signedA=false,signedB=false,held=false;
try{
 const accountA=account('a'),accountB=account('b');
 const a=await signUp(authA,accountA);signedA=true;
 const b=await signUp(authB,accountB);signedB=true;
 assert.notEqual(a.user,b.user);
 await admin.connect();connected=true;
 await revoker.connect();revokerConnected=true;
 await admin.query(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 const ownedSql=await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-owned-revocation.sql',import.meta.url),'utf8');
 assert.doesNotMatch(ownedSql,/\bfrom\s+auth\.sessions|\bjoin\s+auth\.sessions|\bauth\.sessions\s+.*for\s+share/i);
 await admin.query(ownedSql);
 await admin.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',
  [packageId,hex('a'),packageId]);
 for(const [caseId,gid] of Object.entries(grants)){
  await admin.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
   [packageId,hex('a'),caseId,hex('b'),hex('d'),hex('c')]);
  await admin.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
   [gid,a.user,packageId,hex('a'),caseId]);
  await admin.query('insert into evidence_internal.owned_reviewer_grant_history(grant_event_id,transition) values($1,$2)',
   [gid,'granted']);
 }
 await admin.query('insert into evidence_internal.owned_reviewer_sessions values($1,$2,true)',
  [a.user,a.sid]);
 await admin.query("select pg_catalog.pg_notify('pgrst','reload schema')");
 await waitFor(async()=>{
  const r=await call('mlos_owned_source_review_local_v1',a.token,{q:{}});
  return r.status!==404||r.body?.code!=='PGRST202';
 },'postgrest-schema-reload');

 denied(await call('mlos_owned_source_review_local_v1',null,{q:q0}),'anonymous');
 denied(await call('mlos_owned_source_review_local_v1',b.token,{q:q0}),'foreign JWT');
 denied(await call('mlos_owned_source_review_local_v1',a.token,{q:{...q0,actorId:b.user}}),
  'caller actor escalation');
 denied(await call('mlos_owned_source_review_local_v1',a.token,{q:{...q0,grantEventId:grants['case-a']}}),
  'caller grant escalation');
 const malformed=a.token.split('.');
 malformed[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(malformed[1],'base64url').toString('utf8')),
  sub:b.user})).toString('base64url');
 denied(await call('mlos_owned_source_review_local_v1',malformed.join('.'),{q:q0}),
  'tampered signature');
 assert.equal(await count(),0);

 const first=await call('mlos_owned_source_review_local_v1',a.token,{q:q0});
 accepted(first,'first immutable event');
 const same=await call('mlos_owned_source_review_local_v1',a.token,{q:q0});
 accepted(same,'same request idempotency');
 assert.deepEqual(same.body,first.body);
 const read=await call('mlos_owned_source_read_local_v1',a.token,{p_request:q0.requestId});
 accepted(read,'protected app-owned readback');
 assert.deepEqual(read.body,first.body);
 for(const f of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(first.body[f],false);
 assert.equal(await count(),1);
 console.log('Owned source-review gate PASS: genuine signed JWT, scoped grant, denial and immutable idempotency');

 // Decision first: event holds app-owned session row; app-owned revocation waits.
 const writing=call('mlos_owned_source_review_local_v1',a.token,{q:qDecisionSession});
 await waitFor(activeWriter,'session-decision-first writer sleep');
 const revokeSession=revoker.query(
  'select evidence_internal.revoke_owned_reviewer_session($1,$2)',[a.user,a.sid]);
 await waitFor(pendingLock,'session revoke blocked by decision');
 accepted(await writing,'decision wins before app session revocation');
 await revokeSession;
 assert.equal(await count(),2);
 denied(await call('mlos_owned_source_read_local_v1',a.token,{p_request:q0.requestId}),
  'app session revoked read');
 denied(await call('mlos_owned_source_review_local_v1',a.token,{q:qRevokeGrantFirst}),
  'app session revoked write');
 assert.equal(await count(),2);
 console.log('Owned session decision-first race PASS: revoker blocks, later reads/writes denied');

 // New real GoTrue login -> new unique application session; old session stays revoked.
 const login=await authA.auth.signInWithPassword(accountA);
 if(login.error||!login.data?.session?.access_token)throw Error('owned_local_relogin_failed');
 const nextToken=login.data.session.access_token;
 const nextSid=await tokenSession(nextToken,a.user);
 assert.notEqual(nextSid,a.sid);
 await admin.query('insert into evidence_internal.owned_reviewer_sessions values($1,$2,true)',
  [a.user,nextSid]);
 denied(await call('mlos_owned_source_review_local_v1',a.token,{q:qRevokeGrantFirst}),
  'previous session never reactivated');
 const deniedReactivation=await admin.query(
  'select 1 from evidence_internal.owned_reviewer_sessions where reviewer_id=$1 and session_id=$2 and active=false',
  [a.user,a.sid]);
 assert.equal(deniedReactivation.rowCount,1);

 // Grant revocation first: lock package/grant before a signed-JWT review.
 await revoker.query('begin');held=true;
 await revoker.query('select evidence_internal.revoke_owned_reviewer_grant($1,1,$2,$3)',
  [packageId,hex('a'),grants['case-b']]);
 const blockedReview=call('mlos_owned_source_review_local_v1',nextToken,{q:qRevokeGrantFirst});
 await waitFor(async()=>Boolean((await admin.query(
  "select exists(select 1 from pg_catalog.pg_stat_activity where query like '%mlos_owned_source_review_local_v1%' and wait_event_type='Lock') as waiting"
 )).rows[0].waiting),'grant revocation-first writer lock');
 await revoker.query('commit');held=false;
 denied(await blockedReview,'grant revoked before reviewer can write');
 assert.equal(await count(),2);
 console.log('Owned exact-grant revocation-first race PASS: blocked writer denied after commit');

 // Decision first: grant revoker waits on package lock and later read is denied.
 const writingGrant=call('mlos_owned_source_review_local_v1',nextToken,{q:qDecisionGrant});
 await waitFor(activeWriter,'grant-decision-first writer sleep');
 const revokeGrant=revoker.query(
  'select evidence_internal.revoke_owned_reviewer_grant($1,1,$2,$3)',
  [packageId,hex('a'),grants['case-c']]);
 await waitFor(pendingLock,'grant revoker waits for decision');
 accepted(await writingGrant,'grant decision wins before revocation');
 await revokeGrant;
 assert.equal(await count(),3);
 denied(await call('mlos_owned_source_read_local_v1',nextToken,{p_request:qDecisionGrant.requestId}),
  'revoked grant must deny protected readback');
 console.log('Owned grant decision-first race PASS: immutable event retained, revoked read denied');

 // App-owned session revocation first: signed token cannot overtake it.
 await revoker.query('begin');held=true;
 await revoker.query('select evidence_internal.revoke_owned_reviewer_session($1,$2)',
  [a.user,nextSid]);
 const blockedSession=call('mlos_owned_source_review_local_v1',nextToken,{q:qRevokeSessionFirst});
 await waitFor(async()=>Boolean((await admin.query(
  "select exists(select 1 from pg_catalog.pg_stat_activity where query like '%mlos_owned_source_review_local_v1%' and wait_event_type='Lock') as waiting"
 )).rows[0].waiting),'session revocation-first writer lock');
 await revoker.query('commit');held=false;
 denied(await blockedSession,'app session revoked before write');
 assert.equal(await count(),3);
 assert.equal((await admin.query(
  'select count(*)::integer n from evidence_internal.owned_reviewer_session_revocations')).rows[0].n,2);
 assert.equal((await admin.query(
  "select count(*)::integer n from evidence_internal.owned_reviewer_grant_history where transition='revoked'")).rows[0].n,2);
 denied(await call('mlos_owned_source_review_local_v1',nextToken,{q:qRevokeSessionFirst}),
  'post-revocation stale signed JWT blocked by MLOS gate');
 console.log('Owned session revocation-first race PASS: app gate denies previously signed JWT');
 console.log('IMPORTANT NON-CLAIM: provider-only signout is NOT synchronized with app-owned session rows');
} finally {
 if(held)try{await revoker.query('rollback');}catch{}
 if(revokerConnected)await revoker.end().catch(()=>{});
 if(connected)await admin.end().catch(()=>{});
 if(signedA)await authA.auth.signOut({scope:'local'}).catch(()=>{});
 if(signedB)await authB.auth.signOut({scope:'local'}).catch(()=>{});
}
