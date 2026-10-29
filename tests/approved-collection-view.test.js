import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCollectionMarkup} from '../web/approved-collection-view.js';
import {approvedCollectionPage} from '../src/domain/approved-collection.js';
test('read-only UI separates evidence, stored lifecycle and missing release authority',()=>{
 const p=approvedCollectionPage({contractId:'approved-collection-snapshot-v1',catalogVersion:446,asOf:'2026-10-29T00:00:00Z',rows:[{kind:'note',canonicalId:'<img src=x onerror=alert(1)>',versionId:'note1',version:1,status:'published',sourceCount:1,rightsCurrent:false,openIssues:0,gates:{medical:'missing',references:'missing',rights:'missing'}}]});
 const html=approvedCollectionMarkup(p,{});assert.match(html,/Stored published/);assert.match(html,/Release readiness is not assessed/);assert.match(html,/medical missing/);assert.doesNotMatch(html,/<img|data-publish|data-approve/);assert.match(html,/&lt;img/);
});
test('loading and denied/unavailable states hide old successful counts and content',()=>{
 for(const options of [{loading:true},{error:403},{error:503}]){const html=approvedCollectionMarkup({rows:[{versionId:'PRIVATE'}],summary:{versions:999}}, {},options);assert.doesNotMatch(html,/PRIVATE|999/);}
});
