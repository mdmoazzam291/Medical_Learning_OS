// Identity and classification acceptance is independent of medical and learner publication.
const fail=()=>{throw new TypeError('concept_accept_invalid');};
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
export const CONCEPT_ACCEPT_ATTESTATION='identity-and-classification-reviewed-not-medical-or-learner-release';
export function validateConceptAcceptance(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  Object.keys(value).sort().join('|')!==['schemaVersion','requestId','proposalId','revision','digest','reviewNotes','attestation'].sort().join('|'))fail();
 const {schemaVersion,requestId,proposalId,revision,digest,reviewNotes,attestation}=value;
 if(schemaVersion!==1||!uuid(requestId)||!uuid(proposalId)||!Number.isInteger(revision)||
  revision<1||revision>10000||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest)||
  typeof reviewNotes!=='string'||reviewNotes.trim().length<20||reviewNotes.length>4000||
  /[\u0000-\u001f]/.test(reviewNotes)||attestation!==CONCEPT_ACCEPT_ATTESTATION)fail();
 return structuredClone(value);
}
