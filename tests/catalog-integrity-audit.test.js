import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCanonicalCatalog } from '../src/domain/catalog-integrity-audit.js';

const c = { conceptId: 'c1', label: 'Synthetic concept', aliases: [], subjectTags: ['medicine'] };
const s = { sourceId: 's1', title: 'Synthetic source', evidence: 'test only' };
const q = (questionId, extra = {}) => ({
  questionId, questionVersionId: questionId+'@1', status: 'published',
  stem: 'Synthetic management choice?', options: [
    { optionId:'a', text:'Synthetic alpha' }, { optionId:'b', text:'Synthetic beta' }
  ], answerOptionId: 'a',
  conceptLinks: [{conceptId:'c1',role:'primary'}], sourceIds:['s1'], ...extra
});
const base = () => ({
  catalogVersion: 407,
  catalog: {schemaVersion:1,concepts:[],sources:[],questions:[]},
  notes: [], links: [], questionMetadata: [], conceptMetadata: []
});

test('empty post-reset canonical catalog audits without reviving erased medical pilots',()=>{
  const report = auditCanonicalCatalog(base());
  assert.equal(report.contractId,'owner-catalog-integrity-v1');
  assert.equal(report.catalogVersion,407);
  assert.equal(report.emptyCatalog,true);
  assert.equal(report.findingCount,0);
  assert.equal(report.clinicalAccuracyVerified,false);
  assert.equal(report.rightsVerified,false);
  assert.equal(report.crossTableAtomicSnapshot,false);
});

test('finds exact canonical duplicates, conflicting answers and multiple published versions',()=>{
  const x=base(); x.catalog.concepts=[c]; x.catalog.sources=[s];
  x.catalog.questions=[q('q1'),q('q2',{answerOptionId:'b'}),q('q1',{questionVersionId:'q1@2'})];
  const report=auditCanonicalCatalog(x);
  assert.equal(report.byCode.canonical_answer_conflict,1);
  assert.equal(report.byCode.multiple_published_versions,1);
  assert.equal(report.byCode.canonical_duplicate_family,undefined);
  assert.equal(report.totals.publishedQuestions,3);
});

test('checks graph IDs, stale question-version bindings, note links and orphan metadata',()=>{
  const x=base();x.catalog.concepts=[c];x.catalog.sources=[s];
  x.catalog.questions=[
    q('q1'),
    q('q2',{stem:'Distinct synthetic prompt?',conceptLinks:[{conceptId:'missing',role:'primary'}],sourceIds:['gone']})
  ];
  x.notes=[
    {id:'n1',concept_id:'c1',status:'published',source_ids:['s1']},
    {id:'n2',concept_id:'not-catalogued',status:'published',source_ids:['gone'],supersedes_id:'missing-note'}
  ];
  x.links=[{note_version_id:'n1',question_id:'q1'}, {note_version_id:'missing-note',question_id:'q2'}, {note_version_id:'n2',question_id:'not-a-question'}];
  x.questionMetadata=[
    {question_id:'q1',concept_links_version_id:'q1@old',origins:[]},
    {question_id:'orphan-q',origins:[]}
  ];
  x.conceptMetadata=[{concept_id:'orphan-concept'}];
  const r=auditCanonicalCatalog(x);
  for(const key of ['missing_question_concept','missing_question_source','missing_note_concept','missing_note_source',
    'missing_note_link_target','missing_question_link_target','published_note_without_question','missing_note_predecessor',
    'stale_question_graph_binding','orphan_question_metadata','orphan_concept_metadata']) {
    assert.ok(r.byCode[key]>=1,key);
  }
  assert.equal(r.scanComplete,true);
  assert.ok(!JSON.stringify(r).includes('Synthetic management choice?'),'audit must not expose question stems');
});

test('PYQ repetition is a metadata warning, while cross-platform provenance is preserved',()=>{
  const x=base();x.catalog.concepts=[c];x.catalog.sources=[s];x.catalog.questions=[q('q1')];
  const pyq={kind:'pyq',examId:'neet-pg',year:2026,session:'main',evidence:'unverified declaration'};
  x.questionMetadata=[{question_id:'q1',origins:[pyq,{...pyq},
    {kind:'platform',platformId:'marrow',edition:'v1',evidence:'also declared'}]}];
  const r=auditCanonicalCatalog(x);
  assert.equal(r.byCode.repeated_pyq_occurrence,1);
  assert.equal(r.byCode.canonical_duplicate_family,undefined);
});

test('fails closed on incomplete structure or unknown version instead of reporting zero problems',()=>{
  assert.throws(()=>auditCanonicalCatalog({catalogVersion:407,catalog:{concepts:[],sources:[],questions:[]},notes:[],links:[],questionMetadata:[]}),/integrity_snapshot_incomplete/);
  assert.throws(()=>auditCanonicalCatalog({...base(),catalogVersion:null}),/integrity_snapshot_incomplete/);
});

test('bounded presentation prioritizes critical findings even after 120 low-priority findings',()=>{
  const x=base();
  x.catalog.concepts=[c];x.catalog.sources=[s];
  x.conceptMetadata=Array.from({length:140},(_,i)=>({concept_id:'absent'+i}));
  x.catalog.questions=[q('q1',{conceptLinks:[{conceptId:'does-not-exist',role:'primary'}]})];
  const report=auditCanonicalCatalog(x);
  assert.equal(report.findings.length,120);
  assert.equal(report.findingsTruncated,true);
  assert.equal(report.findings[0].severity,'critical');
  assert.equal(report.byCode.orphan_concept_metadata,140);
});

test('owner endpoint requires verified authorization before reading full catalog and emits only audit',async()=>{
  const {readFileSync}=await import('node:fs');
  const src=readFileSync(new URL('../supabase/functions/owner-api/index.ts',import.meta.url),'utf8');
  assert.ok(src.indexOf('content_admin_status_v1')<src.indexOf('path === "/content-integrity"'));
  assert.match(src,/if \(url\.search\) fail\(400, "query_not_supported"\)/);
  assert.match(src,/integrity_snapshot_incomplete/);
  assert.match(src,/integrity_catalog_changed_retry/);
  assert.doesNotMatch(src,/path === "\/content-integrity"[\s\S]*?return response\(req, 200, first\.body\)/);
});
