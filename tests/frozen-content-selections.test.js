import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionItems,selectionSaveInput} from '../src/domain/frozen-content-selections.js';
const a={kind:'question',versionId:'q@1'},b={kind:'note',versionId:'11111111-1111-4111-8111-111111111111'};
test('exact versions are sorted, bounded, unique and have no client authority fields',()=>{
 assert.deepEqual(selectionItems([a,b]),[b,a]);
 for(const value of [[],[a,a],[{...a,actor:'forged'}],[{kind:'case',versionId:'x'}],Array.from({length:101},(_,i)=>({...a,versionId:'q@'+i}))])assert.throws(()=>selectionItems(value));
});
test('save requires exact preview binding and stable UUID request identity',()=>{
 const input={items:[a],requestId:'22222222-2222-4222-8222-222222222222',expectedDigest:'a'.repeat(64),expectedCatalogVersion:446};
 assert.deepEqual(selectionSaveInput(input),input);
 for(const value of [{...input,actor:'forged'},{...input,expectedDigest:'a'},{...input,expectedCatalogVersion:0},{...input,requestId:'invalid'}])assert.throws(()=>selectionSaveInput(value));
});
