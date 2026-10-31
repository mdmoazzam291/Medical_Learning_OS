import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceEvidenceVerifiedUser,createSourceEvidencePrivateQuery} from '../scripts/lib/source-evidence-private-boundary.js';
import {createSourceEvidenceOwnerDelegation} from '../scripts/lib/source-evidence-owner-delegation.js';
import {capabilityEnvelope} from '../scripts/lib/source-evidence-capability-envelope.js';
import {platformFixture as f} from '../scripts/lib/source-evidence-platform-fixture.js';

const token=(actor=f.owner,session=f.session)=>'e30.'+Buffer.from(JSON.stringify({sub:actor,session_id:session})).toString('base64url')+'.synthetic';
const candidate=e=>({...e.p,requestId:e.b.requestId,expectedPackageDigest:e.b.packageDigest});
const row={login_role:'evidence_gateway',active_role:'evidence_gateway',rolcanlogin:true,rolbypassrls:false,rolsuper:false};
function connection(events,{login='evidence_gateway',identity=row,failSql=false,readback}={}){
 const client={
  connectionParameters:{user:login},
  async connect(){events.push('connect');},
  async query(sql,args){events.push({sql,args});
   if(failSql)throw Error('private-password-internal-error');
   if(sql.includes('pg_catalog.pg_roles'))return {rows:[identity]};
   if(sql.startsWith('select evidence_probe.stage_session('))return {rows:[{r:{status:'committed'}}]};
   if(sql.startsWith('select evidence_probe.readback_session('))return {rows:[{r:readback}]};
   throw Error('unexpected statement');
  },
  async end(){events.push('end');}
 };
 return client;
}

test('network getUser adapter returns only a validated user id and never accepts provider errors',async()=>{
 const seen=[];
 const verified=createSourceEvidenceVerifiedUser({getUser:async t=>{seen.push(t);return {data:{user:{id:f.owner,email:'not-shared'}},error:null};}});
 assert.deepEqual(await verified('sensitive-token'),{id:f.owner});
 assert.deepEqual(seen,['sensitive-token']);
 for(const response of [{data:{user:null},error:null},{data:{user:{id:f.owner}},error:{message:'revoked'}},{data:{user:{id:'not-a-uuid'}},error:null},{error:null},null]){
  assert.equal(await createSourceEvidenceVerifiedUser({getUser:async()=>response})('token'),null);
 }
 for(const value of ['',null,{},'x'.repeat(16385)])assert.equal(await verified(value),null);
 assert.deepEqual(seen,['sensitive-token']);
 assert.equal(await createSourceEvidenceVerifiedUser({getUser:async()=>{throw Error('secret-token-auth-transport');}})('token'),null);
 assert.throws(()=>createSourceEvidenceVerifiedUser({getUser:null}),/configuration_invalid/);
});

test('private query allows only two exact function calls on fresh directly attested login',async()=>{
 const calls=[],query=createSourceEvidencePrivateQuery({createClient:()=>connection(calls)});
 await query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',[1,2,3,4,5,6,7]);
 await query('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[1,2,3,4,5,6]);
 assert.equal(calls.filter(x=>x==='connect').length,2);
 assert.equal(calls.filter(x=>x==='end').length,2);
 assert.equal(calls.filter(x=>typeof x==='object'&&x.sql.includes('pg_catalog.pg_roles')).length,2);
 assert.equal(calls.filter(x=>typeof x==='object'&&x.sql.includes('evidence_probe.stage_session(')).length,1);
 assert.equal(calls.filter(x=>typeof x==='object'&&x.sql.includes('evidence_probe.readback_session(')).length,1);
 const before=calls.length;
 for(const [sql,args] of [['select * from auth.users',[]],['select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',[]],['select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r;drop table x',[1,2,3,4,5,6]]]){
  await assert.rejects(query(sql,args),/^Error: evidence_private_database_unavailable$/);
 }
 assert.equal(calls.length,before);
 assert.throws(()=>createSourceEvidencePrivateQuery({createClient:null}),/configuration_invalid/);
});

test('private query refuses broad role, role switching, bypass RLS, SQL failure without leaking details',async()=>{
 for(const scenario of [
  {login:'postgres'},
  {identity:{...row,login_role:'postgres'}},
  {identity:{...row,active_role:'postgres'}},
  {identity:{...row,rolbypassrls:true}},
  {identity:{...row,rolsuper:true}},
  {identity:{...row,rolcanlogin:false}},
  {identity:null},
  {failSql:true}
 ]){
  const calls=[],query=createSourceEvidencePrivateQuery({createClient:()=>connection(calls,scenario)});
  await assert.rejects(query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',[1,2,3,4,5,6,7]),e=>e.message==='evidence_private_database_unavailable');
  assert.equal(calls.filter(x=>x==='end').length,1);
  assert.equal(calls.filter(x=>typeof x==='object'&&x.sql.includes('evidence_probe.stage_session(')).length,scenario.failSql?0:0);
 }
});

test('owner delegation can use getUser response plus privately attested SQL without exposing token',async()=>{
 const e=await capabilityEnvelope(),events=[],seen=[],t=token(),raw={candidate:e.args[2],manifest:e.args[3],receipt:e.args[6]};
 const verifyUser=createSourceEvidenceVerifiedUser({getUser:async received=>{seen.push(received);return received===t?{data:{user:{id:f.owner}},error:null}:{data:{user:null},error:{message:'invalid'}};}});
 const query=createSourceEvidencePrivateQuery({createClient:()=>connection(events,{readback:raw})});
 const delegate=createSourceEvidenceOwnerDelegation({verifyUser,query});
 const result=await delegate.stage({accessToken:t,candidate:candidate(e)});
 assert.equal(result.status,'accepted');
 assert.equal(result.receipt.learnerRelease,false);
 assert.deepEqual(seen,[t,t]);
 assert.equal(events.filter(x=>x==='connect').length,2);
 assert.equal(events.filter(x=>x==='end').length,2);
 assert.ok(events.filter(x=>typeof x==='object').every(x=>!JSON.stringify(x).includes(t)));
 assert.equal((await delegate.readback({accessToken:t,target:{packageId:e.b.packageId,packageVersion:1,packageDigest:e.b.packageDigest,requestId:e.b.requestId}})).status,'available');
 const before=events.length;
 assert.deepEqual(await delegate.stage({accessToken:t+'.altered',candidate:candidate(e)}),{status:'denied'});
 assert.equal(events.length,before);
});

test('after commit a failing getUser recheck denies receipt, leaving reconciliation to same-owner retry',async()=>{
 const e=await capabilityEnvelope(),events=[];let verifications=0;
 const verifyUser=createSourceEvidenceVerifiedUser({getUser:async()=>++verifications===1?{data:{user:{id:f.owner}},error:null}:{data:{user:null},error:{message:'revoked'}}});
 const query=createSourceEvidencePrivateQuery({createClient:()=>connection(events,{readback:{candidate:e.args[2],manifest:e.args[3],receipt:e.args[6]}})});
 const delegate=createSourceEvidenceOwnerDelegation({verifyUser,query});
 assert.deepEqual(await delegate.stage({accessToken:token(),candidate:candidate(e)}),{status:'denied'});
 assert.equal(events.filter(x=>typeof x==='object'&&x.sql.includes('evidence_probe.stage_session(')).length,1);
 assert.equal(events.filter(x=>typeof x==='object'&&x.sql.includes('evidence_probe.readback_session(')).length,0);
 assert.equal(events.filter(x=>x==='end').length,1);
});
