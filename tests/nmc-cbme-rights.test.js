import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import register from '../data/nmc-cbme-rights-register.json' with {type:'json'};
import ledger from '../data/competency-evidence-proposals.json' with {type:'json'};
import {validateNmcRightsRegister,nmcCitationOnlyPreflight} from '../src/domain/nmc-cbme-rights.js';
import {competencyEvidencePreflight} from '../src/domain/competency-evidence.js';
const clone=()=>structuredClone(register);
test('2019/2023/2024 curriculum editions remain distinct, citation-only, no permission implied',()=>{
 const v=validateNmcRightsRegister(register);
 assert.equal(v.sourceRecords.length,3);
 assert.equal(nmcCitationOnlyPreflight().reusableFullTextAllowed,false);
 assert.ok(v.sourceRecords.every(s=>s.rightsMode==='citation_only'&&s.reusePermission==='not-recorded'&&
  s.rawDocumentStored===false&&s.documentSha256===null&&s.publicRedistributionAllowed===false));
});
test('denies fabricated copyright license or PDF byte digest, source publication or removed historical edition',()=>{
 for(const change of [
  s=>{s.sourceRecords[2].reusePermission='granted';},
  s=>{s.sourceRecords[2].rightsMode='licensed';},
  s=>{s.sourceRecords[2].rawDocumentStored=true;},
  s=>{s.sourceRecords[2].documentSha256='f'.repeat(64);},
  s=>{s.sourceRecords[2].publicRedistributionAllowed=true;},
  s=>{s.sourceRecords[0].sourceId='not-real';},
  s=>{s.sourceRecords[2].visualFileVerified=true;}
 ]){const s=clone();change(s);assert.throws(()=>validateNmcRightsRegister(s),/nmc_source_rights_unresolved/);}
});
test('Medicine pilot stores code/locator and independent short index, not protected curriculum text',()=>{
 const q=ledger.competencyProposals;assert.deepEqual(q.map(s=>s.competencyCode),
   ['GM1.1','GM1.2','GM1.3','GM1.4','GM1.5','GM1.6','GM1.7','GM1.8']);
 assert.ok(q.every(s=>s.documentPage===280&&s.analystSummary.length<=160&&
  s.analystSummary.startsWith('Independent index: ')&&
  s.sourceLocator.includes('visual confirmation pending')&&s.examHypotheses.length===0));
 const report=competencyEvidencePreflight();
 assert.equal(report.copyrightProtected,true);assert.equal(report.documentBytesVerified,false);
 assert.equal(report.sourceFullTextReuseAllowed,false);assert.equal(report.sourceVerified,0);
 assert.equal(report.approvedExamMappings,0);assert.equal(report.learnerRelease,false);
});
test('Source register and intake ledger are not statically shipped in learner Pages bundle',()=>{
 const source=readFileSync(new URL('../scripts/public-surface.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/'data\/nmc-cbme-rights-register.json'/);
 assert.doesNotMatch(source,/'data\/competency-evidence-proposals.json'/);
 assert.doesNotMatch(source,/'src\/domain\/nmc-cbme-rights.js'/);
 assert.doesNotMatch(source,/'src\/domain\/competency-evidence.js'/);
});
