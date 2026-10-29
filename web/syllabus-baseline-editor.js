import registry from '../data/preparation-curriculum.js';
import {escapeText as e} from './navigation-view.js';
import {validateBaselineDraft} from '../src/domain/syllabus-baseline-drafts.js';
const blank=()=>({label:'',pathwayVersionId:registry.pathways.find(p=>p.status==='active')?.pathwayVersionId||'',
 sourceKind:'historical',sourceLocator:'',sourceVersion:'',scopeDeclaration:'partial',conceptIds:[],changeReason:''});
// JSONB may reorder object keys; compare all fields while retaining array order.
const signature=d=>Array.isArray(d)?'['+d.map(signature).join(',')+']':
 d&&typeof d==='object'?'{'+Object.keys(d).sort().map(k=>JSON.stringify(k)+':'+signature(d[k])).join(',')+'}':JSON.stringify(d);
const reviewPacketMarkup=p=>!p?'':(
 '<section class="review-packet" data-syllabus-review-packet aria-label="Syllabus review readiness">'+
 '<h3>Scope and objective review preflight</h3>'+
 '<p role="status">Review required. This is not an accepted or official syllabus.</p>'+
 '<p>Source: '+e(p.sourceKind)+' · '+e(p.sourceVersion)+' · '+e(p.sourceLocator)+'</p>'+
 '<p>Pathway: '+e(p.pathwayVersionId)+' · Declared scope: '+e(p.scopeDeclaration)+'</p>'+
 '<p>Proposed concept identities: '+e(p.proposedConcepts)+' · Admin-private (not learner-published): '+
 e(p.privateAcceptedConcepts.length)+' · Exact reviewed curriculum-mapped concepts: '+
 e(p.exactMappedConcepts==null?'Not evaluated':p.exactMappedConcepts)+'</p>'+
 '<p>Current catalog v'+e(p.currentCatalogVersion)+' · proposal v'+e(p.authoredCatalogVersion)+
 ' · Preparation Registry '+e(p.registryVersion)+'</p>'+
 '<p>Review blockers: '+e(p.blockers.join(', '))+'</p>'+
 '<details><summary>Exact objective mapping by proposed concept</summary><ul>'+
 p.rows.slice(0,100).map(r=>'<li>'+e(r.label)+' ('+e(r.conceptId)+', '+e(r.identityKind)+'): '+e(r.objectiveState)+
 (r.exactApprovedMappings.length?' — '+e(r.exactApprovedMappings.map(o=>o.objectiveVersionId+' ['+o.task+'/'+o.depth+']').join(', ')):'')+'</li>').join('')+
 '</ul>'+(p.rows.length>100?'<p>Showing first 100 of '+e(p.rows.length)+' proposed concepts. Source packet retains all IDs.</p>':'')+
 '</details><p>Coverage percentage: not established. Independent source review and named curriculum mapping approval are still required.</p>'+
 '</section>'
);

export function syllabusBaselineForm(s={}){
 const d=s.document||blank(),disabled=s.busy||!s.loaded,readonly=s.readOnly;
 const paths=registry.pathways.filter(p=>p.status==='active');
 const option=(value,title,current)=>'<option value="'+e(value)+'"'+(value===current?' selected':'')+'>'+e(title)+'</option>';
 return '<section class="concept-editor"><h2>Proposed syllabus checklist</h2>'+
 '<p>Private, versioned scope proposal. Indexed concepts are not approved exam objectives; no syllabus percentage or learner release follows.</p>'+
 '<p role="status" data-syllabus-status>'+e(s.status||'Load checklist proposals to begin.')+'</p>'+
 '<div class="coverage-pagination"><button type="button" data-syllabus-new'+(s.busy?' disabled':'')+'>New checklist draft</button> '+
 '<button type="button" data-syllabus-refresh'+(s.busy?' disabled':'')+'>Refresh draft list</button></div>'+
 '<form data-syllabus-form><fieldset'+(disabled||readonly?' disabled':'')+'>'+
 (s.baselineId?'<p>Draft '+e(s.baselineId)+' · revision '+e(s.revision)+'</p>':'')+
 '<label>Checklist label<input name="label" maxlength="240" required value="'+e(d.label)+'"></label>'+
 '<label>Preparation pathway<select name="pathwayVersionId"'+(s.baselineId?' disabled':'')+'>'+
 paths.map(p=>option(p.pathwayVersionId,p.label+' · '+p.pathwayVersionId,d.pathwayVersionId)).join('')+'</select></label>'+
 '<label>Source characterization<select name="sourceKind">'+
 [['historical','Historical / observed'],['official','Official source claimed (unverified)'],['expert','Expert proposed (unverified)']].map(([v,t])=>option(v,t,d.sourceKind)).join('')+
 '</select></label>'+
 '<label>Exact source locator<textarea name="sourceLocator" maxlength="2000" rows="2" required>'+e(d.sourceLocator)+'</textarea></label>'+
 '<label>Source edition or version<input name="sourceVersion" maxlength="240" required value="'+e(d.sourceVersion)+'"></label>'+
 '<label>Declared checklist scope<select name="scopeDeclaration">'+
 option('partial','Partial proposed scope',d.scopeDeclaration)+option('complete-proposed','Proposed complete (not verified)',d.scopeDeclaration)+'</select></label>'+
 '<label>Canonical or Admin-private accepted concept IDs (one per line)<textarea name="conceptIds" rows="5" spellcheck="false">'+e(d.conceptIds.join('\n'))+'</textarea></label>'+
 '<p class="muted">Use published canonical IDs or immutable Admin-accepted private IDs. Draft-only/unaccepted IDs are rejected. Private identities remain invisible to learners and cannot establish an approved syllabus denominator.</p>'+
 '<label>Reason for proposal or revision<textarea name="changeReason" maxlength="2000" required rows="2">'+e(d.changeReason)+'</textarea></label></fieldset>'+
 '<button type="submit"'+(s.pending?' formnovalidate':'')+(disabled||readonly?' disabled':'')+'>'+
 (s.pending?'Retry pending draft save':'Save checklist draft')+'</button></form>'+
 (readonly?'<p>Historical revision: read-only. Open latest before editing.</p>':'')+
 (s.baselineId?'<div class="coverage-pagination"><button type="button" data-syllabus-preflight'+(s.busy||s.dirty||s.pending?' disabled':'')+'>Check scope and objective alignment</button></div>':'')+
 reviewPacketMarkup(s.reviewPacket)+
 '<h3>Saved checklist drafts</h3><ul>'+
 (s.baselines||[]).map(x=>'<li><button type="button" data-syllabus-open="'+e(x.baselineId)+'"'+(s.busy?' disabled':'')+'>'+e(x.label)+' · '+e(x.pathwayVersionId)+' · revision '+e(x.revision)+' · '+e(x.conceptCount)+' proposed concepts</button></li>').join('')+'</ul>'+
 (s.loaded&&!s.baselines?.length?'<p>No checklist drafts on this page.</p>':'')+
 '<nav class="coverage-pagination">'+(s.offset>0?'<button type="button" data-syllabus-page="'+Math.max(0,s.offset-50)+'">Previous</button>':'')+
 (s.nextOffset!=null?'<button type="button" data-syllabus-page="'+e(s.nextOffset)+'">Next</button>':'')+'</nav>'+
 (s.history?.length?'<h3>Immutable revision history</h3><ul>'+s.history.map(h=>
 '<li><button type="button" data-syllabus-open="'+e(s.baselineId)+'" data-syllabus-revision="'+e(h.revision)+'">'+e('Revision '+h.revision)+'</button></li>').join('')+
 '</ul><button type="button" data-syllabus-open="'+e(s.baselineId)+'">Open latest revision</button>':'')+
 '<p class="muted">Draft status only. No medical review, objective mapping, official syllabus certification, question coverage or learner readiness inferred.</p></section>';
}
export function mountSyllabusBaselineEditor({root,inspect,save,preflight=async()=>{throw Error('preflight_unavailable');},window:win=window}){
 let s={document:blank(),baselines:[],loaded:false,busy:false,dirty:false,readOnly:false,offset:0,history:[]};
 let pending=null,uncertain=false,gen=0,disposed=false;
 const render=()=>{if(!disposed)root.innerHTML=syllabusBaselineForm({...s,pending:Boolean(pending)});};
 const read=form=>{const f=new FormData(form);return{
  label:String(f.get('label')||''),pathwayVersionId:s.baselineId?s.document.pathwayVersionId:String(f.get('pathwayVersionId')||''),
  sourceKind:String(f.get('sourceKind')||''),sourceLocator:String(f.get('sourceLocator')||''),
  sourceVersion:String(f.get('sourceVersion')||''),scopeDeclaration:String(f.get('scopeDeclaration')||''),
  conceptIds:String(f.get('conceptIds')||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean),
  changeReason:String(f.get('changeReason')||'')}};
 const ok=()=>!s.dirty||win.confirm('Discard unsaved checklist changes?');
 async function list(offset=0){const g=++gen;s.busy=true;s.status='Loading checklist drafts…';render();
  try{const p=await inspect({offset});if(disposed||g!==gen)return;if(p?.contractId!=='admin-syllabus-baseline-drafts-v1'||!Array.isArray(p.baselines))throw Error();
   s={...s,baselines:p.baselines,offset:p.offset,nextOffset:p.nextOffset,loaded:true,status:'Draft list loaded. No active syllabus baseline.'};
  }catch{if(!disposed&&g===gen)s.status='Draft list unavailable; unsaved form preserved.';}
  finally{if(!disposed&&g===gen){s.busy=false;render();}}
 }
 function fresh(){pending=null;uncertain=false;s={...s,reviewPacket:null,document:blank(),baselineId:null,expectedDigest:null,revision:null,history:[],dirty:false,readOnly:false,status:'New private checklist proposal.'};render();}
 async function open(baselineId,revision=null){if(s.busy||!ok())return;const g=++gen;s.busy=true;s.status='Loading saved checklist…';render();
  try{const p=await inspect({baselineId,revision});if(disposed||g!==gen)return;
   if(p?.contractId!=='admin-syllabus-baseline-drafts-v1'||!p.version?.document)throw Error();
   pending=null;uncertain=false;const v=p.version;s={...s,reviewPacket:null,baselineId:v.baselineId,expectedDigest:v.digest,revision:v.revision,
    document:v.document,history:p.history||[],readOnly:p.isLatest===false,dirty:false,status:'Loaded draft revision '+v.revision+'. No syllabus activation.'};
  }catch{if(!disposed&&g===gen)s.status='Checklist unavailable. Current form preserved.';}
  finally{if(!disposed&&g===gen){s.busy=false;render();}}
 }
 async function submit(event){if(!event.target.matches('[data-syllabus-form]'))return;event.preventDefault();
  if(s.busy||s.readOnly||!s.loaded)return;
  const current=read(event.target);s.document=current;
  try{if(!pending){pending=validateBaselineDraft({schemaVersion:1,requestId:crypto.randomUUID(),
    baselineId:s.baselineId||null,expectedDigest:s.expectedDigest||null,document:current},registry);uncertain=false;}}
  catch{s.status='Check the source, pathway, duplicate IDs, declaration and change reason.';render();return;}
  const g=++gen;s.busy=true;s.status='Saving exact draft and reading back version…';render();
  try{const receipt=await save(pending);uncertain=true;const packet=await inspect({baselineId:receipt.baselineId,revision:receipt.revision});
   if(disposed||g!==gen)return;const v=packet?.version;
   if(packet?.contractId!=='admin-syllabus-baseline-drafts-v1'||!v||v.baselineId!==receipt.baselineId||
      v.revision!==receipt.revision||v.digest!==receipt.digest||signature(v.document)!==signature(pending.document))
    throw Error('readback_mismatch');
   const dirty=signature(current)!==signature(pending.document);pending=null;uncertain=false;
   s={...s,reviewPacket:null,document:dirty?current:v.document,baselineId:v.baselineId,expectedDigest:v.digest,revision:v.revision,
    readOnly:packet.isLatest===false,dirty,history:packet.history||[],
    status:dirty?'Prior revision confirmed; newer changes remain unsaved.':'Saved immutable checklist draft revision '+v.revision+'. No syllabus activated.'};
   const entry={baselineId:v.baselineId,revision:v.revision,label:v.document.label,pathwayVersionId:v.document.pathwayVersionId,conceptCount:v.document.conceptIds.length};
   s.baselines=[entry,...s.baselines.filter(x=>x.baselineId!==entry.baselineId)].slice(0,50);
  }catch(error){if(!disposed&&g===gen){
   if(!uncertain&&[400,401,403,404,409,413,415].includes(Number(error?.status)))pending=null;
   else uncertain=true;
   s.dirty=true;s.status=pending?'Draft save not confirmed. Retry uses identical request and document; edits preserved.':
      'Draft not saved or conflict detected. Resolve issue; edits preserved.';
  }}finally{if(!disposed&&g===gen){s.busy=false;render();}}
 }
 function input(event){if(event.target.closest('[data-syllabus-form]')&&!s.busy&&!s.readOnly){s.document=read(event.target.closest('form'));s.dirty=true;s.reviewPacket=null;}}
 async function checkPreflight(){
  if(s.busy||!s.loaded||s.dirty||pending||!s.baselineId||!s.revision||!s.expectedDigest)return;
  const expected={baselineId:s.baselineId,revision:s.revision,digest:s.expectedDigest};
  const g=++gen;s.busy=true;s.status='Checking exact saved scope and approved objective mappings…';s.reviewPacket=null;render();
  try{
   const packet=await preflight({baselineId:expected.baselineId,revision:expected.revision});
   if(disposed||g!==gen)return;
   if(packet?.contractId!=='admin-syllabus-review-packet-v1'||packet.baselineId!==expected.baselineId||
    packet.revision!==expected.revision||packet.digest!==expected.digest||packet.checklistApproved!==false||
    packet.coverageFraction!==null||!Array.isArray(packet.rows)||!Array.isArray(packet.blockers))throw Error('invalid_review_packet');
   s.reviewPacket=packet;s.status='Preflight is a private review packet. Nothing approved or published.';
  }catch{if(!disposed&&g===gen){s.reviewPacket=null;s.status='Review preflight unavailable. Checklist is still a draft; no claim of coverage.';}}
  finally{if(!disposed&&g===gen){s.busy=false;render();}}
 }
 function click(event){const b=event.target.closest('button');if(!b||s.busy)return;
  if(b.hasAttribute('data-syllabus-preflight'))checkPreflight();
  else if(b.hasAttribute('data-syllabus-new')){if(ok())fresh();}
  else if(b.hasAttribute('data-syllabus-refresh'))list(s.offset);
  else if(b.hasAttribute('data-syllabus-page'))list(Number(b.dataset.syllabusPage));
  else if(b.hasAttribute('data-syllabus-open'))open(b.dataset.syllabusOpen,b.dataset.syllabusRevision?Number(b.dataset.syllabusRevision):null);
 }
 const unload=event=>{if(s.dirty||pending){event.preventDefault();event.returnValue='';}};
 root.addEventListener('submit',submit);root.addEventListener('input',input);root.addEventListener('click',click);
 win.addEventListener('beforeunload',unload);list();
 return ()=>{disposed=true;gen++;root.removeEventListener('submit',submit);root.removeEventListener('input',input);root.removeEventListener('click',click);
 win.removeEventListener('beforeunload',unload);root.replaceChildren();};
}
