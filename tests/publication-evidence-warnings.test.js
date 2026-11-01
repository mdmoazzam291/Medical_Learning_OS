import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPublicationEvidenceWarnings as inspect} from '../src/domain/publication-evidence-warnings.js';

const note=extra=>({noteVersionId:'note-v1',status:'published',title:'Approved note',body_markdown:'Culture pending in clinical vignette.',provenance:{evidence:'Original notes'},...extra});
const source=extra=>({sourceId:'source-1',rights:{status:'citation_only',evidence:'Citation only, no passage reuse'},...extra});

test('historical Core6-style draft disclaimer flags once, never leaks protected text',()=>{
  const r=inspect({notes:[note({title:'Cardiology [review draft]',body_markdown:'UNAPPROVED AI-ASSISTED REVIEW DRAFT. Review pending.',provenance:{evidence:'Not human-approved'}})]});
  assert.deepEqual(r.warnings,[{scope:'note',targetId:'note-v1',code:'note_contains_unresolved_review_language',action:'independent_human_review_required'}]);
  assert.equal(r.approvalGranted,false);
  assert.equal(r.publicationDecision,'not_evaluated');
  assert.ok(!JSON.stringify(r).includes('UNAPPROVED'));
});
test('draft warning is opt-in before publication',()=>{
  const n=note({status:'draft',title:'[review draft]'});
  assert.equal(inspect({notes:[n]}).warnings.length,0);
  assert.equal(inspect({notes:[n],inspectDrafts:true}).warnings.length,1);
});
test('public domain claim contradicting commercial screenshot unknown rights is flagged',()=>{
  const r=inspect({sources:[source({rights:{status:'public_domain',evidence:'Commercial recall screenshots/annotations with unknown rights.'}})]});
  assert.deepEqual(r.warnings.map(w=>w.code),['permission_claim_conflicts_with_evidence']);
});
test('licensed and owned claims with permission still pending are flagged',()=>{
  const r=inspect({sources:[source({rights:{status:'licensed',evidence:'Permission pending from publisher.'}}),source({sourceId:'source-2',rights:{status:'owned',evidence:'Copyright status unknown.'}})]});
  assert.deepEqual(r.warnings.map(w=>w.targetId),['source-1','source-2']);
});
test('missing public-domain evidence flags an advisory warning',()=>{
  const r=inspect({sources:[source({rights:{status:'public_domain',evidence:''}})]});
  assert.deepEqual(r.warnings.map(w=>w.code),['public_domain_claim_lacks_rights_evidence']);
});
test('ordinary clinical pending is not a rights claim; absence of warnings grants no permission',()=>{
  const r=inspect({notes:[note()],sources:[source({rights:{status:'citation_only',evidence:'Permission unknown; citation only.'}})]});
  assert.equal(r.warnings.length,0);
  assert.equal(r.approvalGranted,false);
});
test('sorted warnings are independent of input order and omit evidence text',()=>{
  const xs=[source({sourceId:'z',rights:{status:'public_domain',evidence:'Unknown rights on protected source bytes'}}),source({sourceId:'a',rights:{status:'public_domain',evidence:''}})];
  const a=inspect({sources:xs}),b=inspect({sources:xs.slice().reverse()});
  assert.deepEqual(a,b);
  assert.ok(!JSON.stringify(a).includes('protected source bytes'));
});
test('malformed and duplicate IDs fail closed rather than falsely return zero',()=>{
  assert.throws(()=>inspect({notes:[note(),note()]}),/duplicate_identifier/);
  assert.throws(()=>inspect({notes:{}}),/input_invalid/);
  assert.throws(()=>inspect({sources:[{sourceId:'a',rights:{status:'public_domain',evidence:32}}]}),/text_invalid/);
  assert.throws(()=>inspect({notes:[{noteVersionId:'x',status:'published',title:'x',provenance:'invalid'}]}),/provenance_invalid/);
});
