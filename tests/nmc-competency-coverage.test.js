import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/nmc-2024-competency-counts.json' with {type:'json'};
import ledger from '../data/competency-evidence-proposals.json' with {type:'json'};
import {SUBJECT_INDEX} from '../src/domain/subject-index.js';
import {validateNmcCompetencyCounts,auditNmcCodedCompetencies} from '../src/domain/nmc-competency-coverage.js';
import {extractNmcCodeIndex,validateNmcCodeIndex} from '../src/domain/nmc-code-extraction.js';
const clone=()=>structuredClone(data);
test('all 19 original NMC 2024 subject counts reconcile to 2781 across three volumes',()=>{
 const c=validateNmcCompetencyCounts();
 assert.equal(c.expectedTotal,2781);
 assert.deepEqual(c.volumeTotals,{I:1139,II:1132,III:510});
 assert.deepEqual(new Set(c.subjects.map(x=>x.subjectId)),new Set(SUBJECT_INDEX.map(x=>x.id)));
 assert.equal(c.subjects.length,19);
 assert.equal(c.subjects.find(x=>x.subjectId==='medicine').expectedCompetencies,525);
 assert.equal(c.subjects.find(x=>x.subjectId==='anatomy').expectedCompetencies,413);
});
test('each source-listed subject must retain exact original source target, not compensating volume totals',()=>{
 const published=[
  ['anatomy','I','AN',82,413],['physiology','I','PY',12,136],
  ['biochemistry','I','BC',14,84],['pharmacology','I','PH',10,92],
  ['pathology','I','PA',35,182],['microbiology','I','MI',11,74],
  ['forensic-medicine','I','FM',14,158],['community-medicine','II','CM',20,136],
  ['medicine','II','GM',29,525],['pediatrics','II','PE',35,406],
  ['psychiatry','II','PS',13,17],['dermatology','II','DE',15,48],
  ['surgery','III','SU',30,133],['ophthalmology','III','OP',10,60],
  ['ent','III','EN',4,63],['obstetrics-gynaecology','III','OG',38,141],
  ['orthopaedics','III','OR',14,40],['anaesthesia','III','AS',11,52],
  ['radiology','III','RT',7,21]
 ];
 assert.deepEqual(data.subjects.map(x=>[x.subjectId,x.volume,x.printedLegend,
  x.expectedTopics,x.expectedCompetencies]),published);
});
test('current coverage is NOT complete: only 8 unverified GM references for 2781 subject-coded',()=>{
 const r=auditNmcCodedCompetencies();
 assert.equal(ledger.competencyProposals.length,8);
 assert.equal(r.candidateMetadataRecords,8);
 assert.equal(r.notYetRecordedAtLeast,2773);
 assert.equal(r.subjects.find(x=>x.subjectId==='medicine').notYetRecordedAtLeast,517);
 assert.equal(r.sourceVerifiedRecords,0);assert.equal(r.canonicallyMapped,0);
 assert.equal(r.coverageFraction,null);assert.equal(r.complete,false);
 assert.equal(r.officialSyllabusCertified,false);assert.equal(r.learnerRelease,false);
 assert.equal(r.globalCompetenciesAudited,false);
 assert.equal(r.aetcomAndSupplementalModulesAudited,false);
});
test('forged subject counts, edition and source reuse rights reject closed',()=>{
 const mutations=[
 s=>s.expectedTotal=2780,
 s=>s.volumeTotals.II=1131,
 s=>s.subjects[0].expectedCompetencies=412,
 s=>s.subjects[1].subjectId='anatomy',
 s=>s.subjects[1].volume='IV',
 s=>s.subjects.pop(),
 s=>s.primaryPdfSha256='0'.repeat(64),
 s=>s.sourceRights='licensed',
 s=>s.globalCompetenciesAudited=true
 ];
 for(const edit of mutations){const v=clone();edit(v);
  assert.throws(()=>validateNmcCompetencyCounts(v),/nmc_competency_coverage_invalid/);}
});
test('PDF transient-code extractor produces IDs/pages, no copyrighted prose',()=>{
 const txt=[
  'GM1.1 Short sample phrase AN 2.3 without exporting source descriptions.\\nGM 1.2\\nCM1.10',
  'GM1.1 more text\\nDR7.1\\nRT 2.11\\nGM1.10'
 ].map(p=>p.replaceAll('\\n','\n'));
 const s=extractNmcCodeIndex(txt,'a'.repeat(64));
 validateNmcCodeIndex(s);
 assert.deepEqual(s.codes.find(x=>x.code==='GM1.1').pages,[1,2]);
 assert.ok(s.codes.some(x=>x.code==='GM1.2'));
 assert.ok(s.codes.some(x=>x.code==='GM1.10'));
 assert.ok(s.codes.some(x=>x.code==='DR7.1'));
 assert.equal(s.pagesParsed,2);
 assert.equal('text' in s,false);
 assert.ok(!JSON.stringify(s).includes('Short sample phrase'));
 const report=auditNmcCodedCompetencies({scan:s});
 assert.equal(report.pdfScan.independentVisualPageReview,false);
 assert.equal(report.publishedCountReconciliationPassed,false);
 assert.ok(report.provisionalCandidatesMissingFromScan.length>0);
 assert.ok(report.extractedUnknownPrintedPrefixes.includes('DR7.1'));
 assert.ok(report.extractedUnknownPrintedPrefixes.includes('RD2.11'));
 assert.equal(report.complete,false);
});
test('cannot launder a fabricated scan or claim verified rights/complete',()=>{
 const real=extractNmcCodeIndex(['GM1.1'],'f'.repeat(64));
 for(const mutation of [
  s=>{s.extractionMethod='official-source-verified';},
  s=>{s.sourceContentStored=true;},
  s=>{s.rightsMode='licensed';},
  s=>{s.codes.push({code:'GM1.1',pages:[1]});},
  s=>{s.documentSha256='invalid';},
  s=>{s.codes[0].pages=[4];}
 ]){const s=structuredClone(real);mutation(s);
   assert.throws(()=>auditNmcCodedCompetencies({scan:s}),/nmc_competency_coverage_invalid/);}
});
