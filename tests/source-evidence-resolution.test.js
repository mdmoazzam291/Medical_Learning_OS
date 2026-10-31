import test from 'node:test';
import assert from 'node:assert/strict';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {resolveSourceEvidenceCase as resolve} from '../src/domain/source-evidence-resolution.js';
const id='11111111-1111-4111-8111-111111111111';
const claim=(caseId,hash,edition)=>({caseId,caseVersion:1,sourceSha256:hash.repeat(64),sourceEdition:edition,appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}});
async function fixture(){const p={packageId:id,packageVersion:1,cases:[claim('case-a','a','source-A'),claim('case-b','d','source-B')]};const m=await digestSourceRowPackage(p),c=m.cases[1];return {p,s:{packageId:id,packageVersion:1,packageDigest:m.packageDigest,caseId:c.caseId,caseVersion:c.caseVersion,caseDigest:c.caseDigest,appearanceEvidenceDigest:c.appearanceEvidenceDigest}};}
test('resolves selected case source in multi-source package with no byte or release authority',async()=>{
 const {p,s}=await fixture(),r=await resolve(p,s);assert.deepEqual(r,{...s,sourceSha256:'d'.repeat(64),sourceEdition:'source-B',bytesVerified:false,sourceReviewOnly:true,learnerRelease:false});assert.ok(Object.isFrozen(r));assert.equal(Object.hasOwn(r,'url'),false);
 assert.deepEqual(await resolve({...p,cases:p.cases.toReversed()},s),r);
});
test('every exact binding is required with no latest-version or source fallback',async()=>{
 const {p,s}=await fixture();for(const k of Object.keys(s)){
  const missing={...s};delete missing[k];await assert.rejects(resolve(p,missing),undefined,k);
  const wrong={...s,[k]:typeof s[k]==='number'?2:k==='caseId'?'case-a':k==='packageId'?'22222222-2222-4222-8222-222222222222':'f'.repeat(64)};
  await assert.rejects(resolve(p,wrong),undefined,k);
 }
 await assert.rejects(resolve(p,{...s,sourceSha256:'a'.repeat(64)}));
});
test('recomputes entire package and rejects tampered sibling or selected source',async()=>{
 const {p,s}=await fixture();for(const index of [0,1]){const v=structuredClone(p);v.cases[index].sourceSha256='e'.repeat(64);await assert.rejects(resolve(v,s));}
 const v=structuredClone(p);v.cases[1].sourceEdition='different';await assert.rejects(resolve(v,s));
});
test('captures package and selection before asynchronous hashing',async()=>{
 const {p,s}=await fixture(),expected=await resolve(p,s),pending=resolve(p,s);p.cases[1].sourceEdition='mutated';p.cases[1].sourceSha256='f'.repeat(64);s.caseId='case-a';assert.deepEqual(await pending,expected);
});
test('rejects original hidden/custom arrays and getters without evaluating them',async()=>{
 const {p,s}=await fixture();const hidden=structuredClone(p);Object.defineProperty(hidden.cases,'extra',{value:1});await assert.rejects(resolve(hidden,s));
 const custom=structuredClone(p);let calls=0;const proto=Object.create(Array.prototype);Object.defineProperty(proto,'map',{get(){calls++;return Array.prototype.map;}});Object.setPrototypeOf(custom.cases,proto);await assert.rejects(resolve(custom,s));assert.equal(calls,0);
 const getter=Object.defineProperty({...s},'caseId',{get(){calls++;return 'case-b';},enumerable:true});await assert.rejects(resolve(p,getter));assert.equal(calls,0);
 const bbox=structuredClone(p);Object.defineProperty(bbox.cases[0].appearance.bboxMilliPoints,'hidden',{value:1});await assert.rejects(resolve(bbox,s));
});
test('rejects extra, inherited and malformed package/selection shapes',async()=>{
 const {p,s}=await fixture();for(const v of [null,Object.create(s),{...s,learnerRelease:true},{...s,caseVersion:'1'},{...s,caseDigest:'bad'},Object.defineProperty({...s},'hidden',{value:1})])await assert.rejects(resolve(p,v));
 for(const v of [{...p,extra:true},{...p,cases:[]},{...p,cases:[p.cases[0],p.cases[0]]}])await assert.rejects(resolve(v,s));
});
