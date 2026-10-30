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
 await db.exec(await readFile(new URL('../ops/prototypes/source-evidence/digests.sql',import.meta.url),'utf8'));
 await db.query('select evidence_probe.set_authority($1,true)',[actor]);
 await db.exec("select evidence_probe.set_source_policy(repeat('a',64),'synthetic',true);select evidence_probe.set_source_policy(repeat('d',64),'synthetic',true)");
 await db.exec('set role service_role');
 const forged=await envelope(candidate()),altered=structuredClone(forged.p);altered.cases[0].appearance.rawCellSha256='e'.repeat(64);forged.args[1]=canonicalize(altered);
 await assert.rejects(stage(forged),/evidence_invalid/);
 const e=await envelope(candidate()),first=await stage(e);assert.equal(first.status,'committed');
 assert.equal(await matchesSourceEvidenceStagingReceipt(first.receipt,e.b),true);
 assert.deepEqual(await stage(e),first);
 assert.deepEqual(await stage(await envelope({...e.p,cases:e.p.cases.toReversed()},e.b.requestId)),first,'case order does not change exact retry receipt');
 for(const value of [{z:null,a:[true,false,0,1000000000],text:'quote" and slash\\'},['a-a','a.a','a0','a:a','a_a'],{b:1,a:0}])assert.equal((await db.query('select evidence_probe.domain_canonical($1::jsonb) c',[JSON.stringify(value)])).rows[0].c,canonicalize(value));
 for(const value of ['nonASCII-é','line\nfeed',-1,1.5,1000000001])await assert.rejects(db.query('select evidence_probe.domain_canonical($1::jsonb)',[JSON.stringify(value)]),/evidence_invalid/);
 assert.equal((await db.query("select evidence_probe.domain_canonical('1.00'::jsonb) c")).rows[0].c,'1');
 const relations=['unresolved','proposed-normalization','distinct-appearance','candidate-equivalence','partial','nested'];
 for(let i=0;i<12;i++){
  const p=candidate();p.packageVersion=i===11?1000000:i+1;p.cases[0].caseId=['a-a','a.a','a0','a:a','a_a','aa'][i%6];p.cases[0].caseVersion=i===11?1000000:i+1;
  p.cases[0].appearance={...p.cases[0].appearance,pdfPage:i+1,rowOrdinal:1000000,rotation:[0,90,180,270][i%4],bboxMilliPoints:[0,1,1000000000,999999999]};p.cases[0].interpretation={...p.cases[0].interpretation,proposedIdentity:i%2?'BC14.24':null,relation:relations[i%6]};
  const v=await envelope(p),derived=(await db.query('select evidence_probe.derived_manifest($1::jsonb) m',[canonicalize(p)])).rows[0].m;
  assert.equal(canonicalize(derived),v.args[2]);assert.equal((await db.query('select evidence_probe.domain_hash($1::jsonb) h',[derived])).rows[0].h,v.b.packageDigest);await stage(v);
 }
 const wrongFingerprint=await envelope(candidate());wrongFingerprint.args[3]={...wrongFingerprint.b,requestFingerprint:'f'.repeat(64)};
 const {receiptDigest:discarded,...wrongPayload}=wrongFingerprint.receipt;wrongPayload.requestFingerprint='f'.repeat(64);wrongFingerprint.args[4]=canonicalize(wrongPayload);wrongFingerprint.args[5]=canonicalize({...wrongPayload,receiptDigest:(await digestCanonical(wrongPayload)).digestHex});await assert.rejects(stage(wrongFingerprint),/evidence_invalid/);
 const forgedManifest=await envelope(candidate()),fm=JSON.parse(forgedManifest.args[2]);fm.cases[0].appearanceEvidenceDigest='f'.repeat(64);
 const digest=(await digestCanonical(fm)).digestHex;forgedManifest.args[2]=canonicalize(fm);forgedManifest.args[3]={...forgedManifest.b,packageDigest:digest};
 const {receiptDigest:discard,...payloadManifest}=forgedManifest.receipt;payloadManifest.packageDigest=digest;forgedManifest.args[4]=canonicalize(payloadManifest);forgedManifest.args[5]=canonicalize({...payloadManifest,receiptDigest:(await digestCanonical(payloadManifest)).digestHex});await assert.rejects(stage(forgedManifest),/evidence_invalid/);
 const noncanonical=await envelope(candidate());noncanonical.args[1]+=' ';await assert.rejects(stage(noncanonical),/evidence_invalid/);
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
 for(const change of [{clinicalApproved:true},{contractId:'wrong'},{sourceReviewOnly:false}]){
  const badStored=await envelope(e.p),{receiptDigest:oldChecksum,...base}=badStored.receipt,payload={...base,...change};
  const receipt=canonicalize({...payload,receiptDigest:(await digestCanonical(payload)).digestHex});
  await db.query('insert into evidence_probe.requests values($1,$2,$3,$4,$5,$6,$7)',[actor,badStored.b.requestId,badStored.b.requestFingerprint,badStored.b.packageId,1,badStored.b.packageDigest,receipt]);
  await assert.rejects(inspect(badStored),/evidence_invalid/);await assert.rejects(stage(badStored),/evidence_invalid/);
 }
 const alien=await envelope(candidate()),physical=crypto.randomUUID();
 await db.query('insert into evidence_probe.packages values($1,$2,$3)',[physical,physical,actor]);
 await db.query('insert into evidence_probe.revisions values($1,1,$2,$3,$4,$5)',[physical,alien.b.packageDigest,actor,alien.args[1],alien.args[2]]);
 for(const q of alien.p.cases)await db.query('insert into evidence_probe.cases values($1,1,$2,$3)',[physical,q.caseId,q]);
 await db.query('insert into evidence_probe.requests values($1,$2,$3,$4,1,$5,$6)',[actor,alien.b.requestId,alien.b.requestFingerprint,physical,alien.b.packageDigest,alien.args[5]]);
 await assert.rejects(inspect({...alien,b:{...alien.b,packageId:physical}}),/evidence_invalid/);
 await assert.rejects(db.query('select evidence_probe.validate($1::jsonb,$2::jsonb,$3::jsonb)',[{...e.p,packageVersion:2},e.b,e.receipt]),/evidence_invalid/);
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
 const corruptProjection=await envelope(candidate());await stage(corruptProjection);
 await db.query('insert into evidence_probe.cases values($1,$2,$3,$4)',[corruptProjection.b.packageId,1,'unexpected',corruptProjection.p.cases[0]]);
 await assert.rejects(inspect(corruptProjection),/evidence_invalid/);
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
 console.log('Disposable evidence SQL checks passed: canonical readback/mixed-source binding, exact retry, request/revision conflicts, historical exact reads, 4 write-boundary rollbacks, restricted SQL/JS digest parity and forged-binding rejection, SQL shape/receipt validation, immutable package and authority/policy history, role isolation and latest-state denial.');
}finally{await db.close();}
