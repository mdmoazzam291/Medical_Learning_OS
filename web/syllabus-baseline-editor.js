import registry from '../data/preparation-curriculum.js';
import {escapeText as e} from './navigation-view.js';
import {validateBaselineDraft} from '../src/domain/syllabus-baseline-drafts.js';
const blank=()=>({label:'',pathwayVersionId:registry.pathways.find(p=>p.status==='active')?.pathwayVersionId||'',
 sourceKind:'historical',sourceLocator:'',sourceVersion:'',scopeDeclaration:'partial',conceptIds:[],changeReason:''});
const signature=d=>JSON.stringify(d);
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
 '<label>Existing canonical concept IDs (one per line)<textarea name="conceptIds" rows="5" spellcheck="false">'+e(d.conceptIds.join('\n'))+'</textarea></label>'+
 '<p class="muted">Use exact canonical concept IDs from the Coverage Index. Unaccepted concept proposals and unknown IDs cannot enter checklist membership. Empty is allowed as a draft, not a denominator.</p>'+
 '<label>Reason for proposal or revision<textarea name="changeReason" maxlength="2000" required rows="2">'+e(d.changeReason)+'</textarea></label></fieldset>'+
 '<button type="submit"'+(s.pending?' formnovalidate':'')+(disabled||readonly?' disabled':'')+'>'+
 (s.pending?'Retry pending draft save':'Save checklist draft')+'</button></form>'+
 (readonly?'<p>Historical revision: read-only. Open latest before editing.</p>':'')+
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
export function mountSyllabusBaselineEditor({root,inspect,save,window:win=window}){
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
 function fresh(){pending=null;uncertain=false;s={...s,document:blank(),baselineId:null,expectedDigest:null,revision:null,history:[],dirty:false,readOnly:false,status:'New private checklist proposal.'};render();}
 async function open(baselineId,revision=null){if(s.busy||!ok())return;const g=++gen;s.busy=true;s.status='Loading saved checklist…';render();
  try{const p=await inspect({baselineId,revision});if(disposed||g!==gen)return;
   if(p?.contractId!=='admin-syllabus-baseline-drafts-v1'||!p.version?.document)throw Error();
   pending=null;uncertain=false;const v=p.version;s={...s,baselineId:v.baselineId,expectedDigest:v.digest,revision:v.revision,
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
   s={...s,document:dirty?current:v.document,baselineId:v.baselineId,expectedDigest:v.digest,revision:v.revision,
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
 function input(event){if(event.target.closest('[data-syllabus-form]')&&!s.busy&&!s.readOnly){s.document=read(event.target.closest('form'));s.dirty=true;}}
 function click(event){const b=event.target.closest('button');if(!b||s.busy)return;
  if(b.hasAttribute('data-syllabus-new')){if(ok())fresh();}
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
