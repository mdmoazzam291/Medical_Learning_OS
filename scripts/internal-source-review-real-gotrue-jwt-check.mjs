// Disposable real-GoTrue-JWT -> PostgREST -> original auth.sessions ->
// immutable internal review transaction acceptance. NEVER hosted.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const env=process.env,origin='http://127.0.0.1:54321';
const dbUrl=env.MLOS_LOCAL_ATOMIC_DB_URL;
if(env.MLOS_LOCAL_ATOMIC_CONFIRM!=='ISOLATED_LOCAL_GOTRUE_TEST_STACK'||
 env.MLOS_LOCAL_ATOMIC_URL!==origin||
 !/^postgres(?:ql)?:\/\/postgres:[^/@\s]+@127\.0\.0\.1:54322\/postgres$/.test(dbUrl||'')||
 !env.MLOS_LOCAL_ATOMIC_KEY?.startsWith('sb_publishable_')||
 !env.MLOS_LOCAL_ATOMIC_SDK?.startsWith('file:///')||
 !env.MLOS_LOCAL_ATOMIC_PG?.startsWith('file:///'))
 throw Error('real_gotrue_jwt_atomic_isolation_denied');

const sdk=await import(env.MLOS_LOCAL_ATOMIC_SDK);
const native=await import(env.MLOS_LOCAL_ATOMIC_PG);
const Client=native.Client??native.default?.Client;
if(typeof sdk.createClient!=='function'||typeof Client!=='function')throw Error('real_gotrue_jwt_dependencies_denied');
const makeAuth=()=>sdk.createClient(origin,env.MLOS_LOCAL_ATOMIC_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
const authA=makeAuth(),authB=makeAuth();
if(authA.supabaseUrl!==origin||authB.supabaseUrl!==origin)throw Error('real_gotrue_jwt_origin_denied');
const db=new Client({connectionString:dbUrl,connectionTimeoutMillis:5000,
 statement_timeout:12000,query_timeout:12000});
const nonce=randomBytes(12).toString('hex');
const account=n=>({email:n+'+mlos-atomic-'+nonce+'@mlos.local',
 password:randomBytes(32).toString('base64url')});
const id='11111111-1111-4111-8111-111111111111';
const grantId='33333333-3333-4333-8333-333333333333';
const hex=c=>c.repeat(64);
const q={
 requestId:'44444444-4444-4444-8444-444444444444',
 targetType:'source-row-case',packageId:id,packageVersion:1,
 packageDigest:hex('a'),caseId:'case-a',caseVersion:1,
 caseDigest:hex('b'),sourceSha256:hex('c'),
 appearanceEvidenceDigest:hex('d'),disposition:'retain-unresolved',
 rationale:'The original source row needs independently qualified source adjudication.',
 attestationVersion:'source-row-review-v1'
};
const rpcBase=origin+'/rest/v1/rpc/';
const now=()=>new Promise(resolve=>setTimeout(resolve,40));
async function call(method,token,payload){
 const response=await fetch(rpcBase+method,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{'Content-Type':'application/json',Accept:'application/json',
   apikey:env.MLOS_LOCAL_ATOMIC_KEY,
   ...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify(payload),
  signal:AbortSignal.timeout(10000)
 });
 const raw=await response.text();
 let body;try{body=JSON.parse(raw);}catch{body=raw;}
 return {status:response.status,body};
}
function requireDenied(r,label){
 assert.ok(r.status>=400,label+': unexpected success ('+r.status+')');
}
function requireAccepted(r,label){
 assert.ok(r.status>=200&&r.status<300,label+': not accepted ('+r.status+')');
}
async function ready(token){
 // PostgREST must reload the newly added test-only RPC schema.
 for(let i=0;i<60;i++){
  const res=await call('mlos_internal_source_review_local_v1',token,{q:{}});
  if(res.status!==404||res.body?.code!=='PGRST202')return;
  await now();
 }
 throw Error('local_postgrest_test_function_not_visible');
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function jwtSession(token,expectedUser){
 const parts=token?.split('.');
 if(parts?.length!==3)throw Error('real_gotrue_jwt_shape_invalid');
 const c=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
 if(!uuid.test(c.sub)||!uuid.test(c.session_id)||
 c.sub!==expectedUser||c.iss!==origin+'/auth/v1'||c.aud!=='authenticated'||
 !Number.isSafeInteger(c.exp)||c.exp<=Math.floor(Date.now()/1000))
 throw Error('real_gotrue_jwt_claims_invalid');
 return c.session_id;
}
async function getTestUser(client,account){
 const {data,error}=await client.auth.signUp(account);
 if(error||!data?.user?.id||!data?.session?.access_token)
  throw Error('real_gotrue_local_signup_unavailable');
 const token=data.session.access_token,user=data.user.id;
 jwtSession(token,user);
 const checked=await client.auth.getUser(token);
 if(checked.error||checked.data?.user?.id!==user)
  throw Error('real_gotrue_local_user_unverified');
 return {token,user,session:jwtSession(token,user)};
}
let signedA=false,signedB=false,connected=false;
try{
 const accountA=account('a'),accountB=account('b');
 const a=await getTestUser(authA,accountA);signedA=true;
 const b=await getTestUser(authB,accountB);signedB=true;
 assert.notEqual(a.user,b.user);assert.notEqual(a.session,b.session);
 await db.connect();connected=true;
 await db.query(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 await db.query(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-real-gotrue-jwt.sql',import.meta.url),'utf8'));
 await db.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',
  [id,q.packageDigest,id]);
 await db.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
  [id,q.packageDigest,q.caseId,q.caseDigest,q.appearanceEvidenceDigest,q.sourceSha256]);
 await db.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grantId,a.user,id,q.packageDigest,q.caseId]);
 await db.query('insert into evidence_internal.local_grant_history(grant_event_id,transition) values($1,$2)',
  [grantId,'granted']);
 await db.query("select pg_catalog.pg_notify('pgrst','reload schema')");
 await ready(a.token);

 requireDenied(await call('mlos_internal_source_review_local_v1',null,{q}),'anonymous');
 const pieces=a.token.split('.');
 pieces[1]=Buffer.from(JSON.stringify({
  ...JSON.parse(Buffer.from(pieces[1],'base64url').toString('utf8')),
  sub:b.user
 })).toString('base64url');
 requireDenied(await call('mlos_internal_source_review_local_v1',pieces.join('.'),{q}),'tampered signature');
 requireDenied(await call('mlos_internal_source_review_local_v1',b.token,{q}),'foreign signed user');
 requireDenied(await call('mlos_internal_source_review_local_v1',a.token,
  {q:{...q,actorId:b.user}}),'forged actor field');
 requireDenied(await call('mlos_internal_source_review_local_v1',a.token,
  {q:{...q,grantEventId:grantId}}),'forged grant field');
 assert.equal((await db.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,0);
 console.log('Local GoTrue signed-JWT denial PASS: anonymous, tampered, foreign actor, forged request');

 const [first,repeat]=await Promise.all([
  call('mlos_internal_source_review_local_v1',a.token,{q}),
  call('mlos_internal_source_review_local_v1',a.token,{q})
 ]);
 requireAccepted(first,'verified GoTrue JWT first decision');
 requireAccepted(repeat,'verified GoTrue JWT exact retry');
 assert.equal(first.body.decisionId,repeat.body.decisionId);
 assert.equal(first.body.reviewerId,a.user);
 assert.equal(first.body.grantEventId,grantId);
 for(const flag of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(first.body[flag],false);
 const history=await call('mlos_internal_source_read_local_v1',a.token,{p_request:q.requestId});
 requireAccepted(history,'current-session protected readback');
 assert.deepEqual(history.body,first.body);
 requireDenied(await call('mlos_internal_source_review_local_v1',a.token,
  {q:{...q,rationale:q.rationale+' changed'}}),'changed retry conflicts');
 console.log('Local GoTrue signed-JWT transaction PASS: current true session, scoped grant, idempotent event and protected readback');

 // This race-only request sleeps after the function has FOR SHARE locked
 // auth.sessions. A genuine local GoTrue signout must wait to delete row.
 const raceQ={...q,requestId:'88888888-8888-4888-8888-888888888888'};
 const pendingReview=call('mlos_internal_source_review_local_v1',a.token,{q:raceQ});
 let observed=false;
 for(let i=0;i<65;i++){
  const active=await db.query(
   "select exists(select 1 from pg_catalog.pg_stat_activity where wait_event='PgSleep' and query like '%mlos_internal_source_review_local_v1%') as sleeping"
  );
  if(active.rows[0].sleeping){observed=true;break;}
  await new Promise(resolve=>setTimeout(resolve,30));
 }
 assert.equal(observed,true,'review must hold session row while in race barrier');
 let signoutSettled=false;
 const pendingSignout=authA.auth.signOut({scope:'local'}).finally(()=>{signoutSettled=true;});
 await new Promise(resolve=>setTimeout(resolve,180));
 assert.equal(signoutSettled,false,'actual provider signout cannot complete before locked decision');
 const raced=await pendingReview;
 requireAccepted(raced,'review transaction locked before signout');
 const out=await pendingSignout;
 if(out.error)throw Error('real_gotrue_local_signout_error');
 signedA=false;
 const row=(await db.query('select exists(select 1 from auth.sessions where id=$1 and user_id=$2) present',[a.session,a.user])).rows[0].present;
 assert.equal(row,false);
 requireDenied(await call('mlos_internal_source_review_local_v1',a.token,
  {q:{...q,requestId:'55555555-5555-4555-8555-555555555555'}}),'post-signout decision');
 requireDenied(await call('mlos_internal_source_read_local_v1',a.token,
  {p_request:q.requestId}),'post-signout readback');
 const count=(await db.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n;
 assert.equal(count,2);
 console.log('Local GoTrue signed-JWT signout race PASS: actual session lock serialized, review committed before logout, later reads/writes denied');

 // A separate newly authenticated session is legitimate, but an exact
 // source-review grant revocation must deny it (independent of signout).
 const renewed=await authA.auth.signInWithPassword(accountA);
 if(renewed.error||!renewed.data?.session?.access_token)
  throw Error('real_gotrue_local_relogin_denied');
 signedA=true;
 const newToken=renewed.data.session.access_token;
 assert.notEqual(jwtSession(newToken,a.user),a.session);
 await db.query(
  'insert into evidence_internal.local_grant_history(grant_event_id,transition) values($1,$2)',
  [grantId,'revoked']);
 requireDenied(await call('mlos_internal_source_read_local_v1',newToken,
  {p_request:q.requestId}),'revoked exact reviewer grant read');
 requireDenied(await call('mlos_internal_source_review_local_v1',newToken,
  {q:{...q,requestId:'99999999-9999-4999-8999-999999999999'}}),'revoked exact reviewer grant write');
 assert.equal((await db.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,2);
 console.log('Local GoTrue current-grant denial PASS: new valid session cannot reuse revoked source-review grant');

}finally{
 if(signedA)try{await authA.auth.signOut({scope:'local'});}catch{}
 if(signedB)try{await authB.auth.signOut({scope:'local'});}catch{}
 if(connected)try{await db.end();}catch{}
}
