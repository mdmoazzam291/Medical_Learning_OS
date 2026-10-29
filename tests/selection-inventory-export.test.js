import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {selectionInventoryExport} from '../src/domain/selection-inventory-export.js';
const receipt={contractId:'frozen-content-selection-v1',selectionId:'11111111-1111-4111-8111-111111111111',requestId:'22222222-2222-4222-8222-222222222222',digest:'d'.repeat(64),catalogVersion:446,observedAt:'2026-10-29T10:00:00Z',createdAt:'2026-10-29T10:01:00Z',publicationAuthority:false,releaseReadiness:'not-assessed',items:[{kind:'question',canonicalId:'q<script>',versionId:'q@1',version:1,reviewFingerprints:{medical:'a'.repeat(64),references:'b'.repeat(64),rights:'c'.repeat(64)}}]};
test('export is deterministic metadata-only JSON and readable Markdown with an independently verified checksum',async()=>{
 const e=await selectionInventoryExport(receipt);assert.equal(e.manifest.inventoryOnly,true);assert.equal(e.manifest.ingestionReady,false);assert.equal(e.manifest.publicationAuthority,false);assert.equal(e.manifest.items[0].versionId,'q@1');
 assert.equal(e.sha256,createHash('sha256').update(e.json).digest('hex'));assert.match(e.markdown,/METADATA INVENTORY ONLY/);assert.doesNotMatch(e.markdown,/<script>/);assert.match(e.markdown,/q&lt;script&gt;/);
 assert.deepEqual(await selectionInventoryExport(receipt),e);
});
test('extra fields and private payload never enter the exported artifact',async()=>{
 const r={...receipt,actorId:'PRIVATE ACTOR',body:'PRIVATE BODY',items:[{...receipt.items[0],stem:'PRIVATE STEM',sourceEvidence:'PRIVATE SOURCE'}]};
 const e=await selectionInventoryExport(r);assert.doesNotMatch(e.json+e.markdown,/PRIVATE|requestId|actorId|sourceEvidence|stem/);
});
test('malformed identity, authority, hashes, version arrays and duplicate rows fail closed',async()=>{
 for(const r of [{...receipt,publicationAuthority:true},{...receipt,selectionId:'bad'},{...receipt,items:[]},{...receipt,items:[receipt.items[0],receipt.items[0]]},{...receipt,digest:'bad'},{...receipt,items:[{...receipt.items[0],reviewFingerprints:{}}]}])await assert.rejects(selectionInventoryExport(r));
});
