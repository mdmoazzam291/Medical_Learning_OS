import {escape as e,request} from '/web/content-library-client.js';
const root=document.querySelector('#medical-relationships');
const list=root.querySelector('#relationship-list'),detail=root.querySelector('#relationship-detail'),status=root.querySelector('#relationship-status');
const stageForm=root.querySelector('#relationship-stage'),input=root.querySelector('#relationship-json');
let selected=null,busy=false,reviewDirty=false,stageDirty=false,generation=0,queueGeneration=0;
const pretty=value=>'<pre>'+e(JSON.stringify(value,null,2))+'</pre>';
const route=id=>'/relationships/'+encodeURIComponent(id);
const discard=()=>!reviewDirty||window.confirm('Discard unsaved relationship review changes and refresh the inspection?');
const message=error=>{status.textContent=error.message;};
async function load(){
 const current=++queueGeneration;
 try{
  const queue=await request('/relationships');if(current!==queueGeneration)return;
  stageForm.querySelector('fieldset').disabled=false;
  list.innerHTML=queue.versions.map(v=>'<p><button type="button" data-relationship="'+e(v.relationshipVersionId)+'">'+e(v.relationshipVersionId)+'</button> · '+e(v.status)+'</p>').join('')||'<p>No relationship drafts or publications yet.</p>';
 }catch(error){if(current===queueGeneration){list.textContent=error.message;stageForm.querySelector('fieldset').disabled=true;}}
}
function packetMarkup(packet){
 const v=packet.version,a=v.assertion,events=packet.events;
 const retired=events.some(x=>x.action==='retired'),published=events.some(x=>x.action==='published');
 const grants=['medical','references','rights'].every(k=>packet.reviewKinds.includes(k));
 const current=JSON.stringify(packet.currentBindings)===JSON.stringify(v.bindings);
 const gates=[...(!packet.isLatest?['A newer version exists. Inspect it before publishing.']:[]),...(!current?['The source or canonical concepts changed. Stage a corrected version before review.']:[]),...(!packet.rightsReady?['Source rights are unresolved for this exact version.']:[]),...(!grants?['Publication requires current Medical, References and Rights reviewer grants.']:[])];
 const canPublish=!retired&&!published&&packet.isLatest&&current&&packet.rightsReady&&grants;
 return '<h3>Inspect '+e(v.relationshipVersionId)+'</h3><p><strong>'+e(a.fromConceptId)+' → '+e(a.toConceptId)+'</strong> · '+e(a.relationType)+'</p><p>'+e(a.claimText)+'</p>'+
  '<p>Exact target digest: <code>'+e(v.digest)+'</code></p><p>State: '+(retired?'retired':published?'published':'draft')+'</p>'+
  gates.map(text=>'<p class="review-packet">'+e(text)+'</p>').join('')+
  '<details open><summary>Exact assertion and external provenance</summary>'+pretty(a)+'</details>'+
  '<details open><summary>Canonical endpoints, current source and bindings</summary>'+pretty({concepts:packet.concepts,source:packet.source,reviewedBindings:v.bindings,currentBindings:packet.currentBindings})+'</details>'+
  '<details><summary>Immutable review and retirement history</summary>'+pretty(events)+'</details>'+
  '<button type="button" data-relationship-refresh>Refresh relationship inspection</button> '+
  (packet.isLatest?'<button type="button" data-relationship-correct>Prepare relationship correction</button>':'')+
  (canPublish?'<form id="relationship-publish" class="import-review"><label>Relationship review notes<textarea name="reviewNotes" maxlength="4000" required></textarea></label><label><input type="checkbox" name="attested" required>I curated externally authored content and inspected this exact assertion, direction, source, evidence and reuse permission; I approve medical accuracy and references.</label><button type="submit">Publish reviewed relationship</button></form>':'')+
  (!retired?'<form id="relationship-retire" class="import-review"><label>Relationship retirement reason<textarea name="reason" maxlength="4000" required></textarea></label><button type="submit">Retire relationship version</button></form>':'<p>This version is retired. A correction needs a new version and fresh review.</p>');
}
async function inspect(id,{internal=false}={}){
 if(!internal&&(busy||!discard()))return;
 const current=++generation;selected=null;reviewDirty=false;detail.textContent='Loading exact relationship…';
 try{const packet=await request(route(id));if(current!==generation)return;selected=packet;detail.innerHTML=packetMarkup(packet);}
 catch(error){if(current===generation)detail.textContent=error.message;}
}
list.addEventListener('click',event=>{const b=event.target.closest('[data-relationship]');if(b)inspect(b.dataset.relationship);});
stageForm.addEventListener('input',()=>{stageDirty=true;});
stageForm.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!discard())return;
 const raw=input.value;if(new TextEncoder().encode(raw).length>24576){status.textContent='Maximum assertion size is 24 KiB.';return;}
 let assertion;try{assertion=JSON.parse(raw);}catch{status.textContent='Enter valid assertion JSON.';return;}
 busy=true;const button=stageForm.querySelector('button');button.disabled=true;
 try{const receipt=await request('/relationships',{assertion});stageDirty=false;reviewDirty=false;await load();await inspect(receipt.relationshipVersionId,{internal:true});status.textContent='Draft staged. It has no publication authority. Inspect the exact source and assertion before approval.';}
 catch(error){message(error);}finally{busy=false;button.disabled=false;}
});
detail.addEventListener('input',()=>{reviewDirty=true;});
detail.addEventListener('change',()=>{reviewDirty=true;});
detail.addEventListener('click',event=>{
 if(busy||!selected)return;
 if(event.target.closest('[data-relationship-refresh]')){inspect(selected.version.relationshipVersionId);return;}
 if(event.target.closest('[data-relationship-correct]')){
  if(stageDirty&&!window.confirm('Replace the unsaved relationship draft with a correction of this version?'))return;
  const v=selected.version;
  input.value=JSON.stringify({...v.assertion,version:v.assertion.version+1,previousVersionId:v.relationshipVersionId,previousDigest:v.digest},null,2);
  stageDirty=true;status.textContent='Edit this correction before staging. Staging a newer version immediately hides the previous relationship from learners until fresh review.';input.focus();
 }
});
detail.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!selected)return;
 const form=event.target,publish=form.id==='relationship-publish';if(!publish&&form.id!=='relationship-retire')return;
 busy=true;const button=form.querySelector('button'),v=selected.version;button.disabled=true;
 try{
  await request(route(v.relationshipVersionId)+(publish?'/publish':'/retire'),publish?{digest:v.digest,reviewNotes:form.elements.reviewNotes.value,attested:form.elements.attested.checked}:{digest:v.digest,reason:form.elements.reason.value});
  reviewDirty=false;await load();await inspect(v.relationshipVersionId,{internal:true});status.textContent=publish?'Published exact relationship version.':'Retired exact relationship version.';
 }catch(error){message(error);}finally{busy=false;button.disabled=false;}
});
window.addEventListener('beforeunload',event=>{if(stageDirty||reviewDirty){event.preventDefault();event.returnValue='';}});
load();
