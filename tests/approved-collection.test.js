import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCollectionPage,parseApprovedCollectionFilters} from '../src/domain/approved-collection.js';
const row=(id,status='verified')=>({kind:'question',canonicalId:id,versionId:id+'@1',version:1,status,sourceCount:1,rightsCurrent:true,openIssues:0,gates:{medical:'current',references:'current',rights:'current'}});
const snapshot=rows=>({contractId:'approved-collection-snapshot-v1',catalogVersion:446,asOf:'2026-10-29T00:00:00Z',rows});
test('current evidence remains separate from stored publication and release authority',()=>{
 const result=approvedCollectionPage(snapshot([row('a'),row('b','published'),row('c','draft')]));
 assert.equal(result.summary.evidenceCurrent,2);assert.equal(result.summary.storedPublished,1);
 assert.equal(result.rows[0].evidenceState,'current');assert.equal(result.rows[0].storedPublished,false);
 assert.deepEqual(result.rows[2].blockers,['lifecycle_not_accepted']);
 assert.equal(result.publicationAuthority,false);assert.equal(result.releaseReadiness,'not-assessed');
});
test('missing, rejected and stale review gates, rights and open issues block independently',()=>{
 const a=row('a');a.gates.medical='stale';a.gates.references='missing';a.gates.rights='rejected';a.rightsCurrent=false;a.openIssues=1;
 assert.deepEqual(approvedCollectionPage(snapshot([a])).rows[0].blockers,['medical_stale','references_missing','rights_rejected','source_rights_unresolved','open_content_issue']);
 const b=row('b');b.sourceCount=0;assert.ok(approvedCollectionPage(snapshot([b])).rows[0].blockers.includes('sources_missing'));
});
test('pending revision cannot consume or hide current stored-published identity',()=>{
 const newer={...row('a','in_review'),version:2,versionId:'a@2'};
 const p=approvedCollectionPage(snapshot([newer,row('a','published')]));assert.equal(p.rows.length,2);assert.equal(p.summary.canonicalItems,1);assert.equal(p.summary.storedPublished,1);
});
test('filters paginate one frozen supplied snapshot and preserve scoped totals',()=>{
 const s=snapshot([row('a'),row('b'),row('c','draft')]);const f=parseApprovedCollectionFilters(new URLSearchParams('state=current&limit=1&offset=1'));
 const p=approvedCollectionPage(s,f);assert.equal(p.rows[0].canonicalId,'b');assert.equal(p.total,2);assert.equal(p.nextOffset,null);assert.equal(p.summary.versions,3);
});
test('malformed, duplicate and oversized snapshots fail rather than fabricate counts',()=>{
 for(const s of [snapshot([row('a'),row('a')]),snapshot([{...row('a'),gates:{medical:'approved'}}]),snapshot([{...row('a'),rightsCurrent:'true'}]),snapshot(Array.from({length:2001},(_,i)=>row('x'+i))),{rows:[]}])assert.throws(()=>approvedCollectionPage(s));
});
test('invalid and duplicated filters reject client authority and unbounded pages',()=>{
 for(const q of ['actor=forged','constructor=1','toString=1','state=approved','limit=101','offset=-1','search=a&search=b'])assert.throws(()=>parseApprovedCollectionFilters(new URLSearchParams(q)));
});
