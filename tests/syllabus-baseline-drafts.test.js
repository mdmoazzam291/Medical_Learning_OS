import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBaselineDraft,previewBaselineDraft} from '../src/domain/syllabus-baseline-drafts.js';
const registry={registryVersion:'pg-preparation:foundation@1',pathways:[{pathwayVersionId:'neet-pg:preparation@1',status:'active'}]};
const example=()=>({schemaVersion:1,requestId:'11111111-1111-4111-8111-111111111111',baselineId:null,expectedDigest:null,document:{
 label:'Partial synthetic checklist',pathwayVersionId:'neet-pg:preparation@1',sourceKind:'historical',
 sourceLocator:'Synthetic documented scope locator',sourceVersion:'fixture@1',scopeDeclaration:'partial',
 conceptIds:['one','two'],changeReason:'Track proposed synthetic concept scope'}});
test('draft baseline demands explicit pathway, source and declared scope without approval metadata',()=>{
 assert.deepEqual(validateBaselineDraft(example(),registry),example());
 for(const change of [{status:'approved'},{acceptedBy:'forged'},{document:{...example().document,conceptIds:['one','one']}},{document:{...example().document,sourceLocator:''}},
 {document:{...example().document,pathwayVersionId:'unknown'}},{document:{...example().document,scopeDeclaration:'official-approved'}}])
 assert.throws(()=>validateBaselineDraft({...example(),...change},registry),/syllabus_baseline_invalid/);
});
test('preview is descriptive, denies stale snapshots and never produces a syllabus coverage percentage',()=>{
 const v={baselineId:'a',revision:1,catalogVersion:4,document:example().document};
 const snap={registryVersion:registry.registryVersion,catalogVersion:4,concepts:[{conceptId:'one'},{conceptId:'two'}],
 questions:[{status:'published',conceptLinks:[{conceptId:'one',role:'primary'}]}],notes:[{status:'published',conceptId:'one'}]};
 const p=previewBaselineDraft(v,snap,registry.registryVersion);
 assert.equal(p.status,'proposed-checklist-only');assert.equal(p.coverageFraction,null);assert.equal(p.officialCompleteness,null);
 assert.deepEqual(p.noDirectPublishedAssessment,['two']);assert.deepEqual(p.noStoredPublishedNotes,['two']);
 assert.equal(previewBaselineDraft(v,{...snap,catalogVersion:5},registry.registryVersion).status,'unavailable');
 assert.equal(previewBaselineDraft({...v,document:{...v.document,conceptIds:['not-canonical']}},snap,registry.registryVersion).status,'unavailable');
});
