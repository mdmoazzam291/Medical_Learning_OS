// Disposable synthetic acceptance only; never reads/writes hosted data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {digestCanonical} from '../src/domain/canonical-integrity.js';
import {restoreSourceEvidenceSnapshot} from './lib/source-evidence-sql-snapshot.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {createSourceEvidenceSqlDriver} from './lib/source-evidence-sql-driver.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const owner='11111111-1111-4111-8111-111111111111';
async function candidate(version=1){const p={packageId:owner,packageVersion:version,cases:[{caseId:'recovery-case',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'synthetic-2026',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};return {...p,requestId:crypto.randomUUID(),expectedPackageDigest:(await digestSourceRowPackage(p)).packageDigest};}
const target=c=>({packageId:c.packageId,packageVersion:c.packageVersion,packageDigest:c.expectedPackageDigest});
const denied=r=>{assert.equal(r.status,'denied');assert.equal(Object.hasOwn(r,'receipt'),false);};
const create=options=>createSourceEvidenceSqlDriver({PGlite,...options});
{
 const d=await create(),c=await candidate();
 try{
  assert.equal((await d.stageMetadata(c,owner)).status,'accepted');const before=await d.inspect();
  await d.withdraw(target(c));denied(await d.stageMetadata(c,owner));denied(await d.readMetadata(c,owner));
  assert.deepEqual(await d.inspect(),before,'withdrawal preserves evidence/request/event history');
  await d.withdraw(target(c));assert.equal((await d.withdrawalHistory()).length,1);
  const newer=await candidate(2);assert.equal((await d.stageMetadata(newer,owner)).status,'accepted');
  await assert.rejects(d.withdraw({...target(newer),packageDigest:'f'.repeat(64)}));
  console.log('Withdrawal PASS: exact target, immutable history, denied retries/reads, version isolation.');
 }finally{await d.close();}
}
for(const fault of ['deny-before-readback','metadata-deny-before-readback','withdraw-before-readback']){
 const d=await create(),c=await candidate();try{
  d.inject(fault);denied(await d.stageMetadata(c,owner));const state=await d.inspect();assert.equal(state.requests.length,1);assert.equal(state.revisions.length,1);assert.equal(state.events.length,1);
  denied(await d.stageMetadata(c,owner));denied(await d.readMetadata(c,owner));
  console.log('Postcommit denial PASS: '+fault+', no receipt, committed evidence retained.');
 }finally{await d.close();}
}
for(const state of ['allowed','account-denied','policy-denied','withdrawn']){
 const source=await create(),c=await candidate();let restored;
 try{
  const accepted=await source.stageMetadata(c,owner);assert.equal(accepted.status,'accepted');
  if(state==='account-denied')await source.deny();
  if(state==='policy-denied'){source.inject('metadata-deny-before-readback');denied(await source.stageMetadata(c,owner));}
  if(state==='withdrawn')await source.withdraw(target(c));
  const expectedState=await source.inspect(),snapshot=await source.exportSnapshot(),expected=snapshot.snapshotDigest;
  if(state==='allowed')assert.equal((await source.stageMetadata(await candidate(9),owner)).status,'accepted','later source writes do not mutate snapshot');
  restored=await create({snapshot,expectedSnapshotDigest:expected});
  assert.deepEqual(await restored.inspect(),expectedState);
  assert.equal((await restored.exportSnapshot()).snapshotDigest,expected,'all table payloads round-trip exactly');
  assert.deepEqual(await restored.withdrawalHistory(),await source.withdrawalHistory());
  assert.deepEqual(await restored.checkBrowserIsolation(),{anon:true,authenticated:true});
  if(state==='allowed'){
   assert.deepEqual(await restored.stageMetadata(c,owner),accepted);
   assert.equal((await restored.stageMetadata(await candidate(2),owner)).status,'accepted','identity sequence continues after restore');
  }else{denied(await restored.stageMetadata(c,owner));denied(await restored.readMetadata(c,owner));}
  const corrupt=structuredClone(snapshot);corrupt.tables.withdrawals='[] ';
  if(state==='withdrawn'){const {snapshotDigest,...body}=corrupt;corrupt.snapshotDigest=(await digestCanonical(body)).digestHex;}
  await assert.rejects(create({snapshot:corrupt,expectedSnapshotDigest:expected}));
  const missing=structuredClone(snapshot);delete missing.tables.authority;await assert.rejects(create({snapshot:missing,expectedSnapshotDigest:expected}));
  if(state==='allowed'){
   for(const field of ['cases','authority','orphan-event']){
    const bad=structuredClone(snapshot);
    if(field==='cases'){const records=JSON.parse(bad.tables.cases);records[0].claim.caseVersion=999;bad.tables.cases=JSON.stringify(records);}
    else if(field==='authority')bad.tables.authority='[]';
    else{const records=JSON.parse(bad.tables.events);records.push({id:999,actor:null,request_id:null});bad.tables.events=JSON.stringify(records);}
    const {snapshotDigest,...body}=bad;bad.snapshotDigest=(await digestCanonical(body)).digestHex;
    await assert.rejects(create({snapshot:bad,expectedSnapshotDigest:bad.snapshotDigest}),'rehash cannot hide internal binding corruption');
   }
   const db=new PGlite();try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    for(const file of ['schema.sql','digests.sql'])await db.exec(await readFile(new URL('../ops/prototypes/source-evidence/'+file,import.meta.url),'utf8'));
    await assert.rejects(restoreSourceEvidenceSnapshot(db,snapshot,expected,{failAfterTable:'revisions'}),/injected_restore_failure/);
    for(const table of Object.keys(snapshot.tables))assert.equal((await db.query('select count(*)::int n from evidence_probe.'+table)).rows[0].n,0,'failed restore rolls back '+table);
    await restoreSourceEvidenceSnapshot(db,snapshot,expected);
    await assert.rejects(restoreSourceEvidenceSnapshot(db,snapshot,expected),'nonempty target is never overwritten');
   }finally{await db.close();}
  }
  console.log('Restore PASS: '+state+', history/ACL preserved, corruption/omission denied.');
 }finally{await source.close();if(restored)await restored.close();}
}
