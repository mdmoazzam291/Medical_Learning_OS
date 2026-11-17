import {escapeText as e} from './navigation-view.js';
const DECLARATION='I reviewed these concept identities and classifications. This is not medical review, rights review or learner release.';
export function batchReviewMarkup(b=null,message='Load the pending concept batch to review it.',result=null){
 const intro='<h2>Canonical concept batch</h2><p>Accepting creates private concept identities with receipts. It does not publish anything to learners and is not medical review.</p>';
 if(!b)return intro+'<p role="status">'+e(message)+'</p><button type="button" data-batch-load>Load concept batch</button>';
 const head=b.kind==='subject-revision'?'<p><strong>'+e(b.batchId)+'</strong> · Subject revisions for '+e(b.counts.revisions)+' accepted private concepts · '+e(b.counts.addedSubjects)+' subjects added. Only subjects are added; names and other classification are unchanged.</p>':
  '<p><strong>'+e(b.batchId)+'</strong> · '+e(b.counts.newConcepts)+' new concepts · '+e(b.counts.reusedAcceptedIdentities)+' reused identities · '+e(b.counts.objectives)+' objectives · '+e(b.counts.sourceRows)+' source rows</p>';
 const flagged=b.concepts.filter(c=>c.reviewFlags?.length).length;
 const list=(flagged?'<p>Listed with identity-changing items first: '+e(flagged)+' flagged (reused identities, renames, splits, merges, umbrellas). Umbrella concepts organise navigation and are not scored as mastery units.</p>':'')+'<details><summary>Review all '+e(b.concepts.length)+' concepts</summary><ol class="concept-draft-list">'+b.concepts.map(c=>'<li><strong>'+e(c.label)+'</strong>'+(c.conceptType?' <small>['+e(c.conceptType)+(c.umbrella?', umbrella':'')+']</small>':'')+(c.reviewFlags?.length?' <small>Flags: '+e(c.reviewFlags.join(', '))+'</small>':'')+(c.existingConceptId?' <small>(already accepted: '+e(c.existingConceptId)+')</small>':'')+
  (c.aliases.length?'<br><small>Aliases: '+e(c.aliases.join(', '))+'</small>':'')+'<br><small>'+e(c.classification.subjects.join(', '))+' · '+e(c.classification.systems.join(', '))+' · '+e(c.classification.domains.join(', '))+' · '+e(c.linkedCodes.join(', '))+'</small>'+
  '<ul>'+c.objectives.map(o=>'<li>'+e(o.code)+' · '+e(o.task)+' / '+e(o.depth)+': '+e(o.wording)+'</li>').join('')+'</ul></li>').join('')+'</ol></details>';
 if(b.acceptance)return intro+head+'<p role="status">Accepted on '+e(b.acceptance.acceptedAt)+' · '+e(b.acceptance.items)+' identities with receipts.</p>'+list;
 const done=result?'<p role="status">Accepted '+e(result.items)+' concepts with receipts.</p>':'';
 return intro+head+'<p role="status">'+e(message)+'</p>'+done+list+
 '<form data-batch-accept><label>Review notes (at least 20 characters)<textarea name="reviewNotes" required minlength="20" maxlength="4000" rows="3"></textarea></label>'+
 '<label class="review-attestation"><input type="checkbox" name="attested" required> '+e(DECLARATION)+'</label><button type="submit">Accept batch</button></form>';
}
export function mountBatchReview({root,load,accept,identity,window:win=window,uuid=()=>crypto.randomUUID()}){
 let generation=0,disposed=false,batch=null,pending=null;
 const render=(msg,result)=>{root.innerHTML=batchReviewMarkup(batch,msg,result);};
 async function read(){
  const current=++generation;batch=null;render('Loading concept batch…');
  try{const who=await identity();if(!who)throw new Error();const b=await load();if(disposed||current!==generation)return;
   if(b?.contractId!=='nmc-concept-batch-v1'||b.learnerActivation!==false||!Array.isArray(b.concepts))throw new Error();batch=b;render(b.acceptance?'Batch already accepted.':'Review required.');}
  catch{if(!disposed&&current===generation){batch=null;render('Batch could not be loaded. Check Admin access and retry.');}}
 }
 async function submit(ev){
  if(!ev.target.matches('[data-batch-accept]')||!batch)return;ev.preventDefault();
  const data=new FormData(ev.target);if(data.get('attested')!=='on')return;
  pending=pending||uuid();const current=++generation;render('Accepting batch…');
  try{const r=await accept({requestId:pending,batchId:batch.batchId,reviewNotes:String(data.get('reviewNotes')||''),attested:true});
   if(disposed||current!==generation)return;if(r?.status!=='batch_accepted')throw new Error();pending=null;
   batch={...batch,acceptance:{acceptedAt:r.acceptedAt||new Date().toISOString(),items:r.items}};render('Batch accepted.',r);}
  catch(err){if(!disposed&&current===generation)render('Acceptance failed: '+(err?.code||'error')+'. Nothing was accepted; you can retry.');}
 }
 function click(ev){if(ev.target.closest('button')?.hasAttribute('data-batch-load'))return read();}
 render();root.addEventListener('click',click);root.addEventListener('submit',submit);
 const clear=()=>{generation++;batch=null;pending=null;render();};
 for(const n of ['storage','pageshow','mlos:access'])win.addEventListener(n,clear);
 return ()=>{disposed=true;generation++;root.removeEventListener('click',click);root.removeEventListener('submit',submit);for(const n of ['storage','pageshow','mlos:access'])win.removeEventListener(n,clear);root.replaceChildren();};
}
