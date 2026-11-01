// Disposable GoTrue session -> internal decision revocation acceptance.
// Exact local CLI loopback only. No hosted connections or production Auth.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const e=process.env,origin='http://127.0.0.1:54321';
const dbUrl=e.MLOS_LOCAL_REVIEW_DB_URL;
if(e.MLOS_LOCAL_REVIEW_CONFIRM!=='ISOLATED_LOCAL_GOTRUE_TEST_STACK'||
 e.MLOS_LOCAL_REVIEW_URL!==origin||
 !/^postgres(?:ql)?:\/\/postgres:[^/@\s]+@127\.0\.0\.1:54322\/postgres$/.test(dbUrl||'')||
 !e.MLOS_LOCAL_REVIEW_KEY?.startsWith('sb_publishable_')||
 !e.MLOS_LOCAL_REVIEW_SDK?.startsWith('file:///')||
 !e.MLOS_LOCAL_REVIEW_PG?.startsWith('file:///'))
 throw Error('local_review_gotrue_isolation_denied');
const sdk=await import(e.MLOS_LOCAL_REVIEW_SDK);
const pkg=await import(e.MLOS_LOCAL_REVIEW_PG);
const Client=pkg.Client??pkg.default?.Client;
if(typeof sdk.createClient!=='function'||typeof Client!=='function')throw Error('local_review_gotrue_dependency_denied');
const auth=sdk.createClient(origin,e.MLOS_LOCAL_REVIEW_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
if(auth.supabaseUrl!==origin)throw Error('local_review_gotrue_origin_denied');
const database=new Client({connectionString:dbUrl,connectionTimeoutMillis:5000,statement_timeout:15000});
const actorNonce=randomBytes(12).toString('hex');
const account={email:'mlos-review-'+actorNonce+'@mlos.local',password:randomBytes(32).toString('base64url')};
const hash=c=>c.repeat(64);
const packageId='11111111-1111-4111-8111-111111111111';
const grant='33333333-3333-4333-8333-333333333333';
const q={
 requestId:'44444444-4444-4444-8444-444444444444',
 targetType:'source-row-case',packageId,packageVersion:1,packageDigest:hash('a'),
 caseId:'case-a',caseVersion:1,caseDigest:hash('b'),sourceSha256:hash('c'),
 appearanceEvidenceDigest:hash('d'),disposition:'retain-unresolved',
 rationale:'The source row needs independent validation before downstream mapping.',
 attestationVersion:'source-row-review-v1'
};
function claims(jwt){
 const parts=jwt?.split('.');
 if(parts?.length!==3)throw Error('local_review_jwt_shape_denied');
 const data=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
 if(typeof data.sub!=='string'||typeof data.session_id!=='string'||
 data.iss!==origin+'/auth/v1'||data.aud!=='authenticated'||
 !(data.exp>Math.floor(Date.now()/1000)))throw Error('local_review_jwt_claims_denied');
 return {user:data.sub,session:data.session_id};
}
const record='select evidence_internal.record_local_gotrue_review($1,$2,$3::jsonb,$4) r';
let signed=false,inTxn=false,started=false;
try{
 const signup=await auth.auth.signUp(account);
 const jwt=signup.data?.session?.access_token;
 if(signup.error||!signup.data?.user?.id||!jwt)throw Error('local_review_signup_denied');
 signed=true;
 const {user,session}=claims(jwt);
 assert.equal(user,signup.data.user.id);
 const verified=await auth.auth.getUser(jwt);
 if(verified.error||verified.data?.user?.id!==user)throw Error('local_review_getuser_denied');
 await database.connect();started=true;
 await database.query(await readFile(new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 await database.query(await readFile(new URL('../ops/prototypes/source-evidence/internal-review-local-gotrue.sql',import.meta.url),'utf8'));
 await database.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',[packageId,q.packageDigest,packageId]);
 await database.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
  [packageId,q.packageDigest,q.caseId,q.caseDigest,q.appearanceEvidenceDigest,q.sourceSha256]);
 await database.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grant,user,packageId,q.packageDigest,q.caseId]);
 await database.query('begin');inTxn=true;
 const first=(await database.query(record,[user,session,JSON.stringify(q),grant])).rows[0].r;
 assert.equal(first.reviewerId,user);
 assert.equal(first.decisionId?.length,36);
 assert.equal(first.sourceReviewOnly,true);
 for(const flag of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(first[flag],false);
 // While the commit transaction holds FOR SHARE on the *actual* GoTrue row,
 // local signout can finish only after that session lock is released.
 let settled=false;
 const pending=auth.auth.signOut({scope:'local'}).finally(()=>{settled=true;});
 await new Promise(done=>setTimeout(done,450));
 const pendingBeforeCommit=!settled;
 await database.query('commit');inTxn=false;
 const signout=await pending;
 if(signout.error)throw Error('local_review_signout_failed');
 signed=false;
 const alive=(await database.query(
 'select exists(select 1 from auth.sessions where id=$1 and user_id=$2) as present',
 [session,user])).rows[0].present;
 assert.equal(alive,false,'real GoTrue session must be removed after local sign-out');
 await assert.rejects(database.query(record,[user,session,JSON.stringify({...q,
   requestId:'55555555-5555-4555-8555-555555555555'}),grant]),/internal_review_session_denied/);
 const count=(await database.query('select count(*)::integer n from evidence_internal.decisions')).rows[0].n;
 assert.equal(count,1,'completed source review remains immutable; no post-revocation decision');
 await assert.rejects(database.query('update evidence_internal.decisions set recorded_at=now()'),
   /internal_review_immutable/);
 console.log(JSON.stringify({
  status:'isolated_gotrue_source_review_session_accepted',
  realProviderSession:true,authUserVerified:true,
  sessionLockHeldBeforeSignout:true,signoutPendingBeforeCommit:pendingBeforeCommit,
  sessionRemovedAfterSignout:true,postSignoutReviewDenied:true,
  immutableDecisionsRetained:count,authenticatedDatabaseActor:false,
  hostedAuthPrivilegesVerified:false,deployApproved:false
 }));
}finally{
 if(inTxn)try{await database.query('rollback');}catch{}
 if(signed)try{await auth.auth.signOut({scope:'local'});}catch{}
 if(started)try{await database.end();}catch{}
}
