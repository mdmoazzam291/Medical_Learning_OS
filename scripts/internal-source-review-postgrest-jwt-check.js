// Official PostgREST v14 + PG17/18 JWT-to-transaction boundary experiment.
// All users, keys, records and credentials are synthetic. No hosted API.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
const lib=await import(process.env.PG_MODULE_URL||'pg');
const Client=lib.Client??lib.default?.Client;
if(typeof Client!=='function')throw Error('native_postgres_client_unavailable');
const pwd=process.env.PGPASSWORD,api=process.env.REVIEW_TEST_API||'http://127.0.0.1:3030';
const secret=process.env.REVIEW_TEST_JWT_SECRET;
if(!pwd||!secret)throw Error('synthetic_fixture_configuration_missing');
const admin=new Client({host:'127.0.0.1',port:5432,database:'postgres',
 user:'postgres',password:pwd,connectionTimeoutMillis:5000,statement_timeout:12000});
const actor='22222222-2222-4222-8222-222222222222';
const other='66666666-6666-4666-8666-666666666666';
const owner='11111111-1111-4111-8111-111111111111';
const sid='77777777-7777-4777-8777-777777777777',grant='33333333-3333-4333-8333-333333333333';
const hex=c=>c.repeat(64),digest=hex('a'),caseDigest=hex('b'),appearance=hex('c'),source=hex('d');
const q={requestId:'44444444-4444-4444-8444-444444444444',targetType:'source-row-case',
 packageId:owner,packageVersion:1,packageDigest:digest,caseId:'case-a',
 caseVersion:1,caseDigest,sourceSha256:source,appearanceEvidenceDigest:appearance,
 disposition:'retain-unresolved',
 rationale:'Primary evidence is not confirmed and needs independent adjudication.',
 attestationVersion:'source-row-review-v1'};
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const issue=(claim={},key=secret)=>{
 const now=Math.floor(Date.now()/1000);
 const header=b64({alg:'HS256',typ:'JWT'});
 const payload=b64({role:'authenticated',sub:actor,session_id:sid,
   aud:'mlos-source-review-fixture',iss:'synthetic-local-issuer',iat:now,exp:now+600,...claim});
 const data=header+'.'+payload;
 return data+'.'+createHmac('sha256',key).update(data).digest('base64url');
};
async function rpc(name,token,params={}){
 const res=await fetch(api+'/rpc/'+name,{
  method:'POST',
  headers:{'Content-Type':'application/json',Accept:'application/json',
   ...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify(params)
 });
 const raw=await res.text();
 let data;try{data=JSON.parse(raw);}catch{data=raw;}
 return {status:res.status,data};
}
async function denied(value,label){
 assert.ok(value.status>=400,label+': unexpectedly '+value.status+' '+JSON.stringify(value.data));
}
async function ready(){
 for(let i=0;i<70;i++){
  try{const res=await fetch(api+'/',{signal:AbortSignal.timeout(1000)});
   if(res.status<500)return;
  }catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error('postgrest_not_ready');
}
await admin.connect();
try{
 if(process.env.REVIEW_SKIP_SETUP!=='1'){
 await admin.query("create role anon nologin;create role authenticated nologin;create role service_role nologin;");
 await admin.query("create role authenticator login noinherit password 'synthetic-only-authenticator';");
 await admin.query('grant anon,authenticated to authenticator');
 await admin.query(await readFile(new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8'));
 await admin.query(await readFile(new URL('../ops/prototypes/source-evidence/internal-review-postgrest-jwt.sql',import.meta.url),'utf8'));
 await admin.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',[owner,digest,owner]);
 await admin.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',
  [owner,digest,'case-a',caseDigest,appearance,source]);
 await admin.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',
  [grant,actor,owner,digest,'case-a']);
 await admin.query('insert into evidence_internal.grant_history(grant_event_id,transition) values($1,$2)',[grant,'granted']);
 await admin.query('insert into evidence_internal.sessions(session_id,reviewer_id,active) values($1,$2,true)',[sid,actor]);
 console.log('Fixture DB ready: auth role/privileges, isolated source/qualified grants, current sessions');
 }
 if(process.env.REVIEW_SETUP_ONLY!=='1'){
 await ready();
 const signed=issue();
 await denied(await rpc('record_source_review',null,{q}),'anonymous');
 await denied(await rpc('record_source_review',issue({},'wrong-cryptographic-key'),{q}),'bad signature');
 await denied(await rpc('record_source_review',issue({aud:'wrong-audience'}),{q}),'wrong audience');
 await denied(await rpc('record_source_review',issue({exp:1}),{q}),'expired token');
 await denied(await rpc('record_source_review',issue({role:'anon'}),{q}),'anonymous signed role');
 await denied(await rpc('record_source_review',issue({sub:other}),{q}),'cross-account');
 await denied(await rpc('record_source_review',issue({session_id:owner}),{q}),'unknown session');
 await denied(await rpc('record_source_review',signed,{q:{...q,reviewerId:actor}}),'forged body actor');
 await denied(await rpc('record_source_review',signed,{q:{...q,grantEventId:grant}}),'forged body grant');
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,0);
 console.log('PostgREST signed JWT rejection PASS: no anonymous, bad-signature, wrong-aud, expired, role, cross-account or forged-body write');
 const [first,repeat]=await Promise.all([
  rpc('record_source_review',signed,{q}),rpc('record_source_review',signed,{q})]);
 assert.ok(first.status<300,'first: '+JSON.stringify(first));
 assert.ok(repeat.status<300,'repeat: '+JSON.stringify(repeat));
 assert.equal(first.data.decisionId,repeat.data.decisionId);
 assert.equal(first.data.reviewerId,actor);
 assert.equal(first.data.learnerRelease,false);
 assert.equal(first.data.clinicalApproved,false);
 assert.equal(first.data.rightsApproved,false);
 assert.equal(first.data.examScopeApproved,false);
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,1);
 const read=await rpc('read_source_review',signed,{p_request:q.requestId});
 assert.ok(read.status<300,'protected readback: '+JSON.stringify(read));
 assert.deepEqual(read.data,first.data);
 await denied(await rpc('record_source_review',signed,{q:{...q,rationale:q.rationale+' changed'}}),'conflicting repeat');
 console.log('PostgREST verified-identity decision PASS: atomic exact retry and protected same-user readback');
 // Locked current state is re-checked within the next DB transaction.
 await admin.query('update evidence_internal.sessions set active=false where session_id=$1',[sid]);
 await denied(await rpc('read_source_review',signed,{p_request:q.requestId}),'revoked session read');
 await denied(await rpc('record_source_review',signed,{q:{...q,requestId:'55555555-5555-4555-8555-555555555555'}}),'revoked session write');
 await admin.query('update evidence_internal.sessions set active=true where session_id=$1',[sid]);
 await admin.query('insert into evidence_internal.grant_history(grant_event_id,transition) values($1,$2)',[grant,'revoked']);
 await denied(await rpc('read_source_review',signed,{p_request:q.requestId}),'revoked grant read');
 await denied(await rpc('record_source_review',signed,{q:{...q,requestId:'99999999-9999-4999-8999-999999999999'}}),'revoked grant write');
 assert.equal((await admin.query('select count(*)::int n from evidence_internal.decisions')).rows[0].n,1);
 await assert.rejects(admin.query("update evidence_internal.grant_history set transition='granted'"),/internal_review_immutable/);
 await assert.rejects(admin.query('delete from evidence_internal.grant_history'),/internal_review_immutable/);
 console.log('PostgREST current-state revocation PASS: immutable history retained; revocation denies read and write');
 }
}finally{await admin.end();}
