import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {readFoundationDrafts} from '../supabase/functions/owner-api/_shared/nmc-learning-foundation.js';
function fake(isAdmin=true){const calls=[];return {calls,rpc:async(name,args)=>{calls.push([name,args]);return {data:{isAdmin},error:null};},from(name){calls.push(['from',name]);if(name==='content_concept_current_identities')return {select:()=>({in:async()=>({data:[],error:null})})};if(name==='foundation_objective_current_wordings')return {select:()=>({range:async()=>({data:[],error:null})})};return {select(columns){assert.equal(columns,'version,body');return {eq(key,id){assert.equal(key,'id');assert.equal(id,1);return {single:async()=>({data:{version:446,body:{concepts:[]}},error:null})};}};}};}};}
test('foundation read denies non-Admin and never reads catalog before authorization',async()=>{const admin=fake(false);await assert.rejects(readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()}),{status:403,code:'content_admin_required'});assert.equal(admin.calls.length,1);});
test('foundation rejects methods, duplicate/unknown/malformed filters before reads',async()=>{for(const [method,query] of [['POST',''],['GET','search=x&search=y'],['GET','approved=true'],['GET','offset=-1'],['GET','subject=invented']]){const admin=fake();await assert.rejects(readFoundationDrafts({admin,actor:'actor',method,params:new URLSearchParams(query)}));assert.equal(admin.calls.length,0);}});
test('foundation API performs only role and singleton catalog reads; missing identities remain unresolved',async()=>{const admin=fake();const p=await readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams('search=AN57.5')});assert.equal(p.requirements.length,1);assert.equal(p.objectives.length,2865);assert.equal(p.objectives[0].identityState,'missing');assert.equal(p.acceptedMappings,0);assert.deepEqual(admin.calls.slice(0,3),[['content_admin_status_v1',{p_user:'actor'}],['from','study_catalog'],['from','content_concept_current_identities']]);assert.ok(admin.calls.slice(2).every(c=>c[0]==='from'&&['content_concept_current_identities','foundation_objective_current_wordings'].includes(c[1])));});
test('private draft JSON is excluded from static build and endpoint is below runtime/Admin gates',async()=>{const {publicFileSet}=await import('../scripts/public-surface.js');assert.equal(publicFileSet.has('data/nmc-learning-foundation-drafts.json'),false);const s=await readFile(new URL('../supabase/functions/owner-api/index.ts',import.meta.url),'utf8');assert.ok(s.indexOf('if (path === "/foundation-objective-drafts")')>s.indexOf('if (runtimeAccess?.allowed !== true)'));assert.ok(s.indexOf('if (path === "/foundation-objective-drafts")')>s.indexOf('if (!access ||'));assert.ok(s.indexOf('if (path === "/concept-identity-edits"')>s.indexOf('if (!access ||'));assert.ok(s.indexOf('if (path === "/concept-identity-edits"')>s.indexOf('if (runtimeAccess?.allowed !== true)'));});
test('Owner boundary preserves canonical subjectTags and detects subject-only drift',async()=>{
 const {canonicalIdentityDigest}=await import('../src/domain/nmc-learning-foundation.js');
 const {default:pack}=await import('../data/nmc-learning-foundation-drafts.json',{with:{type:'json'}});
 // Use the independently verified first identity's metadata, not a second classification ontology.
 const concept={conceptId:pack.objectives[0].objective.conceptId,label:'Brown-Sequard syndrome',aliases:['Brown Sequard syndrome','Hemicord syndrome'],subjectTags:['anatomy','medicine','orthopaedics']};
 assert.equal(await canonicalIdentityDigest(concept),pack.objectives[0].canonicalIdentitySha256);
 const admin=fake(),fallback=admin.from.bind(admin);admin.from=name=>name==='study_catalog'?({select:()=>({eq:()=>({single:async()=>({data:{version:448,body:{concepts:[concept]}}})})})}):fallback(name);
 const read=()=>readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()});
 const page=await read();
 assert.deepEqual(Object.values(page.namesOnlyPreview).map(rows=>rows.length),[121,2,6,1]);
 assert.equal(new Set(page.namesOnlyPreview.concepts.map(row=>row.label.toLowerCase())).size,121);
 assert.deepEqual(page.namesOnlyPreview.concepts.find(row=>row.label==='Torticollis').codes,['AN29.4','OR12.1']);
 assert.equal(page.namesOnlyPreview.concepts.some(row=>row.label==='Precocious puberty'),true);
 assert.ok(page.namesOnlyPreview.concepts.every(row=>row.codes.every(code=>!code.includes(' '))));
 assert.ok(page.namesOnlyPreview.concepts.find(row=>row.label==='Adherence').codes.includes('GM14.12'));
 assert.equal(page.namesOnlyRelationships.length,5);
 assert.deepEqual(page.namesOnlyRelationships.find(row=>row.narrower.label==='Delayed puberty'),{
  narrower:{label:'Delayed puberty',codes:['OG23.2']},
  broader:{label:'Puberty',codes:['PY9.2']},
 });
 assert.ok(page.namesOnlyPreview.concepts.some(row=>row.label==='Brown-Sequard syndrome'&&row.codes.length===2));
 assert.equal(page.objectives[0].identityState,'current');
 const expectedObjectiveId = pack.objectives[0].objective.objectiveVersionId;
 for (const [subject, code] of [['anatomy', 'AN57.5'], ['physiology', 'PY10.10']]) {
  const params = new URLSearchParams({ subject, search: code });
  const result = await readFoundationDrafts({ admin, actor: 'actor', method: 'GET', params });
  const requirement = result.requirements.find(row => row.code === code && row.subjectId === subject);
  assert.ok(requirement?.objectiveVersionIds.includes(expectedObjectiveId));
  const objective = result.objectives.find(row => row.objective.objectiveVersionId === expectedObjectiveId);
  assert.equal(objective?.objective.conceptId, concept.conceptId);
  assert.equal(objective.identityState, 'current');
  assert.equal(objective.sourceReferences.find(row => row.referenceId === requirement.referenceId)?.status, 'proposed');
  assert.equal(result.learnerActivation, false);
 }
 concept.subjectTags = ['anatomy'];
 assert.equal((await read()).objectives[0].identityState, 'changed');
});
test('foundation adapter encodes filters and authenticates a read without client actor fields',async()=>{
 const {createCloudOwner}=await import('../src/adapters/cloud-owner.js');let request;
 const owner=createCloudOwner({projectUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic',auth:{getSession:async()=>({accessToken:'synthetic'})},fetchFn:async(url,options)=>{request={url,options};return new Response('{}');}});
 await owner.foundationObjectiveDrafts({search:'A & B',subject:'anatomy',offset:50});
 assert.match(request.url,/foundation-objective-drafts\?search=A\+%26\+B&subject=anatomy&offset=50$/);assert.equal(request.options.method,'GET');assert.equal(request.options.headers.Authorization,'Bearer synthetic');assert.equal(request.options.body,undefined);assert.doesNotMatch(request.url,/actor|userId/);
});

test('Admin preview resolves only packed accepted private IDs and preserves review gates',async()=>{
 const {default:pack}=await import('../data/nmc-learning-foundation-drafts.json',{with:{type:'json'}});
 const conceptId=pack.objectives[0].objective.conceptId;
 const admin=fake(),from=admin.from.bind(admin),seen=[];
 admin.from=name=>name!=='content_concept_current_identities'?from(name):{select(columns){
  assert.equal(columns,'concept_id,accepted_document,identity_digest');
  return {in:async(column,ids)=>{
   assert.equal(column,'concept_id');assert.ok(ids.length<=150);seen.push(...ids);
   if(!ids.includes(conceptId))return {data:[],error:null};
   return {data:[{concept_id:conceptId,identity_digest:'d'.repeat(64),accepted_document:{conceptId,label:'Brown-Sequard syndrome',aliases:['Brown Sequard syndrome','Hemicord syndrome'],classification:{subjects:['anatomy','medicine','orthopaedics']}}}],error:null};
  }};
 }};
 const result=await readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()});
 assert.deepEqual(seen,[...new Set(pack.objectives.map(row=>row.objective.conceptId))]);
 assert.equal(result.objectives[0].identityState,'current');
 assert.equal(result.objectives[0].identityKind,'accepted-private');
 assert.deepEqual(result.editableIdentities,[{conceptId,label:'Brown-Sequard syndrome',aliases:['Brown Sequard syndrome','Hemicord syndrome'],identityDigest:'d'.repeat(64)}]);
 assert.equal(result.objectives[0].wordingRevision,0);
 assert.equal(result.acceptedMappings,0);
 assert.equal(result.learnerActivation,false);
});
test('owner-api foundation data pins match the working-tree registry files',async()=>{
 const {FOUNDATION_DATA_FILES,FOUNDATION_DATA_COMMIT}=await import('../supabase/functions/owner-api/_shared/foundation-data.js');
 const {createHash}=await import('node:crypto');const {readFileSync}=await import('node:fs');
 assert.match(FOUNDATION_DATA_COMMIT,/^[0-9a-f]{40}$/);
 assert.equal(Object.keys(FOUNDATION_DATA_FILES).length,7);
 for(const {path,sha256} of Object.values(FOUNDATION_DATA_FILES))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),sha256,path);
});

test('owner wording edits overlay the registry wording and keep it visible',async()=>{
 const {default:pack}=await import('../data/nmc-learning-foundation-drafts.json',{with:{type:'json'}});
 const id=pack.objectives[3].objective.objectiveVersionId;
 const admin=fake(),from=admin.from.bind(admin);
 admin.from=name=>name!=='foundation_objective_current_wordings'?from(name):{select(columns){assert.equal(columns,'objective_version_id,revision,wording,edited_at');
  return {range:async()=>({data:[{objective_version_id:id,revision:2,wording:'Owner revised wording for this objective.',edited_at:'2026-11-17T18:00:00Z'}],error:null})};}};
 const r=await readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()});
 const o=r.objectives.find(x=>x.objective.objectiveVersionId===id);
 assert.equal(o.wording,'Owner revised wording for this objective.');assert.equal(o.registryWording,pack.objectives[3].wording);assert.equal(o.wordingRevision,2);
 assert.equal(r.clinicalApproval,false);
});
test('foundation edits validate strictly, check the registry base and map database errors',async()=>{
 const {editConceptIdentity,editObjectiveWording}=await import('../supabase/functions/owner-api/_shared/foundation-edits.js');
 const {sha256Text}=await import('../src/domain/foundation-edits.js');
 const {default:pack}=await import('../data/nmc-learning-foundation-drafts.json',{with:{type:'json'}});
 const row=pack.objectives[0],base=await sha256Text(row.wording);
 const calls=[];let rpcError=null,latest=null;
 const admin={rpc:async(name,args)=>{calls.push(name);return rpcError?{data:null,error:{message:rpcError}}:{data:{status:'ok',args},error:null};},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:latest,error:null})})})})};
 const ident={schemaVersion:1,requestId:crypto.randomUUID(),conceptId:'C-'+'a'.repeat(32),previousIdentityDigest:'b'.repeat(64),label:'Renamed concept',aliases:['Other name'],changeReason:'Owner clarified the name.'};
 const params=new URLSearchParams();
 assert.equal((await editConceptIdentity({admin,actor:'a',method:'POST',params,input:ident})).status,'ok');
 for(const bad of [{...ident,label:'x'},{...ident,aliases:['Renamed concept']},{...ident,aliases:['A','a']},{...ident,extra:1},{...ident,conceptId:'existing'}])
  await assert.rejects(editConceptIdentity({admin,actor:'a',method:'POST',params,input:bad}),{status:400,code:'concept_edit_invalid'});
 await assert.rejects(editConceptIdentity({admin,actor:'a',method:'GET',params,input:ident}),{status:405});
 rpcError='concept_edit_stale';await assert.rejects(editConceptIdentity({admin,actor:'a',method:'POST',params,input:ident}),{status:409,code:'concept_edit_stale'});
 rpcError='concept_edit_not_found';await assert.rejects(editConceptIdentity({admin,actor:'a',method:'POST',params,input:ident}),{status:404});
 rpcError='content_admin_required';await assert.rejects(editConceptIdentity({admin,actor:'a',method:'POST',params,input:ident}),{status:403});
 rpcError=null;
 const obj={schemaVersion:1,requestId:crypto.randomUUID(),objectiveVersionId:row.objective.objectiveVersionId,baseWordingSha256:base,wording:'An owner revised wording for this objective.',changeReason:'Owner clarified the scope.'};
 assert.equal((await editObjectiveWording({admin,actor:'a',method:'POST',params,input:obj})).status,'ok');
 await assert.rejects(editObjectiveWording({admin,actor:'a',method:'POST',params,input:{...obj,baseWordingSha256:'c'.repeat(64)}}),{status:409,code:'objective_edit_stale'},'first edit must start from the registry wording');
 await assert.rejects(editObjectiveWording({admin,actor:'a',method:'POST',params,input:{...obj,objectiveVersionId:'lo:C-'+'f'.repeat(32)+':x@1'}}),{status:404});
 latest={wording_sha256:'c'.repeat(64)};
 assert.equal((await editObjectiveWording({admin,actor:'a',method:'POST',params,input:{...obj,baseWordingSha256:'c'.repeat(64)}})).status,'ok','later edits start from the latest revision');
 await assert.rejects(editObjectiveWording({admin,actor:'a',method:'POST',params,input:{...obj,wording:'short'}}),{status:400});
});
