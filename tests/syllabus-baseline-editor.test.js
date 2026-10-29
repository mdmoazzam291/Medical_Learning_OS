import test from 'node:test';import assert from 'node:assert/strict';
import {syllabusBaselineForm} from '../web/syllabus-baseline-editor.js';
import {createCloudOwner} from '../src/adapters/cloud-owner.js';
test('Admin checklist view is source-explicit, escaped and never implies approval',()=>{
 const html=syllabusBaselineForm({loaded:true,document:{label:'<script>inject</script>',
 pathwayVersionId:'neet-pg:preparation@1',sourceKind:'historical',sourceLocator:'Synthetic source locator',
 sourceVersion:'v1',scopeDeclaration:'partial',conceptIds:['one'],changeReason:'Test intentional change'}});
 assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<script>|Publish syllabus|Approve syllabus/);
 assert.match(html,/Private, versioned scope proposal/);
});
test('owner baseline adapter uses authenticated owner API only',async()=>{
 const requests=[];const owner=createCloudOwner({projectUrl:'https://synthetic.supabase.co',
 publishableKey:'sb_publishable_synthetic',auth:{async getSession(){return{accessToken:'synthetic'};}},
 fetchFn:async(url,options)=>{requests.push({url,options});return new Response('{}');}});
 await owner.saveSyllabusBaselineDraft({schemaVersion:1});await owner.syllabusBaselineDrafts({baselineId:'synthetic',revision:2});
 assert.equal(requests[0].options.method,'POST');assert.match(requests[0].url,/syllabus-baseline-drafts$/);
 assert.match(requests[1].url,/syllabus-baseline-drafts\/synthetic\?revision=2/);
 assert.equal(requests[0].options.headers.Authorization,'Bearer synthetic');
});

test('checklist save confirms reordered JSON keys but rejects changed readback values',async t=>{
 const {mountSyllabusBaselineEditor}=await import('../web/syllabus-baseline-editor.js');
 for(const changed of [false,true])await t.test(changed?'changed value stays unconfirmed':'reordered keys confirm the save',async t=>{
  const handlers={};const root={innerHTML:'',addEventListener:(k,f)=>handlers[k]=f,
   removeEventListener(){},replaceChildren(){}};
  const win={addEventListener(){},removeEventListener(){},confirm:()=>true};
  const fields={label:'Synthetic scope',pathwayVersionId:'neet-pg:preparation@1',sourceKind:'historical',
   sourceLocator:'Synthetic source chapter',sourceVersion:'fixture@1',scopeDeclaration:'partial',
   conceptIds:'existing\nsecond',changeReason:'Synthetic review proposal'};
  const NativeFormData=globalThis.FormData;
  t.mock.method(globalThis,'FormData',function(){const data=new NativeFormData();for(const [k,v] of Object.entries(fields))data.append(k,v);return data;});
  const receipt={baselineId:'44444444-4444-4444-8444-444444444444',revision:1,digest:'b'.repeat(64)};
  let saved;
  const dispose=mountSyllabusBaselineEditor({root,window:win,save:async input=>{saved=structuredClone(input);return receipt;},
   inspect:async query=>query.baselineId?{contractId:'admin-syllabus-baseline-drafts-v1',isLatest:true,history:[],
    version:{...receipt,document:{changeReason:fields.changeReason,conceptIds:['existing','second'],
     scopeDeclaration:fields.scopeDeclaration,sourceVersion:fields.sourceVersion,sourceLocator:fields.sourceLocator,
     sourceKind:fields.sourceKind,pathwayVersionId:fields.pathwayVersionId,label:changed?'Different scope':fields.label}}}:
    {contractId:'admin-syllabus-baseline-drafts-v1',baselines:[],offset:0,nextOffset:null}});
  await new Promise(resolve=>setImmediate(resolve));
  await handlers.submit({target:{matches:()=>true},preventDefault(){}});
  assert.ok(saved,'real editor reached save');
  if(changed){assert.match(root.innerHTML,/Draft save not confirmed/);assert.match(root.innerHTML,/Retry pending draft save/);}
  else{assert.match(root.innerHTML,/Saved immutable checklist draft revision 1/);assert.doesNotMatch(root.innerHTML,/Retry pending draft save/);}
  dispose();
 });
});
