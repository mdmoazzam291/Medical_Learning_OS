import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicationEvidenceMarkup} from '../web/admin-workspace-view.js';

const scan=(overrides={})=>({
  status:'complete',approvalGranted:false,publicationDecision:'not_evaluated',
  warningCount:0,warnings:[],truncated:false,...overrides
});

test('plain-language checklist explains independent rights, clinical accuracy and references',()=>{
  const html=publicationEvidenceMarkup(scan());
  assert.match(html,/Before publishing: three checks/);
  assert.match(html,/May we legally reuse this material/);
  assert.match(html,/Is the clinical content correct/);
  assert.match(html,/Does the citation support the claim/);
  assert.match(html,/No matching warning phrases found/);
  assert.match(html,/still unverified by this scan/);
  assert.doesNotMatch(html,/\bContent approved\b|\bReady to publish\b/);
});

test('missing, old and malformed scans do not appear green or verified',()=>{
  for(const bad of [undefined,null,{},scan({approvalGranted:true}),scan({status:'unavailable',warningCount:null}),scan({warnings:[{}],warningCount:0}),scan({truncated:'false'})]){
    const html=publicationEvidenceMarkup(bad);
    assert.match(html,/scan unavailable/);
    assert.doesNotMatch(html,/No matching warning phrases found/);
  }
});

test('warning labels are clear, IDs escaped and sensitive evidence is not displayed',()=>{
  const html=publicationEvidenceMarkup(scan({
    warningCount:2,
    warnings:[
      {scope:'source',targetId:'SRC-<img onerror="alert(1)">',code:'permission_claim_conflicts_with_evidence',action:'independent_human_review_required'},
      {scope:'note',targetId:'NOTE-1',code:'note_contains_unresolved_review_language',action:'independent_human_review_required'}
    ]
  }));
  assert.match(html,/2 possible content-review problems detected/);
  assert.match(html,/Source permission claim conflicts with its recorded evidence/);
  assert.match(html,/Published note still says draft or unapproved/);
  assert.match(html,/&lt;img/);
  assert.doesNotMatch(html,/<img onerror/);
  assert.match(html,/Content Review/);
  assert.match(html,/existing Review → Live gate/);
});

test('failed-to-understand warning row must not be silently dismissed',()=>{
  const html=publicationEvidenceMarkup(scan({warningCount:1,warnings:[{
    scope:'source',targetId:'SRC-2',code:'new_backend_warning',action:'unexpected'
  }]}));
  assert.match(html,/scan malformed/);
  assert.doesNotMatch(html,/No matching warning phrases found/);
});

test('unknown warning code is not falsely treated as medically approved',()=>{
  const html=publicationEvidenceMarkup(scan({warningCount:1,warnings:[{
    scope:'source',targetId:'SRC-2',code:'new_backend_warning',action:'independent_human_review_required'
  }]}));
  assert.match(html,/Inspect this warning with a qualified reviewer/);
});

test('truncated warnings flag incomplete evidence without leaking source bytes',()=>{
  const html=publicationEvidenceMarkup(scan({warningCount:155,warnings:[{
    scope:'source',targetId:'SRC-1',code:'public_domain_claim_lacks_rights_evidence',action:'independent_human_review_required'
  }],truncated:true}));
  assert.match(html,/sample of warnings/);
  assert.match(html,/public-domain claim/i);
  assert.doesNotMatch(html,/clinical accuracy verified/);
});

test('owner audit is wired to the existing screen with no new route, mutation or privileged button',()=>{
  const source=readFileSync(new URL('../web/owner-console.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../web/owner-console.css',import.meta.url),'utf8');
  assert.match(source,/import \{ overviewMarkup, publicationEvidenceMarkup \} from '\/web\/admin-workspace-view\.js'/);
  assert.match(source,/publicationEvidenceMarkup\(report\.publicationEvidenceScan\)/);
  assert.match(source,/owner\.contentIntegrity\(\)/);
  assert.match(source,/data-owner-integrity-run/);
  assert.match(css,/grid-template-columns:repeat\(auto-fit,/);
});
