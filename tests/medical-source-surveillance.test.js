import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourceWatchReport, validateSourceSighting } from '../src/domain/medical-source-surveillance.js';

const source={sourceId:'guideline:alpha',title:'Synthetic Reference',url:'https://example.org/reference',
  version:'2025 edition',evidence:'fictional fixture'};
const item=(questionId,status,sourceIds=[source.sourceId])=>({questionId,questionVersionId:questionId+'@v1',status,sourceIds});
const note=(id,status,sourceIds=[source.sourceId])=>({id,status,source_ids:sourceIds});
const empty=()=>({catalogVersion:407,catalog:{sources:[],questions:[]},notes:[],observations:[]});
const versionInput=(overrides={})=>({
  requestId:'a7e992ea-8c46-4c79-9cd6-54b01a043a1d',sourceId:source.sourceId,
  catalogVersion:408,kind:'version_seen',observedVersion:'2026 revision',
  evidenceUrl:'https://example.org/reference/changelog',
  evidenceNote:'An owner noticed a different revision identifier in the official changelog.',
  ...overrides
});
const observation=(overrides={})=>({
  id:'rec1',source_id:source.sourceId,cited_version:source.version,kind:'version_seen',
  observed_version:'2026 revision',evidence_url:'https://example.org/updated',
  evidence_note:'Owner supplied source evidence, not verified.',recorded_at:'2026-10-12T12:00:00Z',...overrides
});

test('empty post-reset catalog has no fake source-change alerts or web monitoring',()=>{
  const report=buildSourceWatchReport(empty());
  assert.equal(report.contractId,'owner-medical-source-watch-v1');
  assert.equal(report.catalogVersion,407);
  assert.equal(report.sources.length,0);
  assert.equal(report.sourcesWithSightings,0);
  assert.equal(report.pendingVerification,0);
  assert.equal(report.automatedWebChecks,false);
  assert.equal(report.medicalUpdateVerified,false);
  assert.equal(report.clinicalApprovalGranted,false);
});
test('without official sighting does not assert sources are current or verified',()=>{
  const x=empty();x.catalog.sources=[source];x.catalog.questions=[item('Q1','published')];
  const report=buildSourceWatchReport(x);
  assert.equal(report.sources[0].status,'not_monitored');
  assert.equal(report.pendingVerification,0);
  assert.deepEqual(report.sources[0].affected.publishedQuestionVersions,['Q1@v1']);
});
test('version-bound sightings identify exact published/in-review question and note versions',()=>{
  const x=empty();x.catalogVersion=408;x.catalog.sources=[source];
  x.catalog.questions=[item('Q1','published'),item('Q2','in_review'),item('Q3','draft')];
  x.notes=[note('N1','published'),note('N2','in_review'),note('N3','draft')];
  x.observations=[observation()];
  const r=buildSourceWatchReport(x),a=r.sources[0];
  assert.equal(a.status,'possible_version_change');
  assert.deepEqual(a.affected.publishedQuestionVersions,['Q1@v1']);
  assert.deepEqual(a.affected.inReviewQuestionVersions,['Q2@v1']);
  assert.deepEqual(a.affected.publishedNoteVersions,['N1']);
  assert.deepEqual(a.affected.inReviewNoteVersions,['N2']);
  assert.equal(a.affectedCount,4);
  assert.equal(r.pendingVerification,1);
  assert.ok(!JSON.stringify(r).includes('answerOptionId'),'question answers never leave the owner diagnostic projection');
});
test('source retirement is possible, not proven; superseded cited versions are excluded',()=>{
  const x=empty();x.catalog.sources=[source];x.observations=[
    observation({id:'old',cited_version:'2024 edition',recorded_at:'2026-10-13T01:00:00Z'}),
    observation({id:'new',kind:'source_retired',observed_version:null,recorded_at:'2026-10-12T11:00:00Z'})
  ];
  const r=buildSourceWatchReport(x);
  assert.equal(r.sources[0].status,'possible_retirement');
  assert.equal(r.sources[0].sighting.id,'new');
  assert.equal(r.unmatchedHistoricalSightings,1);
  assert.equal(r.pendingVerification,0);
});
test('latest observation for same cited version wins and never overwrites history',()=>{
  const x=empty();x.catalog.sources=[source];x.observations=[
    observation({id:'earlier',observed_version:'2026a',recorded_at:'2026-10-10T11:00:00Z'}),
    observation({id:'later',observed_version:'2026b',recorded_at:'2026-10-12T12:00:00Z'})
  ];
  assert.equal(buildSourceWatchReport(x).sources[0].sighting.observedVersion,'2026b');
});
test('known current source, official HTTPS evidence, different version and 20-char rationale required',()=>{
  const row=validateSourceSighting(versionInput(),[source]);
  assert.equal(row.source_id,source.sourceId);
  assert.equal(row.cited_version,'2025 edition');
  assert.equal(row.observed_version,'2026 revision');
  assert.equal(row.kind,'version_seen');
  assert.equal(row.catalog_version,408);
  const retired=validateSourceSighting(versionInput({kind:'source_retired',observedVersion:null}),[source]);
  assert.equal(retired.observed_version,null);
  const bad=[
    versionInput({sourceId:'unknown'}),
    versionInput({observedVersion:'2025 edition'}),
    versionInput({observedVersion:''}),
    versionInput({evidenceUrl:'http://localhost/private'}),
    versionInput({evidenceUrl:'https://user:pass@example.org/private'}),
    versionInput({evidenceNote:'too short'}),
    versionInput({kind:'source_retired',observedVersion:'other'}),
    versionInput({kind:'unexpected'}),
    versionInput({requestId:'not-a-uuid'}),
    versionInput({catalogVersion:'408'}),
    {...versionInput(),medicalApproved:true}
  ];
  for(const invalid of bad) assert.throws(()=>validateSourceSighting(invalid,[source]));
});
test('snapshot and duplicate-ID inconsistencies fail closed',()=>{
  assert.throws(()=>buildSourceWatchReport({catalogVersion:407,catalog:{sources:[],questions:[]},notes:[]}),/snapshot_incomplete/);
  const x=empty();x.catalog.sources=[source,source];
  assert.throws(()=>buildSourceWatchReport(x),/catalog_invalid/);
});
test('API authorizes before privileged reads; sightings are not clinical approvals',async()=>{
  const {readFileSync}=await import('node:fs');
  const api=readFileSync(new URL('../supabase/functions/owner-api/index.ts',import.meta.url),'utf8');
  const line=api.indexOf('path === "/source-watch"');
  assert.ok(line>api.indexOf('content_admin_status_v1'),'owner permission is established first');
  assert.match(api,/source_watch_stale_catalog/);
  assert.match(api,/source_watch_snapshot_incomplete/);
  assert.match(api,/owner-medical-source-sighting-receipt-v1/);
  assert.match(api,/reusedExisting: true, clinicalApprovalGranted: false/);
  assert.match(api,/source_watch_request_conflict/);
});
