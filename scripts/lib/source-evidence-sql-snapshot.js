// Disposable synthetic fixture recovery only. Expected digest is trusted separately.
import {canonicalize,digestCanonical} from '../../src/domain/canonical-integrity.js';
import {captureSourceRowPackage,digestSourceRowPackage} from '../../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../../src/domain/source-evidence-staging.js';
const tableOrder={authority:'actor,version',source_policy:'hash,edition,version',packages:'package_id',revisions:'package_id,version',cases:'package_id,version,case_id',requests:'actor,request_id',events:'id',withdrawals:'package_id,version,digest'};
const fail=()=>{throw new TypeError('evidence_snapshot_invalid');};
function exact(v,keys){
 if(!v||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Reflect.ownKeys(v).length!==keys.length)fail();
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d?.enumerable||!Object.hasOwn(d,'value'))fail();}
}
async function captured(snapshot,expected){
 exact(snapshot,['formatVersion','tables','snapshotDigest']);exact(snapshot.tables,Object.keys(tableOrder));
 const s=JSON.parse(canonicalize(snapshot));
 if(s.formatVersion!==1||typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected)||s.snapshotDigest!==expected||Object.values(s.tables).some(v=>typeof v!=='string'))fail();
 if(new TextEncoder().encode(canonicalize(s)).byteLength>64*1024*1024)fail();
 const {snapshotDigest,...body}=s;if((await digestCanonical(body)).digestHex!==snapshotDigest)fail();return s;
}
export async function exportSourceEvidenceSnapshot(db){
 await db.exec('begin isolation level repeatable read');
 try{
  await db.exec('select pg_advisory_xact_lock(730031)');
  const tables={};
  for(const [name,order] of Object.entries(tableOrder))tables[name]=(await db.query('select coalesce(jsonb_agg(to_jsonb(t) order by '+order+"),'[]'::jsonb)::text data from evidence_probe."+name+' t')).rows[0].data;
  await db.exec('commit');
  const body={formatVersion:1,tables:Object.freeze(tables)};
  return Object.freeze({...body,snapshotDigest:(await digestCanonical(body)).digestHex});
 }catch(error){await db.exec('rollback');throw error;}
}
async function audit(db){
 const all={};for(const t of Object.keys(tableOrder))all[t]=(await db.query('select * from evidence_probe.'+t)).rows;
 for(const [records,key] of [[all.authority,r=>r.actor],[all.source_policy,r=>r.hash+'|'+r.edition]]){
  const groups=new Map();for(const r of records){const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r.version);}
  for(const v of groups.values()){v.sort((a,b)=>a-b);if(v.some((n,i)=>n!==i+1))fail();}
 }
 for(const r of all.revisions){
  const p=captureSourceRowPackage(JSON.parse(r.candidate)),parent=all.packages.find(x=>x.package_id===r.package_id),manifest=await digestSourceRowPackage(p);
  if(!parent||parent.owner!==r.owner||parent.lexical_id!==p.packageId||p.packageId.toLowerCase()!==r.package_id||p.packageVersion!==r.version||manifest.packageDigest!==r.digest||canonicalize(p)!==r.candidate)fail();
  const {packageDigest,...m}=manifest;if(canonicalize({contractId:'source-row-package-evidence-v1',...m})!==r.manifest)fail();
  const cases=all.cases.filter(x=>x.package_id===r.package_id&&x.version===r.version);
  if(cases.length!==p.cases.length||cases.some(x=>!p.cases.some(c=>c.caseId===x.case_id&&canonicalize(c)===canonicalize(x.claim))))fail();
  if(!all.authority.some(x=>x.actor===r.owner)||p.cases.some(c=>!all.source_policy.some(x=>x.hash===c.sourceSha256&&x.edition===c.sourceEdition)))fail();
  if(!all.requests.some(x=>x.package_id===r.package_id&&x.version===r.version))fail();
 }
 for(const p of all.packages)if(!all.revisions.some(r=>r.package_id===p.package_id))fail();
 for(const q of all.requests){
  const r=all.revisions.find(x=>x.package_id===q.package_id&&x.version===q.version),receipt=JSON.parse(q.receipt);if(!r||q.actor!==r.owner||q.digest!==r.digest)fail();
  const p=JSON.parse(r.candidate),b=await prepareSourceEvidenceStagingRequest({...p,requestId:receipt.requestId,expectedPackageDigest:r.digest},q.actor);
  if(typeof receipt.requestId!=='string'||receipt.requestId.toLowerCase()!==q.request_id||b.requestFingerprint!==q.fingerprint||!await matchesSourceEvidenceStagingReceipt(receipt,b)||canonicalize(receipt)!==q.receipt)fail();
  await db.query('select evidence_probe.validate($1::jsonb,$2::jsonb,$3::jsonb)',[p,b,receipt]);
  const {receiptDigest,...payload}=receipt;
  await db.query('select evidence_probe.validate_digests($1,$2,$3,$4,$5)',[r.candidate,r.manifest,b,canonicalize(payload),q.receipt]);
  if(all.events.filter(e=>e.actor===q.actor&&e.request_id===q.request_id).length!==1)fail();
 }
 for(const e of all.events)if(!all.requests.some(q=>q.actor===e.actor&&q.request_id===e.request_id))fail();
 for(const w of all.withdrawals){const p=all.packages.find(x=>x.package_id===w.package_id);if(!p||w.actor!==p.owner)fail();}
}
export async function restoreSourceEvidenceSnapshot(db,snapshot,expected,{failAfterTable=null}={}){
 const s=await captured(snapshot,expected);
 await db.exec('begin');
 try{
  await db.exec('select pg_advisory_xact_lock(730031)');
  for(const t of Object.keys(tableOrder))if((await db.query('select exists(select 1 from evidence_probe.'+t+') used')).rows[0].used)fail();
  for(const t of Object.keys(tableOrder)){
   const data=s.tables[t];
   if((await db.query('select jsonb_typeof($1::jsonb) kind',[data])).rows[0].kind!=='array')fail();
   if((await db.query('select exists(select 1 from jsonb_array_elements($1::jsonb) v where v is distinct from to_jsonb(jsonb_populate_record(null::evidence_probe.'+t+',v))) bad',[data])).rows[0].bad)fail();
   await db.query('insert into evidence_probe.'+t+(t==='events'?' overriding system value':'')+' select * from jsonb_populate_recordset(null::evidence_probe.'+t+',$1::jsonb)',[data]);
   if(t===failAfterTable)throw new Error('injected_restore_failure');
  }
  await audit(db);
  await db.exec("select setval(pg_get_serial_sequence('evidence_probe.events','id'),greatest(coalesce(max(id),0),1),max(id) is not null) from evidence_probe.events");
  await db.exec('commit');
 }catch(error){await db.exec('rollback');throw error;}
}
