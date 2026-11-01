/**
 * Advisory content/provenance warnings; never authorizes publication, source rights
 * or medical accuracy. Only identifiers and warning codes may leave this module.
 */
const MAX_ROWS=10000,MAX_TEXT=100000;
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const read=(x,k)=>plain(x)&&Object.prototype.hasOwnProperty.call(x,k)?x[k]:undefined;
const str=x=>{if(x==null)return '';if(typeof x!=='string'||x.length>MAX_TEXT)throw TypeError('preflight_text_invalid');return x};
const id=(x,keys)=>{const v=keys.map(k=>read(x,k)).find(y=>typeof y==='string'&&y.trim());if(!v||v.length>200||!/^[A-Za-z0-9][A-Za-z0-9_.:@-]*$/.test(v))throw TypeError('preflight_identifier_invalid');return v};
const DRAFT=/\[\s*(?:review\s+draft|draft\s+for\s+review)\s*\]|\bunapproved\s+(?:ai[-\s]*assisted\s+)?review\s+draft\b|\bnot\s+human[-\s]*approved\b|\bpending\s+(?:medical|references?|rights|human)\s+review\b/i;
const PENDING=/\b(?:not\s+human[-\s]*approved|review\s+pending|unapproved\s+(?:ai[-\s]*assisted\s+)?review\s+draft|rights\s+not\s+(?:verified|confirmed))\b/i;
const UNCERTAIN=/\b(?:unknown\s+(?:copyright|rights|licen[cs]e|reuse\s+permission)|(?:copyright|rights|licen[cs]e|reuse\s+permission)(?:\s+status)?\s+(?:is\s+|are\s+)?(?:unknown|unverified|pending|not\s+(?:verified|confirmed|cleared))|permission\s+(?:is\s+)?(?:pending|unknown|not\s+(?:verified|confirmed|granted))|reuse\s+(?:not\s+(?:authorized|cleared|verified)|pending))\b/i;
const PERMISSIVE=new Set(['owned','licensed','public_domain']);
export function inspectPublicationEvidenceWarnings({notes=[],sources=[],inspectDrafts=false}={}){
  if(!Array.isArray(notes)||!Array.isArray(sources)||notes.length>MAX_ROWS||sources.length>MAX_ROWS||typeof inspectDrafts!=='boolean')throw TypeError('preflight_input_invalid');
  const warnings=[],ids=new Set();
  const emit=(scope,targetId,code)=>warnings.push({scope,targetId,code,action:'independent_human_review_required'});
  for(const n of notes){
    if(!plain(n))throw TypeError('preflight_note_invalid');
    const target=id(n,['noteVersionId','id','noteId']),key='note:'+target;
    if(ids.has(key))throw TypeError('preflight_duplicate_identifier');ids.add(key);
    const status=str(read(n,'status')).toLowerCase(),title=str(read(n,'title')),body=str(read(n,'bodyMarkdown')??read(n,'body_markdown'));
    const provenance=read(n,'provenance');if(provenance!==undefined&&!plain(provenance))throw TypeError('preflight_provenance_invalid');
    const evidence=str(read(provenance,'evidence'));
    // A partially selected or legacy published note is not a clean scan: the
    // wording and provenance cannot be inspected unless every field is present.
    if(status==='published'&&(!title.trim()||!body.trim()||!evidence.trim()))
      emit('note',target,'published_note_evidence_incomplete');
    if((inspectDrafts||status==='published')&&(DRAFT.test(title)||DRAFT.test(body)||PENDING.test(evidence)))emit('note',target,'note_contains_unresolved_review_language');
  }
  for(const s of sources){
    if(!plain(s))throw TypeError('preflight_source_invalid');
    const target=id(s,['sourceId','source_id','id']),key='source:'+target;
    if(ids.has(key))throw TypeError('preflight_duplicate_identifier');ids.add(key);
    const rights=read(s,'rights');if(rights!==undefined&&!plain(rights))throw TypeError('preflight_rights_invalid');
    const status=str(read(rights,'status')??read(s,'rightsStatus')??read(s,'rights_status')).toLowerCase();
    const evidence=str(read(rights,'evidence')??read(s,'rightsEvidence')??read(s,'rights_evidence')??read(s,'evidence'));
    if(!status||status==='unknown')emit('source',target,'source_rights_status_unresolved');
    if(PERMISSIVE.has(status)&&UNCERTAIN.test(evidence))emit('source',target,'permission_claim_conflicts_with_evidence');
    if(status==='public_domain'&&!evidence.trim())emit('source',target,'public_domain_claim_lacks_rights_evidence');
  }
  warnings.sort((a,b)=>a.scope.localeCompare(b.scope)||a.targetId.localeCompare(b.targetId)||a.code.localeCompare(b.code));
  return {schemaVersion:1,approvalGranted:false,publicationDecision:'not_evaluated',checkedNotes:notes.length,checkedSources:sources.length,warnings};
}
