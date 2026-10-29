import test from 'node:test';import assert from 'node:assert/strict';
import {selectionRevalidation} from '../src/domain/selection-revalidation.js';
const hashes={medical:'a'.repeat(64),references:'b'.repeat(64),rights:'c'.repeat(64)};
const frozen={selectionId:'11111111-1111-4111-8111-111111111111',digest:'d'.repeat(64),catalogVersion:446,items:[{kind:'question',canonicalId:'q',versionId:'q@1',version:1,reviewFingerprints:hashes}]};
const current=()=>({...frozen,observedAt:'2026-10-29T10:00:00Z'});
test('same exact bindings are current only at the observation time with no release authority',()=>{
 const r=selectionRevalidation(frozen,current());assert.equal(r.state,'current');assert.equal(r.checkedAt,current().observedAt);assert.equal(r.publicationAuthority,false);assert.equal(r.releaseReadiness,'not-assessed');assert.deepEqual(r.reasons,[]);
});
test('catalog drift and changed exact hashes explain stale observations without altering receipt',()=>{
 const before=structuredClone(frozen),c=current();c.catalogVersion++;c.digest='e'.repeat(64);c.items=[{...c.items[0],reviewFingerprints:{...hashes,medical:'f'.repeat(64)}}];
 assert.deepEqual(selectionRevalidation(frozen,c).reasons,['catalog_changed','binding_digest_changed','review_fingerprints_changed']);assert.deepEqual(frozen,before);
});
test('blocked current evidence is distinct from changed binding or unavailable data',()=>{
 assert.equal(selectionRevalidation(frozen,null,{blocked:true,checkedAt:'2026-10-29T10:00:00Z'}).state,'blocked');
 assert.throws(()=>selectionRevalidation(frozen,null));
 assert.throws(()=>selectionRevalidation(frozen,{...current(),items:[]}));
});
