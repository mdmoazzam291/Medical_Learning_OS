// Disposable embedded PostgreSQL integration; no hosted URL or live reviewer.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {validateSourceRowReviewRequest} from '../src/domain/source-row-review.js';
import {preflightInternalSourceRowReviewRequest} from '../src/domain/internal-source-row-review.js';

const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const owner='11111111-1111-4111-8111-111111111111',
 reviewer='22222222-2222-4222-8222-222222222222',
 grant='33333333-3333-4333-8333-333333333333',
 requestId='44444444-4444-4444-8444-444444444444';
const hash=c=>c.repeat(64);
const p={packageId:owner,packageVersion:1,cases:[{
 caseId:'case-a',caseVersion:1,sourceSha256:hash('a'),sourceEdition:'source-A',
 appearance:{pdfPage:1,rowOrdinal:2,rotation:0,bboxMilliPoints:[0,0,50,50],rawCellSha256:hash('b')},
 interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:hash('c')}
}]};
const m=await digestSourceRowPackage(p);
const claim=m.cases[0];
const request=validateSourceRowReviewRequest({
 requestId,targetType:'source-row-case',packageId:owner,
 packageVersion:1,packageDigest:m.packageDigest,
 caseId:'case-a',caseVersion:1,caseDigest:claim.caseDigest,
 appearanceEvidenceDigest:claim.appearanceEvidenceDigest,
 sourceSha256:claim.sourceSha256,disposition:'retain-unresolved',
 rationale:'The source row needs independent confirmation before mapping.',
 attestationVersion:'source-row-review-v1'
});
assert.equal((await preflightInternalSourceRowReviewRequest(p,m.packageDigest,request)).decisionRecorded,false);
const db=new PGlite(),record='select evidence_internal.record_review($1,$2::jsonb,$3) r',
 read='select evidence_internal.read_review($1,$2) r';
const run=async(actor,q=request,g=grant)=>(await db.query(record,[actor,JSON.stringify(q),g])).rows[0].r;
const lookup=async(actor=reviewer,rid=requestId)=>(await db.query(read,[actor,rid])).rows[0].r;
const fail=async promise=>assert.rejects(promise,/internal_review_|permission denied/);
const role=async name=>db.exec('set role '+name);
try{
 await db.exec('create role anon;create role authenticated;create role service_role;');
 const sql=await readFile(new URL('../ops/prototypes/source-evidence/internal-review.sql',import.meta.url),'utf8');
 await db.exec(sql);
 await db.query('insert into evidence_internal.packages values($1,1,$2,$3,true,true,true)',[owner,m.packageDigest,owner]);
 await db.query('insert into evidence_internal.cases values($1,1,$2,$3,1,$4,$5,$6)',[
  owner,m.packageDigest,'case-a',claim.caseDigest,claim.appearanceEvidenceDigest,claim.sourceSha256
 ]);
 await db.query('insert into evidence_internal.grants values($1,$2,$3,1,$4,$5,true,true,true,true)',[
  grant,reviewer,owner,m.packageDigest,'case-a'
 ]);
 for(const deniedRole of ['anon','authenticated','service_role']){
  await role(deniedRole);
  await fail(run(reviewer));
  await fail(db.query('select * from evidence_internal.decisions'));
  await db.exec('reset role');
 }
 await role('evidence_internal_gateway');
 await fail(db.query('select * from evidence_internal.decisions'));
 await fail(db.query("update evidence_internal.grants set active=false"));
 await fail(db.query("select evidence_internal.guard($1,$2::jsonb,$3)",[
  reviewer,JSON.stringify(request),grant
 ]));
 await fail(run(owner));
 await fail(run(reviewer,{...request,learnerRelease:true}));
 await fail(run(reviewer,{...request,caseDigest:hash('d')}));
 await fail(run(reviewer,{...request,disposition:'publish-now'}));
 await fail(run(reviewer,{...request,requestId:'not-uuid'}));
 const first=await run(reviewer);
 assert.equal(first.contractId,'internal-source-row-decision-event-v1');
 assert.equal(first.reviewerId,reviewer);
 assert.equal(first.grantEventId,grant);
 assert.equal(first.sourceReviewOnly,true);
 assert.equal(first.clinicalApproved,false);
 assert.equal(first.rightsApproved,false);
 assert.equal(first.examScopeApproved,false);
 assert.equal(first.learnerRelease,false);
 assert.deepEqual(first.request,request);
 assert.equal((await run(reviewer)).decisionId,first.decisionId,
  'exact retry returns same persisted decision ID');
 assert.deepEqual(await lookup(),first,'protected readback must equal original');
 await fail(run(reviewer,{...request,rationale:'The reviewed interpretation has changed since the original request.'}));
 await fail(lookup(owner));
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::integer n from evidence_internal.decisions')).rows[0].n,1);
 await fail(db.query('delete from evidence_internal.decisions'));
 await db.query('update evidence_internal.grants set active=false where grant_event_id=$1',[grant]);
 await role('evidence_internal_gateway');
 await fail(run(reviewer));
 await fail(lookup());
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::integer n from evidence_internal.decisions')).rows[0].n,1,
  'revocation does not erase immutable decision history');
 // Fixture re-enable demonstrates a new authority read; production grant
 // reactivation would require separately audited immutable grant history.
 await db.query('update evidence_internal.grants set active=true where grant_event_id=$1',[grant]);
 await role('evidence_internal_gateway');
 assert.deepEqual(await lookup(),first);
 await db.exec('reset role');
 await db.query('update evidence_internal.packages set active=false where package_id=$1',[owner]);
 await role('evidence_internal_gateway');
 await fail(lookup());await fail(run(reviewer));
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::integer n from evidence_internal.decisions')).rows[0].n,1);
 console.log('Internal source review disposable SQL PASS: isolated gateway role, independent actor, scoped case/source grant, immutable idempotent decision, protected readback, exact conflict and revocation/withdrawal denial.');
}finally{
 try{await db.exec('reset role');}catch{}
 await db.close();
}
