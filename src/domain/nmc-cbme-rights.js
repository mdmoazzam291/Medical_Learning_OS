// Metadata-only bridge to the existing source/rights gate: citation_only is
// NOT a license to reproduce NMC curriculum tables or full-text competency rows.
import register from '../../data/nmc-cbme-rights-register.json' with {type:'json'};
const fail=()=>{throw new TypeError('nmc_source_rights_unresolved');};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===[...keys].sort().join('|');
export function validateNmcRightsRegister(input=register){
 if(!exact(input,['schemaVersion','recordVersion','policy','sourceRecords'])||
 input.schemaVersion!==1||input.recordVersion!=='nmc-cbme-rights:source-citation@1'||
 input.policy!=='citation_only-no-republication'||!Array.isArray(input.sourceRecords)||
 input.sourceRecords.length!==3)fail();
 const ids=new Set();
 for(const r of input.sourceRecords){
  if(!exact(r,['sourceId','edition','url','institutionalMirrorUrl','cohortApplicability',
    'copyrightEvidence','rightsMode','reusePermission','visualFileVerified',
    'documentSha256','rawDocumentStored','publicRedistributionAllowed'])||
    !/^nmc-[a-z0-9-]+$/.test(r.sourceId)||ids.has(r.sourceId)||
    typeof r.edition!=='string'||!r.edition.trim()||
    typeof r.url!=='string'||!r.url.startsWith('https://www.nmc.org.in/')||
    (r.institutionalMirrorUrl!==null&&
      (typeof r.institutionalMirrorUrl!=='string'||!r.institutionalMirrorUrl.startsWith('https://medicaleducationucms.weebly.com/')))||
    typeof r.cohortApplicability!=='string'||r.cohortApplicability.length<20||
    typeof r.copyrightEvidence!=='string'||r.copyrightEvidence.length<20||
    r.rightsMode!=='citation_only'||r.reusePermission!=='not-recorded'||
    r.visualFileVerified!==false||r.documentSha256!==null||
    r.rawDocumentStored!==false||r.publicRedistributionAllowed!==false)fail();
  ids.add(r.sourceId);
 }
 for(const required of ['nmc-ug-curriculum-2019','nmc-cbme-2023','nmc-cbme-2024'])
  if(!ids.has(required))fail();
 return structuredClone(input);
}
export function nmcCitationOnlyPreflight(input=register){
 const r=validateNmcRightsRegister(input);
 return {contractId:'nmc-cbme-rights-preflight-v1',
  sources:r.sourceRecords.map(s=>({sourceId:s.sourceId,edition:s.edition,
   rightsMode:s.rightsMode,permissionRecorded:false,
   documentBytesVerified:false,sourceFileStored:false,publicReuseAllowed:false})),
  reusableFullTextAllowed:false,learnerPublicationAuthorized:false,
  rightsReviewRequired:true};
}
