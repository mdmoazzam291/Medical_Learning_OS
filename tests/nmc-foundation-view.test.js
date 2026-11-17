import test from 'node:test';import assert from 'node:assert/strict';
import {foundationReviewMarkup,mountFoundationReview} from '../web/nmc-foundation-review.js';
const packet=()=>({contractId:'admin-foundation-objective-drafts-v1',acceptedMappings:0,learnerActivation:false,clinicalApproval:false,sourceEdition:'test@1',catalogVersionMatches:true,identityBindingsCurrent:true,subjects:['anatomy'],totals:{sourceReferences:2634,objectiveDrafts:1,sourceLinkedReferences:2,unboundObjectiveDrafts:0},objectives:[{canonicalLabel:'<img src=x onerror=alert(1)>',identityState:'current',wording:'Original <script>draft</script>',objective:{objectiveVersionId:'o@1',conceptId:'one',task:'localization',depth:'applied'},sourceReferences:[{code:'AN57.5',sourcePage:141,subjectId:'anatomy'},{code:'PY10.10',sourcePage:158,subjectId:'physiology'}]}],requirements:[{code:'AN57.5',subjectId:'anatomy',topicLabel:'Spinal cord',pdfPage:141,identifierState:'standard',objectiveVersionIds:['o@1']}],offset:0,nextOffset:null,filteredReferences:1});
test('Admin review distinguishes draft wording, proposed shared links and source-only records; escapes prose',()=>{const html=foundationReviewMarkup(packet());assert.match(html,/AI-generated original/);assert.match(html,/Accepted mappings: 0/);assert.match(html,/AN57.5/);assert.match(html,/PY10.10/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script/);});
test('Admin panel is on demand and discards disposed or changed-account reads',async()=>{for(const action of ['dispose','identity']){let calls=0,resolve,id='first';const handlers={};const root={innerHTML:'',addEventListener(k,f){handlers[k]=f;},removeEventListener(){},replaceChildren(){this.innerHTML='';}};const win={addEventListener(){},removeEventListener(){}};const dispose=mountFoundationReview({root,window:win,identity:async()=>id,load:()=>{calls++;return new Promise(r=>resolve=r);}});assert.equal(calls,0);const pending=handlers.click({target:{closest:()=>({hasAttribute:k=>k==='data-foundation-load'})}});await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);if(action==='dispose')dispose();else id='second';resolve(packet());await pending;assert.doesNotMatch(root.innerHTML,/Original &lt;script&gt;/);dispose();}});

test('coverage triage shows objective details without claiming complete coverage',()=>{
 const p=packet();
 p.requirements.push({...p.requirements[0],code:'AN57.6',objectiveVersionIds:[]});
 p.requirements.push({...p.requirements[0],code:'PY9.1',objectiveVersionIds:[],amendmentNotice:true});
 const html=foundationReviewMarkup(p);
 assert.match(html,/Draft objectives linked · Coverage unverified/);
 assert.match(html,/Review 1 proposed objective/);
 assert.match(html,/Identity current/);
 assert.match(html,/No linked objective in this pack · Coverage unverified/);
 assert.match(html,/Source resolution needed · amendment requires review · Coverage unverified/);
});
test('owner edits: forms appear on demand, send the displayed wording digest and reload; failures change nothing',async()=>{
 const p={...packet(),editableIdentities:[{conceptId:'one',label:'Concept one',aliases:['First'],identityDigest:'d'.repeat(64)}]};
 p.objectives[0]={...p.objectives[0],wording:'Original wording for the edit test.',wordingRevision:2,registryWording:'Registry wording.',reviewState:'needs-attention',reviewFindings:['duplicate-wording'],objective:{...p.objectives[0].objective,prerequisites:['x@1']}};
 const html=foundationReviewMarkup(p);
 assert.match(html,/Owner-edited wording, revision 2/);assert.match(html,/Needs attention: duplicate wording/);assert.match(html,/1 prerequisite/);
 assert.match(html,/data-edit-objective="o@1"/);assert.match(html,/data-edit-identity="one"/);assert.doesNotMatch(html,/data-objective-edit-form/);
 const handlers={},root={innerHTML:'',addEventListener(k,f){handlers[k]=f;},removeEventListener(){},replaceChildren(){}};
 const sent=[];let loads=0,fail=false;
 mountFoundationReview({root,window:{addEventListener(){},removeEventListener(){}},identity:async()=>'me',load:async()=>{loads++;return p;},
  editObjective:async input=>{if(fail)throw Object.assign(new Error(),{code:'objective_edit_stale'});sent.push(input);return {status:'objective_wording_edited'};},editIdentity:async input=>{sent.push(input);return {};}});
 const btn=attrs=>({target:{closest:()=>({hasAttribute:k=>k in attrs,getAttribute:k=>attrs[k]})}});
 await handlers.click(btn({'data-foundation-load':''}));await new Promise(r=>setTimeout(r,0));assert.equal(loads,1);
 handlers.click(btn({'data-edit-objective':'o@1'}));assert.match(root.innerHTML,/data-objective-edit-form/);
 const form=(id,fields)=>({matches:s=>s==='[data-objective-edit-form]'?!('label' in fields):s==='[data-identity-edit-form]'?('label' in fields):false,getAttribute:()=>id,_fields:fields});
 const FD=globalThis.FormData;globalThis.FormData=class{constructor(f){this.f=f._fields;}*[Symbol.iterator](){yield* Object.entries(this.f);}};
 try{
  await handlers.submit({preventDefault(){},target:form('o@1',{wording:'A clearer owner wording.',changeReason:'Owner clarified scope.'})});
  const {createHash}=await import('node:crypto');
  assert.equal(sent[0].baseWordingSha256,createHash('sha256').update('Original wording for the edit test.').digest('hex'));
  assert.equal(sent[0].objectiveVersionId,'o@1');assert.equal(loads,2,'reloads after save');
  await handlers.submit({preventDefault(){},target:form('one',{label:'Concept one renamed',aliases:'First\n\n Second ',changeReason:'Owner clarified the name.'})});
  assert.deepEqual(sent[1].aliases,['First','Second']);assert.equal(sent[1].previousIdentityDigest,'d'.repeat(64));
  fail=true;handlers.click(btn({'data-edit-objective':'o@1'}));
  await handlers.submit({preventDefault(){},target:form('o@1',{wording:'Another wording here.',changeReason:'Owner clarified scope.'})});
  assert.match(root.innerHTML,/Not saved: objective_edit_stale/);assert.equal(loads,3);
 }finally{globalThis.FormData=FD;}
});
