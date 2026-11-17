import {escapeText as e} from './navigation-view.js';
const FINDING={'duplicate-wording':'duplicate wording','near-duplicate-in-concept':'near-duplicate in concept','no-leading-verb':'no action verb','non-measurable-verb':'non-measurable verb','no-source-binding':'no NMC row'};
// Owner edits: append-only revisions, recorded as owner edits (not faculty or clinical review).
function editMarkup(r,editing,identities){
 const id=r.objective.objectiveVersionId,identity=identities.get(r.objective.conceptId);
 if(editing?.kind==='objective'&&editing.id===id)return '<form data-objective-edit-form data-id="'+e(id)+'"><label>Objective wording<textarea name="wording" required minlength="12" maxlength="500" rows="3">'+e(r.wording)+'</textarea></label>'+
  '<label>Reason for the change<input name="changeReason" required minlength="10" maxlength="2000"></label><button type="submit">Save wording</button> <button type="button" data-edit-cancel>Cancel</button></form>';
 if(editing?.kind==='identity'&&editing.id===r.objective.conceptId&&identity)return '<form data-identity-edit-form data-id="'+e(identity.conceptId)+'"><label>Concept name<input name="label" required minlength="2" maxlength="240" value="'+e(identity.label)+'"></label>'+
  '<label>Other names (one per line)<textarea name="aliases" rows="3">'+e(identity.aliases.join('\n'))+'</textarea></label><label>Reason for the change<input name="changeReason" required minlength="10" maxlength="2000"></label>'+
  '<button type="submit">Save concept name</button> <button type="button" data-edit-cancel>Cancel</button></form>';
 return '<p><button type="button" data-edit-objective="'+e(id)+'">Edit wording</button>'+(identity?' <button type="button" data-edit-identity="'+e(identity.conceptId)+'">Edit concept name</button>':'')+'</p>';
}
function requirementMarkup(r,objectives){
 const sourceIssue=r.identifierState==='unresolved'||r.amendmentNotice||r.topicLabel==='Unresolved topic heading';
 const versions=[...new Set(r.objectiveVersionIds)];
 const state=sourceIssue?(versions.length?'Source exception resolved · Draft objectives linked':'Source resolution needed'):versions.length?'Draft objectives linked':'No linked objective in this pack';
 const details=versions.length?'<ul>'+versions.map(id=>{
  const draft=objectives.get(id);
  if(!draft)return '<li>'+e(id)+' · Draft details unavailable</li>';
  const identity=draft.identityState==='current'?'Identity current':draft.identityState==='changed'?'Identity changed':'Identity unavailable';
  return '<li><strong>'+e(draft.canonicalLabel)+'</strong> · '+e(identity)+'<p>'+e(draft.wording)+'</p><small>'+e(draft.objective.task)+' / '+e(draft.objective.depth)+' · '+e(id)+'</small></li>';
 }).join('')+'</ul>':'';
 return '<li><strong>'+e(r.code)+'</strong> · '+e(r.subjectId)+' · '+e(r.topicLabel)+' · PDF page '+e(r.pdfPage)+
  '<p>'+e(state)+(r.amendmentNotice?' · amendment requires review':'')+' · Coverage unverified</p>'+
  (details?'<details><summary>Review '+versions.length+' proposed objective'+(versions.length===1?'':'s')+'</summary>'+details+'</details>':'')+'</li>';
}
function namesOnlyMarkup(preview){
 if(!preview||![preview.concepts,preview.headings,preview.aliases,preview.held].every(Array.isArray))return '';
 const section=(heading,items)=>'<h4>'+e(heading)+'</h4><ul>'+items.map(item=>'<li>'+e(item)+'</li>').join('')+'</ul>';
 return '<details><summary>Names-only draft preview</summary><p>Read-only proposals. Source links do not establish accepted mappings.</p>'+
 section('Proposed concept names',preview.concepts.map(row=>row.label+' · '+row.codes.join(', ')))+
 section('Provisional navigation headings',preview.headings)+
 section('Provisional search aliases',preview.aliases)+
 section('Held entries',preview.held)+'</details>';
}
function namesOnlyRelationshipMarkup(relationships){
 if(!Array.isArray(relationships)||!relationships.length)return '';
 const endpoint=({label,codes})=>e(label)+' ('+e(codes.join(', '))+')';
 return '<details><summary>Proposed concept relationships</summary><ul>'+
  relationships.map(({narrower,broader})=>'<li>'+endpoint(narrower)+' is narrower than '+endpoint(broader)+'</li>').join('')+
  '</ul></details>';
}
export function foundationReviewMarkup(p=null,filters={},message='Load the first objective proposal batch to inspect it.',editing=null){
 const intro='<h2>NMC foundation objective drafts</h2><p>AI-generated original learning goals. Clinical review and source alignment are pending. Reference appearances are not a unique competency denominator. This batch does not establish curriculum coverage or learner readiness.</p>';
 if(!p)return intro+'<p role="status">'+e(message)+'</p><button type="button" data-foundation-load>Load objective drafts</button>';
 const objectivesByVersion=new Map(p.objectives.map(d=>[d.objective.objectiveVersionId,d]));
 const identities=new Map((p.editableIdentities||[]).map(i=>[i.conceptId,i]));
 return intro+'<p role="status">'+e(message)+'</p><p>Accepted mappings: 0 · Learner activation: off · Coverage: not established</p>'+
 '<p>'+e(p.totals.objectiveDrafts)+' original drafts · '+e(p.totals.sourceLinkedReferences)+' source appearances with proposed links · '+e(p.totals.unboundObjectiveDrafts)+' drafts without NMC links · '+e(p.totals.sourceReferences)+' reference appearances</p>'+
 (!p.catalogVersionMatches?'<p role="alert">Catalog version changed since authoring. Recheck the draft context.</p>':'')+
 (!p.identityBindingsCurrent?'<p role="alert">Canonical identities changed or are missing. These links require review.</p>':'')+
 namesOnlyMarkup(p.namesOnlyPreview)+
 namesOnlyRelationshipMarkup(p.namesOnlyRelationships)+
 '<details><summary>Original objectives and canonical identities</summary><ul>'+p.objectives.map(r=>'<li><strong>'+e(r.canonicalLabel)+'</strong> · '+e(r.identityState)+(r.identityKind==='accepted-private'?' · Admin-private identity':'')+'<p>'+e(r.wording)+'</p>'+(r.wordingRevision?'<p><small>Owner-edited wording, revision '+e(r.wordingRevision)+'. Registry wording: '+e(r.registryWording)+'</small></p>':'')+
 (r.reviewState==='needs-attention'?'<p><strong>Needs attention: '+e((r.reviewFindings||[]).map(f=>FINDING[f]||f).join(', '))+'</strong></p>':'')+
 '<p>'+e(r.objective.task)+' / '+e(r.objective.depth)+(r.objective.prerequisites?.length?' · '+e(r.objective.prerequisites.length)+' prerequisite'+(r.objective.prerequisites.length===1?'':'s'):'')+' · '+e(r.objective.conceptId)+' · '+e(r.objective.objectiveVersionId)+'</p>'+editMarkup(r,editing,identities)+
 (r.sourceReferences.length?'<p>Proposed source links: '+r.sourceReferences.map(b=>e(b.code)+' ('+e(b.subjectId)+', PDF page '+e(b.sourcePage)+')').join('; ')+'. Each link proposes a specific task for review. Full competency coverage requires separate review.</p>':'<p>NMC source alignment unresolved.</p>')+'</li>').join('')+'</ul></details>'+
 '<form data-foundation-filters><label>Subject<select name="subject" aria-label="Objective reference subject"><option value="">All subjects</option>'+p.subjects.map(s=>'<option value="'+e(s)+'"'+(s===filters.subject?' selected':'')+'>'+e(s.replaceAll('-',' '))+'</option>').join('')+'</select></label><label>Code or topic<input name="search" maxlength="200" value="'+e(filters.search||'')+'"></label><button type="submit">Filter references</button></form>'+
 '<p>'+e(p.filteredReferences)+' filtered source appearances; showing '+(p.requirements.length?e(p.offset+1)+'–'+e(p.offset+p.requirements.length):'0')+'</p><ul>'+p.requirements.map(r=>requirementMarkup(r,objectivesByVersion)).join('')+'</ul>'+
 '<button type="button" data-foundation-load>Refresh drafts</button> '+(p.offset?'<button type="button" data-foundation-prev>Previous references</button> ':'')+(p.nextOffset!==null?'<button type="button" data-foundation-next>Next references</button>':'');
}
const uuid=()=>crypto.randomUUID();
async function sha256(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function mountFoundationReview({root,load,identity,editObjective=null,editIdentity=null,window:win=window}){
 let generation=0,disposed=false,page=null,filters={},editing=null;
 const render=message=>{root.innerHTML=foundationReviewMarkup(page,filters,message,editing);};
 const clear=()=>{generation++;page=null;editing=null;root.innerHTML=foundationReviewMarkup();};
 let doneMessage=null;
 async function read(next={}){
  const current=++generation;filters=next;page=null;editing=null;root.innerHTML=foundationReviewMarkup(null,{},'Loading objective drafts…');
  try{
   const before=await identity();if(disposed||current!==generation)return;if(!before)throw new Error();
   const result=await load(next);const after=await identity();
   if(disposed||current!==generation)return;
   if(!after||before!==after)throw new Error();
   if(result?.contractId!=='admin-foundation-objective-drafts-v1'||result.acceptedMappings!==0||result.clinicalApproval!==false||result.learnerActivation!==false||!Array.isArray(result.objectives)||!Array.isArray(result.requirements)||!Array.isArray(result.subjects))throw new Error();
   page=result;root.innerHTML=foundationReviewMarkup(page,filters,doneMessage||'Draft review required.');doneMessage=null;
  }catch{if(!disposed&&current===generation){page=null;root.innerHTML=foundationReviewMarkup(null,{},'Drafts could not be loaded. Check Admin access and retry.');}}
 }
 async function save(kind,form){
  const data=Object.fromEntries(new FormData(form)),id=form.getAttribute('data-id'),before=await identity();
  if(!before||disposed)return;
  try{
   if(kind==='objective'){const o=page.objectives.find(x=>x.objective.objectiveVersionId===id);
    await editObjective({schemaVersion:1,requestId:uuid(),objectiveVersionId:id,baseWordingSha256:await sha256(o.wording),wording:data.wording,changeReason:data.changeReason});}
   else{const i=page.editableIdentities.find(x=>x.conceptId===id);
    await editIdentity({schemaVersion:1,requestId:uuid(),conceptId:id,previousIdentityDigest:i.identityDigest,label:data.label,
     aliases:String(data.aliases||'').split('\n').map(x=>x.trim()).filter(Boolean),changeReason:data.changeReason});}
  }catch(error){if(!disposed&&page){render('Not saved: '+(error?.code||'request failed')+'. Nothing was changed.');}return;}
  doneMessage=kind==='objective'?'Wording saved as an owner edit (not faculty review).':'Concept name saved as an owner edit. Linked objectives show "changed" until the registry is re-pinned.';
  return read(filters);
 }
 function click(event){const b=event.target.closest('button');if(!b)return;
  if(page&&editObjective&&b.hasAttribute?.('data-edit-objective')){editing={kind:'objective',id:b.getAttribute('data-edit-objective')};return render('Editing objective wording.');}
  if(page&&editIdentity&&b.hasAttribute?.('data-edit-identity')){editing={kind:'identity',id:b.getAttribute('data-edit-identity')};return render('Editing concept name.');}
  if(page&&b.hasAttribute?.('data-edit-cancel')){editing=null;return render('Edit cancelled.');}if(b.hasAttribute('data-foundation-load'))return read({...filters,offset:0});if(page&&b.hasAttribute('data-foundation-next'))return read({...filters,offset:page.nextOffset});if(page&&b.hasAttribute('data-foundation-prev'))return read({...filters,offset:Math.max(0,page.offset-50)});}
 function submit(event){
  if(event.target.matches?.('[data-objective-edit-form]')){event.preventDefault();return save('objective',event.target);}
  if(event.target.matches?.('[data-identity-edit-form]')){event.preventDefault();return save('identity',event.target);}
  if(!event.target.matches('[data-foundation-filters]'))return;event.preventDefault();return read({...Object.fromEntries(new FormData(event.target)),offset:0});}
 root.innerHTML=foundationReviewMarkup();root.addEventListener('click',click);root.addEventListener('submit',submit);
 for(const name of ['storage','focus','pageshow','mlos:access'])win.addEventListener(name,clear);
 return ()=>{disposed=true;generation++;root.removeEventListener('click',click);root.removeEventListener('submit',submit);for(const name of ['storage','focus','pageshow','mlos:access'])win.removeEventListener(name,clear);page=null;root.replaceChildren();};
}
