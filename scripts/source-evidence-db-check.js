// Disposable-only SQL prototype check. Never connects to hosted databases.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalize,digestCanonical} from '../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../src/domain/source-evidence-staging.js';
import {resolveSourceEvidenceCase} from '../src/domain/source-evidence-resolution.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite(),actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const claim=(id,hash)=>({caseId:id,caseVersion:1,sourceSha256:hash.repeat(64),sourceEdition:'synthetic',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}});
const candidate=()=>({packageId:crypto.randomUUID(),packageVersion:1,cases:[claim('a','a'),claim('b','d')]});
async function envelope(p,requestId=crypto.randomUUID(),user=actor){
 const m=await digestSourceRowPackage(p),c={requestId,...p,expectedPackageDigest:m.packageDigest},b=await prepareSourceEvidenceStagingRequest(c,user);
 const {packageDigest,...manifest}=m,manifestDoc={contractId:'source-row-package-evidence-v1',...manifest};
 const r={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
 const receipt={...r,receiptDigest:(await digestCanonical(r)).digestHex};
 return {p,c,b,receipt,args:[user,canonicalize(p),canonicalize(manifestDoc),b,canonicalize(r),canonicalize(receipt)]};
}
const stage=async(e,fault=null)=>(await db.query('select evidence_probe.stage($1,$2,$3,$4,$5,$6,$7) result',[...e.args,fault])).rows[0].result;
try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../ops/prototypes/source-evidence/schema.sql',import.meta.url),'utf8'));
 await db.query('select evidence_probe.set_authority($1,true)',[actor]);
 await db.exec("select evidence_probe.set_source_policy(repeat('a',64),'synthetic',true);select evidence_probe.set_source_policy(repeat('d',64),'synthetic',true)");
 await db.exec('set role service_role');
 const e=await envelope(candidate()),first=await stage(e);assert.equal(first.status,'committed');
 assert.equal(await matchesSourceEvidenceStagingReceipt(first.receipt,e.b),true);
 assert.deepEqual(await stage(e),first);
 const badManifest={...e,args:[...e.args]};badManifest.args[2]+=' ';await assert.rejects(stage(badManifest),/evidence_invalid/);
 const badReceipt={...e,args:[...e.args]};badReceipt.args[4]+=' ';await assert.rejects(stage(badReceipt),/evidence_invalid/);
 const approved={...e.receipt,clinicalApproved:true};delete approved.receiptDigest;
 const payload=canonicalize(approved),badApproval={...e,args:[...e.args]};badApproval.args[4]=payload;badApproval.args[5]=canonicalize({...approved,receiptDigest:(await digestCanonical(approved)).digestHex});await assert.rejects(stage(badApproval),/evidence_invalid/);
 // Rehash malformed receipts so checksum failure cannot hide schema-validation gaps.
 for(const mutate of [r=>({...r,extra:true}),r=>{const x={...r};delete x.recordedAt;return x;},r=>({...r,receiptId:'bad'}),r=>({...r,recordedAt:'2026-02-30T00:00:00.000Z'}),r=>({...r,recordedAt:'2026-10-31T00:00:00Z'}),r=>({...r,recordedAt:null})]){
  const {receiptDigest:ignored,...base}=e.receipt,payload=mutate(base),bad={...e,args:[...e.args]};bad.args[4]=canonicalize(payload);bad.args[5]=canonicalize({...payload,receiptDigest:(await digestCanonical(payload)).digestHex});await assert.rejects(stage(bad),/evidence_invalid/);
 }
 for(const mutate of [p=>({...p,extra:1}),p=>({...p,cases:p.cases.map(x=>({...x,caseVersion:0}))}),p=>({...p,cases:[{...p.cases[0],appearance:{...p.cases[0].appearance,bboxMilliPoints:[0,0,0,1]}}]}),p=>({...p,cases:[{...p.cases[0],interpretation:{...p.cases[0].interpretation,relation:'approved'}}]}),p=>({...p,cases:[p.cases[0],p.cases[0]]}),p=>({...p,cases:[{...p.cases[0],sourceEdition:null}]})]){
  const bad={...e,args:[...e.args]};bad.args[1]=canonicalize(mutate(structuredClone(e.p)));await assert.rejects(stage(bad),/evidence_invalid/);
 }
 for(const key of Object.keys(e.receipt).filter(k=>k!=='receiptDigest')){
  const payload={...e.receipt};delete payload.receiptDigest;delete payload[key];const bad={...e,args:[...e.args]};bad.args[4]=canonicalize(payload);bad.args[5]=canonicalize({...payload,receiptDigest:(await digestCanonical(payload)).digestHex});await assert.rejects(stage(bad),/evidence_invalid/);
 }
 for(const [utc,valid] of [['0000-02-29T00:00:00.000Z',true],['2000-02-29T23:59:59.999Z',true],['1900-02-29T00:00:00.000Z',false],['2026-01-01T24:00:00.000Z',false]])assert.equal((await db.query('select evidence_probe.valid_utc($1::jsonb) v',[JSON.stringify(utc)])).rows[0].v,valid);
 const aliasPackage={...candidate(),packageId:'a1111111-1111-4111-8111-111111111111'};await stage(await envelope(aliasPackage));await assert.rejects(stage(await envelope({...aliasPackage,packageId:aliasPackage.packageId.toUpperCase()})),/evidence_conflict/);
 const missingPolicy=candidate();missingPolicy.cases[0].sourceSha256='f'.repeat(64);await assert.rejects(stage(await envelope(missingPolicy)),/evidence_denied/);
 const inspect=async(e,user=actor)=>(await db.query('select evidence_probe.readback($1,$2,$3,$4,$5) result',[user,e.b.packageId,e.b.packageVersion,e.b.packageDigest,e.b.requestId])).rows[0].result;
 const stored=await inspect(e),saved=JSON.parse(stored.candidate),manifest=await digestSourceRowPackage(saved);
 assert.equal(manifest.packageDigest,e.b.packageDigest);assert.equal(stored.manifest,e.args[2]);assert.deepEqual(JSON.parse(stored.receipt),first.receipt);
 const selected=manifest.cases[1];const resolved=await resolveSourceEvidenceCase(saved,{packageId:manifest.packageId,packageVersion:manifest.packageVersion,packageDigest:manifest.packageDigest,caseId:selected.caseId,caseVersion:selected.caseVersion,caseDigest:selected.caseDigest,appearanceEvidenceDigest:selected.appearanceEvidenceDigest});
 assert.equal(resolved.sourceSha256,'d'.repeat(64));assert.equal(resolved.bytesVerified,false);
 const changed=structuredClone(e.p);changed.cases[0].caseVersion++;
 await assert.rejects(stage(await envelope(changed,e.b.requestId)),/evidence_conflict/);
 await assert.rejects(stage(await envelope(changed)),/evidence_conflict/);
 const newer=await envelope({...e.p,packageVersion:2});await stage(newer);assert.deepEqual(await inspect(e),stored);
 await assert.rejects(inspect({...e,b:{...e.b,packageVersion:3}}),/evidence_denied/);
 await assert.rejects(inspect({...e,b:{...e.b,packageDigest:'f'.repeat(64)}}),/evidence_denied/);
 await assert.rejects(inspect(e,other),/evidence_denied/);
 await assert.rejects(stage({...e,args:[other,...e.args.slice(1)]}),/evidence_denied/);
 // A second enabled owner must still be isolated from another owner's package.
 await db.exec('reset role');await db.query('select evidence_probe.set_authority($1,true)',[other]);await db.exec('set role service_role');
 await assert.rejects(inspect(e,other),/evidence_denied/);
 await assert.rejects(stage(await envelope(e.p,e.b.requestId,other)),/evidence_denied/);
 await assert.rejects(stage(await envelope(e.p,crypto.randomUUID(),other)),/evidence_denied/);
 await assert.rejects(stage(await envelope({...e.p,packageVersion:3},crypto.randomUUID(),other)),/evidence_denied/);
 for(const fault of ['after-revision','after-cases','after-request','after-event']){
  const v=await envelope(candidate());await assert.rejects(stage(v,fault),/injected_failure/);
  for(const table of ['packages','revisions','cases','requests'])assert.equal((await db.query(`select count(*)::int n from evidence_probe.${table} where package_id=$1`,[v.b.packageId])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from evidence_probe.events where request_id=$1',[v.b.requestId])).rows[0].n,0);
  await stage(v);
 }
 await assert.rejects(db.exec('update evidence_probe.revisions set digest=digest'),/permission denied/);
 for(const role of ['anon','authenticated']){
  await db.exec(`reset role;set role ${role}`);
  await assert.rejects(db.exec('select * from evidence_probe.revisions'),/permission denied/);
  await assert.rejects(stage(e),/permission denied/);
  await assert.rejects(inspect(e),/permission denied/);
 }
 await db.exec('reset role');
 await db.exec("select evidence_probe.set_source_policy(repeat('d',64),'synthetic',false)");await db.exec('set role service_role');
 await assert.rejects(stage(e),/evidence_denied/);await assert.rejects(inspect(e),/evidence_denied/);
 await db.exec("reset role;select evidence_probe.set_source_policy(repeat('d',64),'synthetic',true);set role service_role");assert.deepEqual(await stage(e),first);
 await db.exec("reset role;select evidence_probe.set_authority('11111111-1111-4111-8111-111111111111',false);set role service_role");
 await assert.rejects(stage(e),/evidence_denied/);await assert.rejects(inspect(e),/evidence_denied/);
 await assert.rejects(db.query('select evidence_probe.set_authority($1,true)',[actor]),/permission denied/);
 await assert.rejects(db.exec("select evidence_probe.set_source_policy(repeat('d',64),'synthetic',true)"),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from evidence_probe.authority where actor=$1',[actor])).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from evidence_probe.source_policy where hash=repeat('d',64)")).rows[0].n,3);
 await assert.rejects(db.exec('update evidence_probe.authority set enabled=true'),/evidence_immutable/);
 await assert.rejects(db.exec('delete from evidence_probe.source_policy'),/evidence_immutable/);
 await assert.rejects(db.exec('update evidence_probe.packages set owner=owner'),/evidence_immutable/);
 console.log('Disposable evidence SQL checks passed: canonical readback/mixed-source binding, exact retry, request/revision conflicts, historical exact reads, 4 write-boundary rollbacks, SQL shape/receipt validation, immutable package and authority/policy history, role isolation and latest-state denial.');
}finally{await db.close();}
