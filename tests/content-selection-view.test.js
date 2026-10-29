import test from 'node:test';import assert from 'node:assert/strict';
import {selectionMarkup} from '../web/content-selection.js';
test('selection UI makes frozen metadata distinct from publication and escapes identities',()=>{
 const html=selectionMarkup({items:[{kind:'question',versionId:'<img>'}],preview:{digest:'a'.repeat(64),catalogVersion:446}});
 assert.match(html,/Freeze evidence selection/);assert.match(html,/not publish/);assert.match(html,/&lt;img&gt;/);assert.doesNotMatch(html,/<img/);
});
test('uncertain save permits retry and disables replacing its request',()=>{
 const html=selectionMarkup({items:[],pending:{requestId:'x'},error:'save'});assert.match(html,/Retry same selection save/);assert.doesNotMatch(html,/data-selection-clear/);
});
test('recheck shows current/stale/blocked as observations, never publish clearance',()=>{
 const receipt={selectionId:'id',digest:'a'.repeat(64),catalogVersion:446};
 for(const state of ['current','stale','blocked']){
  const html=selectionMarkup({receipt,validation:{state,checkedAt:'2026-10-29T10:00:00Z',reasons:state==='current'?[]:['current_evidence_blocked']}});
  assert.match(html,/Recheck saved evidence/);assert.match(html,new RegExp(state==='current'?'Current at observation':state==='stale'?'Saved evidence is stale':'Current evidence is blocked'));assert.doesNotMatch(html,/Ready to publish/);
 }
 const failed=selectionMarkup({receipt,error:'revalidate'});assert.match(failed,/Current evidence could not be checked/);assert.doesNotMatch(failed,/Current at observation/);
});
