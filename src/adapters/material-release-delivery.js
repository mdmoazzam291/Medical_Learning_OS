import {readRelease,verifyHandoffDirectory,handoffManifest} from '../../scripts/lib/material-release-files.js';
import {join} from 'node:path';
import {canonicalJson} from '../domain/material-release/contract.js';
import {stableJson,digestBytes} from '../domain/material-release/packing.js';
import {validateImport} from '../domain/content-library.js';
import {validateCatalog} from '../domain/content.js';
import {validateArchiveReceipt,requiredArchiveFiles,handoffDigest,receiptIdentity,validReceiptReference,receiptSaved} from '../domain/material-release/receipts.js';
const timestamp=clock=>{const v=clock?.();if(typeof v!=='string'||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)throw new TypeError('invalid_receipt_clock');return v;};
async function saveReceipt(r,journal){
  r.receiptReference=null;r.receiptId=receiptIdentity(r);if(!journal?.append)return false;
  try{const ref=await journal.append(structuredClone(r));if(!validReceiptReference(ref)||ref.sha256!==digestBytes(stableJson(r)))return false;r.receiptReference={id:ref.id,url:ref.url,sha256:ref.sha256};return true;}catch{return false;}
}
export async function archiveHandoff(h,{releaseDirectory,localDirectory,parentId,port,journal=null,clock,priorReceipt=null}){
  const r={receiptId:null,releaseId:h.releaseId,releaseDigest:h.releaseDigest,handoffDigest:handoffDigest(h),verifiedAt:timestamp(clock),state:'persistence_pending',files:[],receiptReference:null,diagnostics:[],uncertainOperations:priorReceipt?.handoffDigest===handoffDigest(h)&&priorReceipt.releaseDigest===h.releaseDigest?structuredClone(priorReceipt.uncertainOperations??[]):[],...(port?.fixture||journal?.fixture?{fixture:true}:{})};
  let required;
  try{const release=await readRelease(releaseDirectory),sealed=await verifyHandoffDirectory(localDirectory);if(canonicalJson(release.sourceFiles)!==canonicalJson(h.sourceFiles)||canonicalJson(sealed)!==canonicalJson(handoffManifest(h)))throw Error();required=requiredArchiveFiles(h);if(Object.values(release.records).some(rows=>rows.some(row=>row.archive?.fixture===true)))r.fixture=true;}catch{r.diagnostics.push('archive_local_verification_failed');await saveReceipt(r,journal);return r;}
  if(!parentId||!port||['find','upload','readBytes','metadata'].some(k=>typeof port[k]!=='function')){r.diagnostics.push('archive_port_unavailable');await saveReceipt(r,journal);return r;}
  for(const f of required){
    try{
      // Every retry reconciles saved/uncertain files using bytes, not a filename or prior assertion.
      const candidates=await port.find({parentId,path:f.path,sha256:f.sha256});if(!Array.isArray(candidates)||candidates.length>1)throw new TypeError('reconciliation_required');
      let c=candidates[0];if(!c&&priorReceipt?.handoffDigest===r.handoffDigest)c=priorReceipt.files?.find(x=>x.path===f.path)?{id:priorReceipt.files.find(x=>x.path===f.path).driveFileId}:null;
      const uncertain=r.uncertainOperations.find(x=>x.path===f.path&&x.parentId===parentId&&x.sha256===f.sha256&&x.bytes===f.bytes);
      if(!c&&uncertain){if(uncertain.candidateId)c={id:uncertain.candidateId};else throw new TypeError('reconciliation_required');}
      if(!c){const intent={path:f.path,sha256:f.sha256,bytes:f.bytes,parentId,operationId:'upload-'+digestBytes(stableJson([r.handoffDigest,parentId,f.path,f.sha256])),candidateId:null};r.uncertainOperations.push(intent);if(!await saveReceipt(r,journal))throw new TypeError('receipt_persistence_pending');const prefix=f.path.startsWith('release/')?'release/':'handoff/',dir=prefix==='release/'?releaseDirectory:localDirectory;try{c=await port.upload({parentId,path:f.path,localPath:join(dir,f.path.slice(prefix.length)),sha256:f.sha256,bytes:f.bytes});intent.candidateId=c.id;}catch{throw new TypeError('reconciliation_required');}}
      const meta=await port.metadata(c.id),bytes=await port.readBytes(c.id);
      if(meta.id!==c.id||!Array.isArray(meta.parentIds)||!meta.parentIds.includes(parentId)||meta.bytes!==f.bytes||!(bytes instanceof Uint8Array)||bytes.byteLength!==f.bytes||digestBytes(bytes)!==f.sha256||!validReceiptReference({id:meta.id,url:meta.url,sha256:f.sha256}))throw new TypeError('archive_readback_failed');
      r.uncertainOperations=r.uncertainOperations.filter(x=>x.path!==f.path);
      r.files.push({...f,driveFileId:meta.id,driveUrl:meta.url,verifiedBy:'byte_readback'});
      if(!await saveReceipt(r,journal)){r.diagnostics.push('receipt_persistence_pending');break;}
    }catch(e){r.diagnostics.push(e instanceof TypeError&&['reconciliation_required','archive_readback_failed','receipt_persistence_pending'].includes(e.message)?e.message:'archive_operation_failed');break;}
  }
  if(r.files.length===required.length&&!r.diagnostics.length&&!r.uncertainOperations.length)r.state='portable_export_ready';
  if(!await saveReceipt(r,journal)){r.state='persistence_pending';if(!r.diagnostics.includes('receipt_persistence_pending'))r.diagnostics.push('receipt_persistence_pending');r.receiptReference=null;r.receiptId=receiptIdentity(r);}
  return r;
}

function authorized(h,{authorization:a,targetSnapshot:t,port,journal,archiveReceipt},requirePort=true){
  const isolated=a?.mode==='isolated-test';
  if(!a||a.approvedReleaseId!==h.releaseId||a.targetEnvironment!==t?.environment||!['isolated-test','live-active-task'].includes(a.mode))throw new TypeError('delivery_authorization_required');
  if(isolated&&(t.environment!=='isolated-test'||requirePort&&!port?.fixture))throw new TypeError('fixture_scope_invalid');
  if(!isolated&&(port?.fixture||journal?.fixture||archiveReceipt?.fixture||a.preflightEvidence?.fixture))throw new TypeError('fixture_receipt_rejected');
  validateArchiveReceipt(archiveReceipt,h,{allowFixture:isolated});
  const p=a.preflightEvidence;
  if(!p||p.kind!=='authorized-stage-validation'||p.releaseId!==h.releaseId||p.handoffDigest!==handoffDigest(h)||p.targetEnvironment!==t.environment||p.targetSnapshotDigest!==digestBytes(stableJson(t)))throw new TypeError('compatibility_pending');
  if(t.contractId!=='content-library-inbox-v1')throw new TypeError('target_snapshot_invalid');validateCatalog(t.catalog);
  if(requirePort&&(!port||['stage','readImport'].some(k=>typeof port[k]!=='function')))throw new TypeError('stage_port_unavailable');
  for(const c of h.chunks){validateImport(c.manifest);const f=h.files.find(f=>f.path===`imports/${c.importId}.json`);if(!f||c.manifest.importId!==c.importId||c.bytes!==stableJson(c.manifest)||f.bytes!==c.bytes||c.sha256!==digestBytes(c.bytes)||f.sha256!==c.sha256)throw new TypeError('handoff_chunk_mismatch');}
}
const hex=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
function remoteItem(detail,c){
  if(!detail||detail.import_id!==c.importId||!hex(detail.digest)||stableJson(detail.manifest)!==stableJson(c.manifest)||!['staged','published'].includes(detail.status))throw new TypeError('remote_import_conflict');
  if(detail.status==='published'){
    const p=detail.receipt;if(!p||p.contractId!=='content-library-publication-v1'||p.importId!==c.importId||p.digest!==detail.digest||p.status!=='published'||typeof p.publishedAt!=='string'||!Number.isFinite(Date.parse(p.publishedAt)))throw new TypeError('publication_receipt_missing');
  }else if(detail.receipt!==null)throw new TypeError('remote_import_conflict');
  return {importId:c.importId,payloadSha256:c.sha256,targetDigest:detail.digest,status:detail.status==='published'?'already_published':'staged',targetReference:detail.import_id,diagnosticCode:null};
}
export async function stageTextHandoff(h,options){
  const {archiveReceipt,targetSnapshot,port,journal=null,authorization,clock,priorReceipt=null}=options;
  const r={receiptId:null,operationId:'stage-'+digestBytes(stableJson([h.releaseId,handoffDigest(h),authorization?.targetEnvironment??null])),releaseId:h.releaseId,handoffDigest:handoffDigest(h),targetEnvironment:targetSnapshot?.environment??null,route:'text-draft',attemptedAt:timestamp(clock),items:h.chunks.map(c=>({importId:c.importId,payloadSha256:c.sha256,targetDigest:null,status:'not_attempted',targetReference:null,diagnosticCode:null})),state:'delivery_blocked',persistence:'receipt_persistence_pending',receiptReference:null,compatibility:'compatibility_pending',diagnostics:[],publicationEvidence:[],...(port?.fixture||archiveReceipt?.fixture?{fixture:true}:{})};
  try{authorized(h,options);}catch(e){r.diagnostics.push(e instanceof TypeError&&/^[a-z_]+$/.test(e.message)?e.message:'delivery_preflight_failed');r.persistence='saved';if(!await saveReceipt(r,journal))r.persistence='receipt_persistence_pending';return r;}
  for(let i=0;i<h.chunks.length;i++){
    const c=h.chunks[i];let detail,posted=false;
    try{
      detail=await port.readImport(c.importId);
      if(!detail){
        if(priorReceipt?.operationId===r.operationId&&priorReceipt.items?.some(x=>x.importId===c.importId&&x.status==='reconciliation_required'))throw new TypeError('reconciliation_required');
        let ack;try{posted=true;ack=await port.stage(structuredClone(c.manifest));}catch{throw new TypeError('reconciliation_required');}
        if(!ack||ack.contractId!=='content-library-stage-v1'||ack.importId!==c.importId||!hex(ack.digest)||!['staged','published'].includes(ack.status)||ack.publicationAuthority!==false)throw new TypeError('invalid_stage_ack');
        detail=await port.readImport(c.importId);
        if(!detail||detail.digest!==ack.digest||detail.status!==ack.status)throw new TypeError('stage_readback_mismatch');
      }
      r.items[i]=remoteItem(detail,c);
      if(detail.status==='published'){const p=detail.receipt;r.publicationEvidence.push({contractId:p.contractId,importId:p.importId,digest:p.digest,status:p.status,publishedAt:p.publishedAt});}
    }catch(e){const code=e instanceof TypeError&&['remote_import_conflict','publication_receipt_missing','reconciliation_required','invalid_stage_ack','stage_readback_mismatch'].includes(e.message)?e.message:posted?'reconciliation_required':'stage_read_unavailable';r.items[i].status=['reconciliation_required','stage_read_unavailable','stage_readback_mismatch'].includes(code)?'reconciliation_required':'delivery_blocked';r.items[i].diagnosticCode=code;await saveReceipt(r,journal);break;}
    await saveReceipt(r,journal);
  }
  const successes=r.items.filter(x=>['staged','already_published'].includes(x.status)).length;
  r.state=successes===r.items.length&&successes&&!h.routes.length&&!h.excluded.some(x=>x.reason!=='duplicate_to_canonical')?'staged':successes?'partially_staged':r.items.some(x=>x.status==='reconciliation_required')?'reconciliation_required':'delivery_blocked';
  if(successes)r.compatibility='draft_stage_verified';
  // Save a companion snapshot without its own reference. The save result is a separate event.
  r.persistence='saved';if(!await saveReceipt(r,journal)){r.persistence='receipt_persistence_pending';r.receiptReference=null;r.receiptId=receiptIdentity(r);}return r;
}
export function prepareRepositoryHandoff(h,options){authorized(h,options,false);return {releaseId:h.releaseId,handoffDigest:handoffDigest(h),state:'repository_handoff_pending',files:h.chunks.map(c=>({path:`content/inbox/${c.importId}.json`,bytes:c.bytes,sha256:c.sha256}))};}

export async function appendReleaseIndex({archiveReceipt:a,deliveryReceipt:d=null},port){
  const no={updated:false,conflict:false};
  if(!port||typeof port.read!=='function'||typeof port.compareAndAppend!=='function'||!a||a.state!=='portable_export_ready'||!receiptSaved(a)||!Array.isArray(a.files)||!a.files.length||a.fixture&&!port.fixture)return no;
  if(d&&(!receiptSaved(d)||d.persistence!=='saved'||d.releaseId!==a.releaseId||d.handoffDigest!==a.handoffDigest||d.fixture&&!port.fixture))return no;
  const identity={releaseId:a.releaseId,releaseDigest:a.releaseDigest,handoffDigest:a.handoffDigest},portable={...identity,receiptReference:a.receiptReference},staged=d?.state==='staged'&&d.items.length&&d.items.every(x=>['staged','already_published'].includes(x.status));
  const published=staged&&d.items.every(x=>x.status==='already_published'&&d.publicationEvidence?.some(p=>p.importId===x.importId&&p.digest===x.targetDigest&&p.status==='published'&&p.contractId==='content-library-publication-v1'));
  const entry={...identity,archiveReceiptReference:a.receiptReference,deliveryReceiptReference:d?.receiptReference??null,pointers:{latestPortable:portable,latestCompatible:null,latestStaged:staged?{...identity,targetEnvironment:d.targetEnvironment,receiptReference:d.receiptReference}:null,latestPublished:published?{...identity,targetEnvironment:d.targetEnvironment,receiptReference:d.receiptReference}:null}};
  entry.entryId='entry-'+digestBytes(stableJson(entry));
  let before;try{before=await port.read();}catch{return {updated:false,conflict:true};}
  if(!before?.document||!Array.isArray(before.document.entries)||before.version===undefined)return no;
  const contains=value=>value?.document?.entries?.some(x=>x.entryId===entry.entryId&&canonicalJson(x)===canonicalJson(entry));
  if(contains(before))return no;
  try{const result=await port.compareAndAppend(before.version,structuredClone(entry));if(result?.conflict)return {updated:false,conflict:true};if(result?.version===undefined)return {updated:false,conflict:true};const after=await port.read();return contains(after)?{updated:true,conflict:false}:{updated:false,conflict:true};}
  catch{try{return contains(await port.read())?{updated:true,conflict:false}:{updated:false,conflict:true};}catch{return {updated:false,conflict:true};}}
}

