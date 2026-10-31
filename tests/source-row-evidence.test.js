import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { canonicalize } from '../src/domain/canonical-integrity.js';
import { digestSourceRowCase, digestSourceRowPackage } from '../src/domain/source-row-evidence.js';
import { validateSourceRowReviewRequest } from '../src/domain/source-row-review.js';
const uuid='11111111-1111-4111-8111-111111111111';
const claim=()=>({caseId:'bc-prefix-omitted',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'2024-09-12',
  appearance:{pdfPage:169,rowOrdinal:1,rotation:90,bboxMilliPoints:[58000,122000,108000,217000],rawCellSha256:'b'.repeat(64)},
  interpretation:{proposedIdentity:'BC14.1',relation:'proposed-normalization',rationaleSha256:'c'.repeat(64)}});
const pkg=()=>({packageId:uuid,packageVersion:1,cases:[claim(),{...claim(),caseId:'other-case'}]});
const reverseKeys=x=>Object.fromEntries(Object.entries(x).reverse());
test('case digest is canonical, domain separated and stable under key order',async()=>{
  const q=claim(),r=await digestSourceRowCase(q);
  assert.match(r.caseDigest,/^[a-f0-9]{64}$/);assert.notEqual(r.caseDigest,r.appearanceEvidenceDigest);
  assert.deepEqual(await digestSourceRowCase({...reverseKeys(q),appearance:reverseKeys(q.appearance),interpretation:reverseKeys(q.interpretation)}),r);
  const expected=createHash('sha256').update(canonicalize({contractId:'source-row-case-evidence-v1',claim:q})).digest('hex');
  assert.equal(r.caseDigest,expected);
});
test('source, locator and interpretation changes invalidate exact bindings',async()=>{
  const base=await digestSourceRowCase(claim());
  const altered=[{...claim(),sourceSha256:'d'.repeat(64)},{...claim(),caseVersion:2},
    {...claim(),appearance:{...claim().appearance,pdfPage:170}},
    {...claim(),interpretation:{...claim().interpretation,proposedIdentity:null}}];
  for(const c of altered)assert.notEqual((await digestSourceRowCase(c)).caseDigest,base.caseDigest);
  assert.equal((await digestSourceRowCase(altered[1])).appearanceEvidenceDigest,base.appearanceEvidenceDigest);
});
test('package ordering is irrelevant but package version and membership are bound',async()=>{
  const p=pkg(),r=await digestSourceRowPackage(p);
  assert.deepEqual(await digestSourceRowPackage({...p,cases:p.cases.toReversed()}),r);
  assert.notEqual((await digestSourceRowPackage({...p,packageVersion:2})).packageDigest,r.packageDigest);
  assert.notEqual((await digestSourceRowPackage({...p,cases:[p.cases[0]]})).packageDigest,r.packageDigest);
  assert.deepEqual(r.cases.map(c=>c.caseId),['bc-prefix-omitted','other-case']);
});
test('rejects malformed claims, unknown authority and duplicate logical cases',async()=>{
  const variants=[{...claim(),clinicalApproved:true},{...claim(),caseVersion:0},{...claim(),sourceSha256:'bad'},
    {...claim(),appearance:{...claim().appearance,pdfPage:0}},
    {...claim(),appearance:{...claim().appearance,bboxMilliPoints:[1,2,1,3]}},
    {...claim(),appearance:{...claim().appearance,rotation:45}},
    {...claim(),interpretation:{...claim().interpretation,relation:'approved'}},
    {...claim(),interpretation:{...claim().interpretation,rationaleSha256:null}}];
  for(const c of variants)await assert.rejects(digestSourceRowCase(c),/source_row_evidence_invalid/);
  await assert.rejects(digestSourceRowPackage({...pkg(),cases:[claim(),claim()]}),/source_row_evidence_invalid/);
  await assert.rejects(digestSourceRowPackage({...pkg(),cases:[]}),/source_row_evidence_invalid/);
});
test('caller mutation during hashing cannot change the captured package',async()=>{
  const original=pkg(),expected=await digestSourceRowPackage(original);let first=true;
  const cryptoImpl={subtle:{async digest(algorithm,bytes){if(first){first=false;original.cases[1].sourceSha256='d'.repeat(64);original.packageVersion=9;}return webcrypto.subtle.digest(algorithm,bytes);}}};
  assert.deepEqual(await digestSourceRowPackage(original,{cryptoImpl}),expected);
});
test('rejects invalid package boundaries, sparse arrays and accessor authority without evaluation',async()=>{
  const p=pkg();
  for(const q of [{...p,packageId:'bad'},{...p,packageVersion:0},{...p,extra:true},
    {...p,cases:new Array(2)},{...p,cases:Array(10001).fill(claim())}])
    await assert.rejects(digestSourceRowPackage(q),/source_row_evidence_invalid/);
  let invoked=false;const q=claim();
  Object.defineProperty(q,'sourceSha256',{enumerable:true,get(){invoked=true;return 'a'.repeat(64);}});
  await assert.rejects(digestSourceRowCase(q),/source_row_evidence_invalid/);assert.equal(invoked,false);
  const a=[claim()];Object.defineProperty(a,'hidden',{value:true});
  await assert.rejects(digestSourceRowPackage({...p,cases:a}),/source_row_evidence_invalid/);
  const custom=[claim()];Object.setPrototypeOf(custom,Object.create(Array.prototype));
  await assert.rejects(digestSourceRowPackage({...p,cases:custom}),/source_row_evidence_invalid/);
});
test('geometry, raw evidence, edition and rationale are independently bound',async()=>{
  const c=claim(),base=await digestSourceRowCase(c);
  for(const appearance of [{...c.appearance,rowOrdinal:2},{...c.appearance,rotation:0},
    {...c.appearance,bboxMilliPoints:[58000,122000,109000,217000]},
    {...c.appearance,rawCellSha256:'d'.repeat(64)}]) {
    const r=await digestSourceRowCase({...c,appearance});assert.notEqual(r.appearanceEvidenceDigest,base.appearanceEvidenceDigest);
  }
  assert.notEqual((await digestSourceRowCase({...c,sourceEdition:'2019'})).appearanceEvidenceDigest,base.appearanceEvidenceDigest);
  const r=await digestSourceRowCase({...c,interpretation:{...c.interpretation,rationaleSha256:'e'.repeat(64)}});
  assert.notEqual(r.caseDigest,base.caseDigest);assert.equal(r.appearanceEvidenceDigest,base.appearanceEvidenceDigest);
});
test('computed package and case digests fit the existing offline review request',async()=>{
  const p=await digestSourceRowPackage(pkg()),c=p.cases[0];
  const q={requestId:uuid,targetType:'source-row-case',packageId:p.packageId,packageVersion:p.packageVersion,
    packageDigest:p.packageDigest,...c,disposition:'retain-unresolved',
    rationale:'The source interpretation still requires independent adjudication.',attestationVersion:'source-row-review-v1'};
  assert.deepEqual(validateSourceRowReviewRequest(q),q);
  await assert.rejects(digestSourceRowCase(claim(),{cryptoImpl:{}}),/Web Crypto digest is unavailable/);
});
