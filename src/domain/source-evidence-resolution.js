import {canonicalize} from './canonical-integrity.js';
import {captureSourceRowPackage,digestSourceRowPackage} from './source-row-evidence.js';
const fields=['packageId','packageVersion','packageDigest','caseId','caseVersion','caseDigest','appearanceEvidenceDigest'];
const fail=()=>{throw new TypeError('source_evidence_resolution_invalid');};
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const version=v=>Number.isSafeInteger(v)&&v>=1&&v<=1000000;
function captureSelection(v){
 if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail();
 const keys=Reflect.ownKeys(v);
 if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k)))fail();
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable||!Object.hasOwn(d,'value'))fail();}
 if(typeof v.packageId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v.packageId)||!version(v.packageVersion)||!version(v.caseVersion)||
 typeof v.caseId!=='string'||!/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(v.caseId)||v.caseId.includes('..')||!['packageDigest','caseDigest','appearanceEvidenceDigest'].every(k=>hex(v[k])))fail();
 return JSON.parse(canonicalize(v));
}
// Offline metadata integrity only: caller must separately establish origin and current access.
export async function resolveSourceEvidenceCase(packageCandidate,selection,options){
 const s=captureSelection(selection),p=captureSourceRowPackage(packageCandidate);
 if(p.packageId!==s.packageId||p.packageVersion!==s.packageVersion)fail();
 const manifest=await digestSourceRowPackage(p,options);
 if(manifest.packageDigest!==s.packageDigest)fail();
 const ref=manifest.cases.find(c=>c.caseId===s.caseId);
 if(!ref||ref.caseVersion!==s.caseVersion||ref.caseDigest!==s.caseDigest||ref.appearanceEvidenceDigest!==s.appearanceEvidenceDigest)fail();
 const claim=p.cases.find(c=>c.caseId===ref.caseId);
 return Object.freeze({...s,sourceSha256:claim.sourceSha256,sourceEdition:claim.sourceEdition,bytesVerified:false,sourceReviewOnly:true,learnerRelease:false});
}
