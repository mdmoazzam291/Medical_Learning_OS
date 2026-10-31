import { canonicalize, digestCanonical, DEFAULT_INTEGRITY_PROFILE } from './canonical-integrity.js';

const fail=()=>{throw new TypeError('source_row_evidence_invalid');};
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const version=v=>Number.isSafeInteger(v)&&v>=1&&v<=1000000;
const slug=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(v)&&!v.includes('..');
const label=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v)&&!v.includes('..');
function exact(v,fields){
  if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail();
  const keys=Reflect.ownKeys(v);
  if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k)))fail();
  for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable||!Object.hasOwn(d,'value'))fail();}
}
function dataArray(v,max){
  if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length<1||v.length>max)fail();
  if(Reflect.ownKeys(v).length!==v.length+1)fail();
  for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d?.enumerable||!Object.hasOwn(d,'value'))fail();}
}
function captureCase(v){
  exact(v,['caseId','caseVersion','sourceSha256','sourceEdition','appearance','interpretation']);
  if(!slug(v.caseId)||!version(v.caseVersion)||!hex(v.sourceSha256)||!label(v.sourceEdition))fail();
  const a=v.appearance;
  exact(a,['pdfPage','rowOrdinal','rotation','bboxMilliPoints','rawCellSha256']);
  if(!version(a.pdfPage)||!version(a.rowOrdinal)||![0,90,180,270].includes(a.rotation)||!hex(a.rawCellSha256))fail();
  dataArray(a.bboxMilliPoints,4);
  const b=a.bboxMilliPoints;
  if(b.length!==4||b.some(x=>!Number.isSafeInteger(x)||x<0||x>1000000000)||b[2]<=b[0]||b[3]<=b[1])fail();
  const i=v.interpretation;
  exact(i,['proposedIdentity','relation','rationaleSha256']);
  if(!(i.proposedIdentity===null||label(i.proposedIdentity))||!hex(i.rationaleSha256)||
    !['unresolved','proposed-normalization','distinct-appearance','candidate-equivalence','partial','nested'].includes(i.relation))fail();
  return JSON.parse(canonicalize(v));
}
async function hashCase(claim,options){
  const appearance=await digestCanonical({contractId:'source-row-appearance-evidence-v1',
    sourceSha256:claim.sourceSha256,sourceEdition:claim.sourceEdition,appearance:claim.appearance},options);
  const evidence=await digestCanonical({contractId:'source-row-case-evidence-v1',claim},options);
  return Object.freeze({caseId:claim.caseId,caseVersion:claim.caseVersion,sourceSha256:claim.sourceSha256,
    caseDigest:evidence.digestHex,appearanceEvidenceDigest:appearance.digestHex});
}
// Hashes bind supplied metadata; they do not verify source bytes or approve claims.
export async function digestSourceRowCase(claim,options){
  return hashCase(captureCase(claim),options);
}
export function captureSourceRowPackage(value){
  exact(value,['packageId','packageVersion','cases']);
  if(typeof value.packageId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.packageId)||!version(value.packageVersion))fail();
  dataArray(value.cases,10000);
  // Capture every claim and package field before the first asynchronous digest.
  const packageId=value.packageId,packageVersion=value.packageVersion,claims=value.cases.map(captureCase);
  if(new Set(claims.map(c=>c.caseId)).size!==claims.length)fail();
  claims.sort((a,b)=>a.caseId<b.caseId?-1:a.caseId>b.caseId?1:0);
  return {packageId,packageVersion,cases:claims};
}
export async function digestSourceRowPackage(value,options){
  const {packageId,packageVersion,cases:claims}=captureSourceRowPackage(value);
  const cases=[];
  for(const claim of claims)cases.push(await hashCase(claim,options));
  const manifest={contractId:'source-row-package-evidence-v1',integrityProfile:DEFAULT_INTEGRITY_PROFILE,
    packageId,packageVersion,cases};
  const envelope=await digestCanonical(manifest,options);
  return Object.freeze({packageId,packageVersion,packageDigest:envelope.digestHex,
    integrityProfile:DEFAULT_INTEGRITY_PROFILE,cases:Object.freeze(cases)});
}
