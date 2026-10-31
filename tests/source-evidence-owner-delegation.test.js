import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceEvidenceOwnerDelegation as create} from '../scripts/lib/source-evidence-owner-delegation.js';
import {capabilityEnvelope} from '../scripts/lib/source-evidence-capability-envelope.js';
import {platformFixture as f} from '../scripts/lib/source-evidence-platform-fixture.js';
const token=(id=f.owner,session=f.session)=>'e30.'+Buffer.from(JSON.stringify({sub:id,session_id:session})).toString('base64url')+'.synthetic';
const candidate=e=>({...e.p,requestId:e.b.requestId,expectedPackageDigest:e.b.packageDigest});
const target=e=>({packageId:e.b.packageId,packageVersion:1,packageDigest:e.b.packageDigest,requestId:e.b.requestId});
function harness(e,{verifyUser=async()=>({id:f.owner}),query}={}){
 const calls=[];
 const d=create({verifyUser,query:query||(async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('stage_session'))return {rows:[{r:{status:'committed'}}]};
  return {rows:[{r:{candidate:e.args[2],manifest:e.args[3],receipt:e.args[6]}}]};
 })});return {d,calls};
}
test('delegation derives identity from exact verified token and validates original receipt',async()=>{
 const e=await capabilityEnvelope(),seen=[],{d,calls}=harness(e,{verifyUser:async t=>{seen.push(t);return {id:f.owner};}});
 const r=await d.stage({accessToken:token(),candidate:candidate(e)});
 assert.equal(r.status,'accepted');assert.equal(r.receipt.receiptId,JSON.parse(e.args[6]).receiptId);
 assert.deepEqual(seen,[token(),token()]);assert.equal(calls.length,2);
 assert.match(calls[0].sql,/^select evidence_probe.stage_session\(/);assert.match(calls[1].sql,/^select evidence_probe.readback_session\(/);
 for(const c of calls)assert.deepEqual(c.args.slice(0,2),[f.owner,f.session]);
 assert.equal((await d.readback({accessToken:token(),target:target(e)})).status,'available');
});
test('unverified tokens and mismatched or malformed claims never dispatch SQL',async()=>{
 const e=await capabilityEnvelope();for(const [tok,verify] of [[token(),async()=>null],[token(),async()=>{throw Error('secret');}],[token(f.other),async()=>({id:f.owner})],['bad',async()=>({id:f.owner})],[token(f.owner,'bad'),async()=>({id:f.owner})]]){
  const {d,calls}=harness(e,{verifyUser:verify});assert.deepEqual(await d.stage({accessToken:tok,candidate:candidate(e)}),{status:'denied'});assert.equal(calls.length,0);
 }
});
test('caller authority and hidden accessor fields reject without verifier or SQL',async()=>{
 const e=await capabilityEnvelope();let verifies=0;const {d,calls}=harness(e,{verifyUser:async()=>{verifies++;return {id:f.owner};}});
 for(const key of ['actorId','sessionId','verified','isAdmin','query'])assert.equal((await d.stage({accessToken:token(),candidate:candidate(e),[key]:true})).status,'invalid');
 const c=candidate(e);Object.defineProperty(c,'actorId',{get(){throw Error('getter must not run');},enumerable:false});
 assert.equal((await d.stage({accessToken:token(),candidate:c})).status,'invalid');assert.equal(verifies,0);assert.equal(calls.length,0);
});
test('candidate snapshot precedes delayed verification and caller mutation',async()=>{
 const e=await capabilityEnvelope();let release;const wait=new Promise(r=>release=r);const {d,calls}=harness(e,{verifyUser:async()=>{await wait;return {id:f.owner};}});
 const c=candidate(e),pending=d.stage({accessToken:token(),candidate:c});c.cases[0].caseVersion=9;c.packageVersion=9;release();
 assert.equal((await pending).status,'accepted');assert.equal(JSON.parse(calls[0].args[2]).cases[0].caseVersion,1);
});
test('postcommit token verification failure withholds accepted receipt',async()=>{
 const e=await capabilityEnvelope();let n=0;const {d,calls}=harness(e,{verifyUser:async()=>++n===1?{id:f.owner}:null});
 assert.deepEqual(await d.stage({accessToken:token(),candidate:candidate(e)}),{status:'denied'});assert.equal(calls.length,1);
});
test('unknown query errors and corrupt readback cannot leak SQL or receipt',async()=>{
 const e=await capabilityEnvelope();for(const mode of ['throw','corrupt']){
  const {d}=harness(e,{query:async sql=>{if(mode==='throw')throw Error('credential-secret raw SQL');if(sql.includes('stage_session'))return {rows:[{r:{status:'committed'}}]};return {rows:[{r:{candidate:e.args[2],manifest:e.args[3],receipt:'{}'}}]};}});
  const r=await d.stage({accessToken:token(),candidate:candidate(e)});assert.deepEqual(r,{status:mode==='throw'?'uncertain':'integrity-failure'});
 }
});
test('concurrent verifications keep each actor and session bound to its own operation',async()=>{
 const e=await capabilityEnvelope();let release;const wait=new Promise(r=>release=r),calls=[];
 const d=create({verifyUser:async t=>{if(t===token())await wait;return {id:t===token()?f.owner:f.other};},query:async(sql,args)=>{calls.push(args.slice(0,2));throw Error('evidence_platform_denied');}});
 const first=d.stage({accessToken:token(),candidate:candidate(e)});
 const second=await d.stage({accessToken:token(f.other,f.otherSession),candidate:candidate(e)});
 release();assert.deepEqual(await first,{status:'denied'});assert.deepEqual(second,{status:'denied'});
 assert.deepEqual(calls,[[f.other,f.otherSession],[f.owner,f.session]]);
});
test('exact target snapshot and malformed target rejection precede verification',async()=>{
 const e=await capabilityEnvelope();let release;const wait=new Promise(r=>release=r);const {d,calls}=harness(e,{verifyUser:async()=>{await wait;return {id:f.owner};}});
 const t=target(e),p=d.readback({accessToken:token(),target:t});t.packageDigest='f'.repeat(64);release();assert.equal((await p).status,'available');assert.equal(calls[0].args[4],e.b.packageDigest);
 for(const changed of [{...target(e),latest:true},{...target(e),packageVersion:0},{...target(e),requestId:'bad'}])assert.deepEqual(await d.readback({accessToken:token(),target:changed}),{status:'invalid'});
});
