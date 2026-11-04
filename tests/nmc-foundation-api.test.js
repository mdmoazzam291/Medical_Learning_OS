import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {readFoundationDrafts} from '../supabase/functions/owner-api/_shared/nmc-learning-foundation.js';
function fake(isAdmin=true){const calls=[];return {calls,rpc:async(name,args)=>{calls.push([name,args]);return {data:{isAdmin},error:null};},from(name){calls.push(['from',name]);return {select(columns){assert.equal(columns,'version,body');return {eq(key,id){assert.equal(key,'id');assert.equal(id,1);return {single:async()=>({data:{version:446,body:{concepts:[]}},error:null})};}};}};}};}
test('foundation read denies non-Admin and never reads catalog before authorization',async()=>{const admin=fake(false);await assert.rejects(readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()}),{status:403,code:'content_admin_required'});assert.equal(admin.calls.length,1);});
test('foundation rejects methods, duplicate/unknown/malformed filters before reads',async()=>{for(const [method,query] of [['POST',''],['GET','search=x&search=y'],['GET','approved=true'],['GET','offset=-1'],['GET','subject=invented']]){const admin=fake();await assert.rejects(readFoundationDrafts({admin,actor:'actor',method,params:new URLSearchParams(query)}));assert.equal(admin.calls.length,0);}});
test('foundation API performs only role and singleton catalog reads; missing identities remain unresolved',async()=>{const admin=fake();const p=await readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams('search=AN57.5')});assert.equal(p.requirements.length,1);assert.equal(p.objectives.length,20);assert.equal(p.objectives[0].identityState,'missing');assert.equal(p.acceptedMappings,0);assert.deepEqual(admin.calls,[['content_admin_status_v1',{p_user:'actor'}],['from','study_catalog']]);});
test('private draft JSON is excluded from static build and endpoint is below runtime/Admin gates',async()=>{const {publicFileSet}=await import('../scripts/public-surface.js');assert.equal(publicFileSet.has('data/nmc-learning-foundation-drafts.json'),false);const s=await readFile(new URL('../supabase/functions/owner-api/index.ts',import.meta.url),'utf8');assert.ok(s.indexOf('if (path === "/foundation-objective-drafts")')>s.indexOf('if (runtimeAccess?.allowed !== true)'));assert.ok(s.indexOf('if (path === "/foundation-objective-drafts")')>s.indexOf('if (!access ||'));});
test('Owner boundary preserves canonical subjectTags and detects subject-only drift',async()=>{
 const {canonicalIdentityDigest}=await import('../src/domain/nmc-learning-foundation.js');
 const {default:pack}=await import('../data/nmc-learning-foundation-drafts.json',{with:{type:'json'}});
 // Use the independently verified first identity's metadata, not a second classification ontology.
 const concept={conceptId:pack.objectives[0].objective.conceptId,label:'Aortic dissection',aliases:['Acute aortic dissection'],subjectTags:['medicine','surgery','radiology']};
 assert.equal(await canonicalIdentityDigest(concept),pack.objectives[0].canonicalIdentitySha256);
 const admin=fake();admin.from=()=>({select:()=>({eq:()=>({single:async()=>({data:{version:446,body:{concepts:[concept]}}})})})});
 const read=()=>readFoundationDrafts({admin,actor:'actor',method:'GET',params:new URLSearchParams()});
 assert.equal((await read()).objectives[0].identityState,'current');concept.subjectTags=['anatomy'];assert.equal((await read()).objectives[0].identityState,'changed');
});
test('foundation adapter encodes filters and authenticates a read without client actor fields',async()=>{
 const {createCloudOwner}=await import('../src/adapters/cloud-owner.js');let request;
 const owner=createCloudOwner({projectUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic',auth:{getSession:async()=>({accessToken:'synthetic'})},fetchFn:async(url,options)=>{request={url,options};return new Response('{}');}});
 await owner.foundationObjectiveDrafts({search:'A & B',subject:'anatomy',offset:50});
 assert.match(request.url,/foundation-objective-drafts\?search=A\+%26\+B&subject=anatomy&offset=50$/);assert.equal(request.options.method,'GET');assert.equal(request.options.headers.Authorization,'Bearer synthetic');assert.equal(request.options.body,undefined);assert.doesNotMatch(request.url,/actor|userId/);
});
