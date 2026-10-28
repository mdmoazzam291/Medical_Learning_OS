import {escapeText as e} from './navigation-view.js';
import {SUBJECTS} from '../src/domain/content-library.js';
import {validateConceptDraft} from '../src/domain/concept-drafts.js';
import {CONCEPT_ACCEPT_ATTESTATION,validateConceptAcceptance} from '../src/domain/concept-acceptance.js';
const facets=['subjects','systems','organs','domains','tasks'];
const empty=()=>({label:'',aliases:[],classification:Object.fromEntries(facets.map(k=>[k,[]])),sourceEvidence:'',changeReason:''});
const docKey=d=>JSON.stringify([d.label,d.aliases,facets.map(k=>d.classification[k]),d.sourceEvidence,d.changeReason]);
export function conceptDraftForm(state={}){
 const d=state.document||empty(),locked=state.busy||!state.loaded||state.accepted,readonly=state.readOnly||state.accepted;
 return '<h2>Concept drafts</h2><p>Create a concept without a question, or propose a revision. Drafts remain separate from accepted coverage and learner content.</p>'+
  '<p role="status" data-concept-status>'+e(state.status||'Load the draft editor to begin.')+'</p><div class="coverage-pagination"><button type="button" data-concept-new'+(state.busy?' disabled':'')+'>New proposal</button><button type="button" data-concept-refresh'+(state.busy?' disabled':'')+'>Refresh draft list</button></div>'+
  '<form data-concept-form><fieldset'+(locked||readonly?' disabled':'')+'><label>Canonical target<select aria-label="Canonical target" name="target"'+(state.proposalId||state.pending?' disabled':'')+'><option value="">New concept (no questions required)</option>'+(state.concepts||[]).map(c=>'<option value="'+e(c.conceptId)+'"'+(state.conceptId===c.conceptId?' selected':'')+'>'+e(c.label+' · '+c.conceptId)+'</option>').join('')+'</select></label>'+
  (state.proposalId?'<p>Draft '+e(state.proposalId)+' · revision '+e(state.revision)+' · concept '+e(state.conceptId)+'</p>':'')+
  '<label>Concept name<input aria-label="Concept name" name="label" maxlength="240" required value="'+e(d.label)+'"></label><label>Aliases (one per line)<textarea aria-label="Aliases (one per line)" name="aliases" rows="2">'+e(d.aliases.join('\n'))+'</textarea></label>'+
  '<details><summary>Subjects and classification</summary><label>Subjects (select one or more)<select aria-label="Subjects (select one or more)" name="subjects" multiple size="5">'+SUBJECTS.map(id=>'<option value="'+id+'"'+(d.classification.subjects.includes(id)?' selected':'')+'>'+e(id.replaceAll('-',' '))+'</option>').join('')+'</select></label>'+facets.slice(1).map(k=>'<label>'+e(k[0].toUpperCase()+k.slice(1))+' (comma-separated IDs)<input name="'+k+'" value="'+e(d.classification[k].join(', '))+'"></label>').join('')+'<p class="muted">Use stable kebab-case IDs. Leave uncertain classifications blank.</p></details>'+
  '<label>Source evidence or locator<textarea aria-label="Source evidence or locator" name="sourceEvidence" maxlength="4000" rows="3" required>'+e(d.sourceEvidence)+'</textarea></label><label>Reason for this revision<textarea aria-label="Reason for this revision" name="changeReason" maxlength="4000" rows="2" required>'+e(d.changeReason)+'</textarea></label></fieldset>'+
  '<button type="submit"'+(state.pending?' formnovalidate':'')+(locked||readonly?' disabled':'')+'>'+e(state.pending?'Retry pending save':'Save concept draft')+'</button></form>'+
  (readonly?'<p>Historical revision: read-only. Open the latest revision to continue editing.</p>':'')+
  (state.nameMatches?.length?'<aside><strong>Name or alias matches to inspect</strong><p>'+state.nameMatches.map(c=>e(c.label+' · '+c.conceptId)).join('<br>')+'</p><p>No concepts were merged.</p></aside>':'')+(state.accepted?'<p role="status">Accepted canonical concept '+e(state.conceptId)+' · classification only. This does not approve medical claims, rights, questions or learner release.</p>':
  state.proposalId&&!state.readOnly&&!state.dirty&&!state.busy&&!state.pending?
   '<details><summary>Accept reviewed concept into canonical inventory</summary><p>Check name, aliases, meaning and classification against the supplied source. This does not publish any learning content or certify a syllabus.</p>'+
   '<form data-concept-accept-form><label>Identity/classification review evidence<textarea name="reviewNotes" minlength="20" maxlength="4000" rows="3" required'+(state.acceptancePending?' readonly':'')+'>'+e(state.acceptanceNotes||'')+'</textarea></label>'+
   '<label><input type="checkbox" name="attested" required'+(state.acceptanceConfirmed?' checked':'')+'> I checked concept identity and classification. No medical, rights or learner-publication approval is implied.</label>'+
   '<button type="submit">Accept concept identity (not publish)</button></form></details>':'')+
  '<h3>Saved drafts</h3><ul class="concept-draft-list">'+(state.drafts||[]).map(x=>'<li><button type="button" data-concept-open="'+e(x.proposalId)+'"'+(state.busy?' disabled':'')+'>'+e(x.label)+' · revision '+e(x.revision)+'</button></li>').join('')+'</ul>'+
  (state.loaded&&!state.drafts?.length?'<p>No drafts on this page.</p>':'')+'<nav class="coverage-pagination" aria-label="Concept draft pages">'+(state.offset>0?'<button type="button" data-concept-page="'+Math.max(0,state.offset-50)+'"'+(state.busy?' disabled':'')+'>Previous drafts</button>':'')+(state.nextOffset!=null?'<button type="button" data-concept-page="'+e(state.nextOffset)+'"'+(state.busy?' disabled':'')+'>Next drafts</button>':'')+'</nav>'+
  (state.history?.length?'<h3>Revision history</h3><ul>'+state.history.map(h=>'<li><button type="button" data-concept-open="'+e(state.proposalId)+'" data-concept-revision="'+e(h.revision)+'"'+(state.busy?' disabled':'')+'>Revision '+e(h.revision)+'</button> · '+e(h.recordedAt)+'</li>').join('')+'</ul>'+(state.historyTruncated?'<p>Showing the latest 50 revisions.</p>':'')+'<button type="button" data-concept-open="'+e(state.proposalId)+'"'+(state.busy?' disabled':'')+'>Open latest revision</button>':'');
}
export function mountConceptDraftEditor({root,inspect,save,accept=async()=>{throw Error('acceptance_not_configured');},window:win=window}){
 let state={document:empty(),concepts:[],drafts:[],loaded:false,dirty:false,busy:false,offset:0,history:[]},pending=null,pendingMayHaveCommitted=false,acceptPending=null,generation=0,disposed=false;
 const render=()=>{if(!disposed)root.innerHTML=conceptDraftForm({...state,pending:Boolean(pending),acceptancePending:Boolean(acceptPending)});};
 const split=(text,separator)=>String(text).split(separator).map(x=>x.trim()).filter(Boolean);
 function readForm(form){const d=new FormData(form);return {label:String(d.get('label')||''),aliases:split(d.get('aliases')||'','\n'),classification:Object.fromEntries(facets.map(k=>[k,k==='subjects'?d.getAll(k).map(String):split(d.get(k)||'',',')])),sourceEvidence:String(d.get('sourceEvidence')||''),changeReason:String(d.get('changeReason')||'')};}
 const consent=()=>!state.dirty||win.confirm('Discard unsaved concept changes and replace this form?');
 async function list(offset=0){const g=++generation;state.busy=true;state.status='Loading draft list…';render();try{const p=await inspect({offset});if(disposed||g!==generation)return;if(p?.contractId!=='admin-concept-drafts-v1'||!Array.isArray(p.concepts)||!Array.isArray(p.drafts))throw Error();state={...state,concepts:p.concepts,drafts:p.drafts,offset:p.offset,nextOffset:p.nextOffset,loaded:true,status:'Drafts loaded. Saved drafts do not change accepted coverage.'};}catch{if(!disposed&&g===generation)state.status='Draft list unavailable. Your form is preserved.';}finally{if(!disposed&&g===generation){state.busy=false;render();}}}
 function fresh(conceptId=null){const c=state.concepts.find(c=>c.conceptId===conceptId);pending=null;pendingMayHaveCommitted=false;acceptPending=null;state={...state,accepted:false,acceptanceConfirmed:false,acceptanceNotes:'',document:c?{...empty(),label:c.label,aliases:[...c.aliases],classification:structuredClone(c.classification)}:empty(),conceptId:c?.conceptId||null,baseDigest:c?.digest||null,proposalId:null,expectedDigest:null,revision:null,dirty:false,readOnly:false,history:[],nameMatches:[],status:c?'New revision proposal for '+c.conceptId:'New concept proposal. No question is required.'};render();}
 async function open(proposalId,revision=null){if(state.busy||!consent())return;const g=++generation;state.busy=true;state.status='Loading exact draft…';render();try{const p=await inspect({proposalId,revision});if(disposed||g!==generation)return;if(p?.contractId!=='admin-concept-drafts-v1'||!p.version?.document)throw Error();pending=null;pendingMayHaveCommitted=false;acceptPending=null;const v=p.version;state={...state,accepted:p.acceptance?.status==='concept_accepted',acceptanceConfirmed:false,acceptanceNotes:'',document:v.document,proposalId:v.proposalId,revision:v.revision,conceptId:v.conceptId,baseDigest:v.baseDigest,expectedDigest:v.digest,readOnly:p.isLatest===false||p.acceptance?.status==='concept_accepted',history:p.history,nameMatches:p.nameMatches||[],historyTruncated:p.historyTruncated,dirty:false,status:'Loaded saved revision '+v.revision+'.'};}catch{if(!disposed&&g===generation)state.status='Draft unavailable. Your form is preserved.';}finally{if(!disposed&&g===generation){state.busy=false;render();}}}
 async function submit(event){if(event.target.matches('[data-concept-accept-form]'))return acceptCurrent(event);if(!event.target.matches('[data-concept-form]'))return;event.preventDefault();if(state.busy||state.readOnly||!state.loaded)return;state.document=readForm(event.target);const current=structuredClone(state.document);
  try{if(!pending){pending=validateConceptDraft({schemaVersion:1,requestId:crypto.randomUUID(),proposalId:state.proposalId||null,expectedDigest:state.expectedDigest||null,conceptId:state.conceptId||null,baseDigest:state.baseDigest||null,document:current});pendingMayHaveCommitted=false;}}catch{state.status='Check the name, unique aliases, source evidence, revision reason and classification IDs.';render();return;}
  state.busy=true;state.status='Saving draft and confirming its exact revision…';render();const g=++generation;
  try{const receipt=await save(pending);pendingMayHaveCommitted=true;const packet=await inspect({proposalId:receipt.proposalId,revision:receipt.revision});if(disposed||g!==generation)return;const v=packet?.version;
   if(packet?.contractId!=='admin-concept-drafts-v1'||!v||v.proposalId!==receipt.proposalId||v.conceptId!==receipt.conceptId||v.revision!==receipt.revision||v.digest!==receipt.digest||docKey(v.document)!==docKey(pending.document))throw Error('readback_mismatch');
   const changed=docKey(current)!==docKey(pending.document);pending=null;pendingMayHaveCommitted=false;state={...state,accepted:packet.acceptance?.status==='concept_accepted',document:changed?current:v.document,proposalId:v.proposalId,revision:v.revision,conceptId:v.conceptId,baseDigest:v.baseDigest,expectedDigest:v.digest,readOnly:packet.isLatest===false,history:packet.history,nameMatches:packet.nameMatches||[],historyTruncated:packet.historyTruncated,dirty:changed,status:changed?'Prior revision confirmed. Your newer changes remain unsaved.':'Saved and confirmed revision '+v.revision+'. Accepted coverage is unchanged.'};
   const row={proposalId:v.proposalId,revision:v.revision,conceptId:v.conceptId,label:v.document.label};state.drafts=[row,...state.drafts.filter(x=>x.proposalId!==row.proposalId)].slice(0,50);
  }catch(error){if(!disposed&&g===generation){if(!pendingMayHaveCommitted&&[400,401,403,404,409,413,415].includes(Number(error?.status))){pending=null;pendingMayHaveCommitted=false;}else pendingMayHaveCommitted=true;state.status=!pending&&Number(error?.status)===409?'Conflict: reload the latest draft, or start a new proposal from the current canonical target. Your edits are preserved.':!pending?'Draft not saved. Your edits are preserved; resolve the request or access issue before trying again.':'Save not confirmed. Your edits are preserved; retry uses the same request to avoid duplicates.';state.dirty=true;}}
  finally{if(!disposed&&g===generation){state.busy=false;render();}}
 }

 async function acceptCurrent(event){
  event.preventDefault();
  if(state.busy||state.dirty||!state.proposalId||state.readOnly||state.accepted||!state.loaded||pending)return;
  const fields=new FormData(event.target);
  if(fields.get('attested')!=='on')return;
  const notes=String(fields.get('reviewNotes')||'');
  state.acceptanceNotes=acceptPending?.reviewNotes||notes;state.acceptanceConfirmed=true;
  try{
   if(!acceptPending)acceptPending=validateConceptAcceptance({
    schemaVersion:1,requestId:crypto.randomUUID(),proposalId:state.proposalId,
    revision:state.revision,digest:state.expectedDigest,reviewNotes:notes,
    attestation:CONCEPT_ACCEPT_ATTESTATION
   });
  }catch{state.status='A specific 20-character minimum review note and exact saved revision are required.';render();return;}
  state.busy=true;state.status='Accepting exact concept revision and verifying persisted receipt…';render();
  const g=++generation;
  try{
   const receipt=await accept(acceptPending);
   if(receipt?.status!=='concept_accepted'||receipt.proposalId!==acceptPending.proposalId||
     receipt.revision!==acceptPending.revision||receipt.draftDigest!==acceptPending.digest||
     receipt.conceptId!==state.conceptId)throw Error('acceptance_receipt_mismatch');
   const packet=await inspect({proposalId:state.proposalId,revision:state.revision});
   if(disposed||g!==generation)return;
   if(packet?.acceptance?.status!=='concept_accepted'||packet.acceptance.revision!==receipt.revision||
     packet.acceptance.canonicalDigest!==receipt.canonicalDigest)throw Error('acceptance_readback_mismatch');
   acceptPending=null;
   state={...state,accepted:true,readOnly:true,dirty:false,status:
    'Accepted into canonical inventory. Learner content, medical review, rights and syllabus approval remain unchanged.'};
  }catch{if(!disposed&&g===generation)state.status=
   'Acceptance not confirmed. Review fields are preserved; retry reuses the original request. No learner publication was attempted.';}
  finally{if(!disposed&&g===generation){state.busy=false;render();}}
 }
 function input(event){if(event.target.closest('[data-concept-accept-form]')){if(event.target.name==='reviewNotes')state.acceptanceNotes=event.target.value;return;}if(event.target.name==='target')return;if(event.target.closest('[data-concept-form]')&&!state.busy&&!state.readOnly){state.document=readForm(event.target.closest('form'));state.dirty=true;}}
 function change(event){if(event.target.name!=='target'){input(event);return;}if(state.busy||state.proposalId)return;if(!consent()){event.target.value=state.conceptId||'';return;}fresh(event.target.value||null);}
 function click(event){const b=event.target.closest('button');if(!b||state.busy)return;if(b.hasAttribute('data-concept-new')){if(consent())fresh();}else if(b.hasAttribute('data-concept-refresh'))list(state.offset);else if(b.hasAttribute('data-concept-page'))list(Number(b.dataset.conceptPage));else if(b.hasAttribute('data-concept-open'))open(b.dataset.conceptOpen,b.dataset.conceptRevision?Number(b.dataset.conceptRevision):null);}
 const unload=event=>{if(state.dirty||pending){event.preventDefault();event.returnValue='';}};
 root.addEventListener('submit',submit);root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('click',click);win.addEventListener('beforeunload',unload);list();
 return ()=>{disposed=true;generation++;root.removeEventListener('submit',submit);root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('click',click);win.removeEventListener('beforeunload',unload);root.replaceChildren();};
}
