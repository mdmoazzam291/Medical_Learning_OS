import {handoffManifest} from '../../../scripts/lib/material-release-files.js';
import {stableJson,digestBytes} from './packing.js';
import {safeRelativePath,canonicalJson,fail,exact} from './contract.js';
export const handoffDigest=h=>digestBytes(stableJson(handoffManifest(h)));
export function requiredArchiveFiles(h){
  if(!Array.isArray(h.sourceFiles)||!h.sourceFiles.some(f=>f.path==='manifest.json'))fail('archive_context_missing');
  const manifest=stableJson(handoffManifest(h)),complete=stableJson({manifestSha256:digestBytes(manifest)});
  return [...h.sourceFiles.map(f=>({...f,path:'release/'+safeRelativePath(f.path)})),...h.files.map(f=>({path:'handoff/'+safeRelativePath(f.path),sha256:f.sha256,bytes:Buffer.byteLength(f.bytes)})),{path:'handoff/handoff-manifest.json',sha256:digestBytes(manifest),bytes:Buffer.byteLength(manifest)},{path:'handoff/COMPLETE.json',sha256:digestBytes(complete),bytes:Buffer.byteLength(complete)}];
}
export function validReceiptReference(r){if(!r||typeof r.id!=='string'||!r.id||typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256))return false;try{return new URL(r.url).protocol==='https:';}catch{return false;}}
export function validateArchiveReceipt(receipt,h,{allowFixture=false}={}){
  if(receipt?.fixture&&!allowFixture)fail('fixture_receipt_rejected');
  if(!receipt||receipt.state!=='portable_export_ready'||receipt.releaseId!==h.releaseId||receipt.releaseDigest!==h.releaseDigest||receipt.handoffDigest!==handoffDigest(h)||!receiptSaved(receipt)||!Array.isArray(receipt.files))fail('archive_not_verified');
  const required=requiredArchiveFiles(h);if(required.length!==receipt.files.length)fail('archive_not_verified');
  const seen=new Set();for(const f of receipt.files){exact(f,['path','sha256','bytes','driveFileId','driveUrl','verifiedBy']);const expected=required.find(x=>x.path===f.path);if(!expected||seen.has(f.path)||expected.sha256!==f.sha256||expected.bytes!==f.bytes||f.verifiedBy!=='byte_readback'||typeof f.driveFileId!=='string'||!f.driveFileId||!validReceiptReference({id:f.driveFileId,url:f.driveUrl,sha256:f.sha256}))fail('archive_not_verified');seen.add(f.path);}
}
export function receiptIdentity(receipt){const {receiptId,receiptReference,...content}=receipt;return 'receipt-'+digestBytes(canonicalJson(content));}

export function receiptSaved(r){return validReceiptReference(r?.receiptReference)&&r.receiptId===receiptIdentity(r)&&r.receiptReference.sha256===digestBytes(stableJson({...r,receiptReference:null}));}
