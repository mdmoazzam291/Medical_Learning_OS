// Disposable integration proof. Synthetic verifier map is NOT token signature validation.
import assert from 'node:assert/strict';
import {createSourceEvidenceOwnerDelegation} from './lib/source-evidence-owner-delegation.js';
import {installPlatformFixture,platformFixture as f} from './lib/source-evidence-platform-fixture.js';
import {capabilityEnvelope} from './lib/source-evidence-capability-envelope.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
const token=(id,sid)=>'e30.'+Buffer.from(JSON.stringify({sub:id,session_id:sid})).toString('base64url')+'.synthetic';
const ownerToken=token(f.owner,f.session),otherToken=token(f.other,f.otherSession),newSession='55555555-5555-4555-8555-555555555555',freshToken=token(f.owner,newSession);
const verified=new Map([[ownerToken,f.owner],[otherToken,f.other],[freshToken,f.owner]]);
const candidate=e=>({...e.p,requestId:e.b.requestId,expectedPackageDigest:e.b.packageDigest});
const target=e=>({packageId:e.b.packageId,packageVersion:e.b.packageVersion,packageDigest:e.b.packageDigest,requestId:e.b.requestId});
async function admin(sql,args=[]){await db.exec('set session authorization postgres');try{return await db.query(sql,args);}finally{await db.exec('set session authorization evidence_gateway');}}
let fault=null,queries=0;
const delegation=createSourceEvidenceOwnerDelegation({verifyUser:async t=>verified.has(t)?{id:verified.get(t)}:null,query:async(sql,args)=>{
 queries++;assert.ok(sql.startsWith('select evidence_probe.stage_session(')||sql.startsWith('select evidence_probe.readback_session('));
 assert.ok(!args.includes(ownerToken)&&!args.includes(otherToken));
 if(sql.includes('readback_session')&&fault==='readback-unavailable'){fault=null;throw Error('private database unavailable');}
 const result=await db.query(sql,args);
 if(sql.includes('stage_session')&&fault==='lost-delivery'){fault=null;throw Error('secret SQL connection lost');}
 if(sql.includes('stage_session')&&fault==='revoke'){fault=null;await admin('delete from auth.sessions where id=$1',[f.session]);}
 if(sql.includes('readback_session')&&fault==='corrupt'){fault=null;result.rows[0].r.candidate+=' ';}
 return result;
}});
try{
 await installPlatformFixture(db,{capability:true});await db.exec('set session authorization evidence_gateway');
 const e=await capabilityEnvelope(),input={accessToken:ownerToken,candidate:candidate(e)};
 assert.deepEqual(await delegation.stage(input),{status:'denied'}); // feature defaults off
 await admin('update evidence_probe.platform_feature set enabled=true');
 const first=await delegation.stage(input);assert.equal(first.status,'accepted');assert.equal(first.receipt.learnerRelease,false);
 assert.deepEqual(await delegation.stage(input),first);
 assert.deepEqual(await delegation.readback({accessToken:ownerToken,target:target(e)}),{status:'available',receipt:first.receipt});
 assert.deepEqual(await delegation.readback({accessToken:otherToken,target:target(e)}),{status:'denied'});
 const before=queries;assert.deepEqual(await delegation.stage({...input,accessToken:ownerToken+'forged'}),{status:'denied'});assert.equal(queries,before);
 console.log('Delegation SQL PASS: default off, exact verified identity, stage/readback/retry original receipt, foreign/unverified denial.');
 fault='corrupt';assert.deepEqual(await delegation.stage(input),{status:'integrity-failure'});
 fault='lost-delivery';const lost=await capabilityEnvelope(),lostInput={accessToken:ownerToken,candidate:candidate(lost)};
 assert.deepEqual(await delegation.stage(lostInput),{status:'uncertain'});
 const recovered=await delegation.stage(lostInput);assert.equal(recovered.status,'accepted');
 const count=await admin('select count(*)::int n from evidence_probe.requests where request_id=$1',[lost.b.requestId]);assert.equal(count.rows[0].n,1);
 console.log('Delegation SQL PASS: corrupted canonical readback withheld; lost delivery reconciles one committed request.');
 fault='readback-unavailable';const unavailable=await capabilityEnvelope(),unavailableInput={accessToken:ownerToken,candidate:candidate(unavailable)};
 assert.deepEqual(await delegation.stage(unavailableInput),{status:'uncertain'});
 const afterUnavailable=await delegation.stage(unavailableInput);assert.equal(afterUnavailable.status,'accepted');
 assert.equal((await admin('select count(*)::int n from evidence_probe.requests where request_id=$1',[unavailable.b.requestId])).rows[0].n,1);
 console.log('Delegation SQL PASS: unavailable postcommit readback returns uncertain without receipt, then reconciles same request.');
 fault='revoke';const revoked=await capabilityEnvelope(),revokedInput={accessToken:ownerToken,candidate:candidate(revoked)};
 assert.deepEqual(await delegation.stage(revokedInput),{status:'denied'});
 assert.equal((await admin('select count(*)::int n from evidence_probe.requests where request_id=$1',[revoked.b.requestId])).rows[0].n,1);
 await admin('insert into auth.sessions values($1,$2)',[newSession,f.owner]);
 const reconciled=await delegation.stage({...revokedInput,accessToken:freshToken});assert.equal(reconciled.status,'accepted');
 assert.equal(reconciled.receipt.requestId,revoked.b.requestId);
 assert.deepEqual(await delegation.stage(revokedInput),{status:'denied'});
 console.log('Delegation SQL PASS: postcommit session revocation withholds receipt; fresh same-owner session reconciles original audit.');
}finally{await db.close();}
