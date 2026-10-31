import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalize,digestCanonical} from '../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest as prepare,matchesSourceEvidenceStagingReceipt as matches} from '../src/domain/source-evidence-staging.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const claim=()=>({caseId:'case-a',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'2024',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}});
async function candidate(){const p={packageId:id,packageVersion:1,cases:[claim(),{...claim(),caseId:'case-b'}]};return {requestId:id,...p,expectedPackageDigest:(await digestSourceRowPackage(p)).packageDigest};}
async function receipt(b){const r={contractId:'source-evidence-staging-receipt-v1',receiptId:other,...b,recordedAt:'2026-10-31T00:00:00.000Z',sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};return {...r,receiptDigest:(await digestCanonical(r)).digestHex};}
test('fingerprint binds canonical sorted claims with an independent SHA oracle',async()=>{
 const c=await candidate(),b=await prepare(c,id);const claimsDigest=createHash('sha256').update(canonicalize(c.cases)).digest('hex');
 const expected=createHash('sha256').update(canonicalize({contractId:'source-evidence-stage-request-v1',actorId:id,requestId:id,packageId:id,packageVersion:1,expectedPackageDigest:c.expectedPackageDigest,claimsDigest})).digest('hex');
 assert.equal(b.requestFingerprint,expected);assert.equal(b.packageDigest,c.expectedPackageDigest);assert.ok(Object.isFrozen(b));
 assert.deepEqual(await prepare({...c,cases:c.cases.toReversed()},id),b);
});
test('actor, request and changed exact metadata alter fingerprint',async()=>{
 const c=await candidate(),b=await prepare(c,id);
 assert.notEqual((await prepare(c,other)).requestFingerprint,b.requestFingerprint);
 assert.notEqual((await prepare({...c,requestId:other},id)).requestFingerprint,b.requestFingerprint);
 c.cases[0].caseVersion=2;c.expectedPackageDigest=(await digestSourceRowPackage({packageId:id,packageVersion:1,cases:c.cases})).packageDigest;
 assert.notEqual((await prepare(c,id)).requestFingerprint,b.requestFingerprint);
});
test('rejects malformed candidates and mismatched claimed digest',async()=>{
 const c=await candidate();for(const v of [{...c,extra:true},{...c,requestId:'bad'},{...c,expectedPackageDigest:'f'.repeat(64)},{...c,cases:[claim(),claim()]}])await assert.rejects(prepare(v,id));
 for(const k of Object.keys(c)){const v={...c};delete v[k];await assert.rejects(prepare(v,id));}
 for(const v of [Object.create(c),Object.defineProperty({...c},'hidden',{value:1}),{...c,[Symbol()]:1},Object.defineProperty({...c},'requestId',{get(){throw Error('getter invoked');},enumerable:true})])await assert.rejects(prepare(v,id),e=>!e.message.includes('getter invoked'));
 await assert.rejects(prepare(c,'bad'));
});
test('captures caller candidate before asynchronous hashing',async()=>{
 const c=await candidate(),copy=structuredClone(c),pending=prepare(c,id);c.cases[0].caseVersion=44;c.requestId=other;
 assert.deepEqual(await pending,await prepare(copy,id));
});
test('matches exact receipt binding and recomputed receipt digest only',async()=>{
 const b=await prepare(await candidate(),id),r=await receipt(b);assert.equal(await matches(r,b),true);
 for(const k of Object.keys(r)){const bad={...r};delete bad[k];assert.equal(await matches(bad,b),false,k);}
 for(const k of ['requestId','actorId','packageId','packageVersion','packageDigest','requestFingerprint','sourceReviewOnly','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease','recordedAt','receiptId','receiptDigest']){
 const bad={...r,[k]:typeof r[k]==='boolean'?!r[k]:typeof r[k]==='number'?2:'bad'};assert.equal(await matches(bad,b),false,k);}
 assert.equal(await matches({...r,receiptDigest:'f'.repeat(64)},b),false);
 assert.equal(await matches({...r,recordedAt:'2026-10-31T00:00:01.000Z'},b),false);
 // A recomputed checksum is self-consistent, not evidence of trusted origin.
 const {receiptDigest:ignored,...forged}=r;forged.recordedAt='2026-10-31T00:00:01.000Z';
 assert.equal(await matches({...forged,receiptDigest:(await digestCanonical(forged)).digestHex},b),true);
 assert.equal(await matches({...r,extra:true},b),false);assert.equal(await matches(r,{...b,actorId:other}),false);
});
test('receipt matcher fails closed for invalid descriptors and untrusted binding shape',async()=>{
 const b=await prepare(await candidate(),id),r=await receipt(b);
 assert.equal(await matches(Object.create(r),b),false);assert.equal(await matches(r,{...b,extra:true}),false);
 assert.equal(await matches(Object.defineProperty({...r},'actorId',{get(){throw Error('getter');},enumerable:true}),b),false);
 assert.equal(await matches(null,b),false);
});
test('rejects hidden and custom-prototype arrays before canonical snapshot',async()=>{
 const c=await candidate();Object.defineProperty(c.cases,'hidden',{value:1});await assert.rejects(prepare(c,id));
 const d=await candidate();let calls=0;const proto=Object.create(Array.prototype);Object.defineProperty(proto,'map',{get(){calls++;return Array.prototype.map;}});Object.setPrototypeOf(d.cases,proto);await assert.rejects(prepare(d,id));assert.equal(calls,0);
 const e=await candidate();Object.defineProperty(e.cases[0].appearance.bboxMilliPoints,'hidden',{value:1});await assert.rejects(prepare(e,id));
});
test('malformed nested receipt arrays never execute inherited getters',async()=>{
 const b=await prepare(await candidate(),id),r=await receipt(b);let calls=0;const proto=Object.create(Array.prototype);Object.defineProperty(proto,'map',{get(){calls++;return Array.prototype.map;}});const value=[];Object.setPrototypeOf(value,proto);
 assert.equal(await matches({...r,recordedAt:value},b),false);assert.equal(calls,0);
});
