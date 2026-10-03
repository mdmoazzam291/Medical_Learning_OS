import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../supabase/functions/content-library-api/_shared/handler.js').catch(()=>({}));
const origin='https://medical-learning-os-web.medicalos.workers.dev';
const fixture=(options={})=>{
  let writes=0;
  const admin={rpc:async(name,args)=>{
    if(name==='content_admin_status_v1')return {data:{isAdmin:options.isAdmin!==false},error:null};
    if(name==='content_library_review_publish_v1'){writes++;return options.dbFailure?{error:{message:'stale_import_digest'},data:null}:{data:{contractId:'content-library-publication-v1',status:'published'},error:null};}
    if(name==='study_start_session'){writes++;assert.equal(args.p_learner,'actual-user');assert.deepEqual(args.p_ids,['published@1']);return {data:{id:'saved-session'},error:null};}
    if(name==='content_library_snapshot_v1'&&options.study)return {data:{catalog:{concepts:[],questions:[{questionId:'published',questionVersionId:'published@1',status:'published',stem:'Synthetic',options:[],conceptLinks:[]}]},notes:[],questionMetadata:[],conceptMetadata:[],links:[],stats:[]},error:null};
    if(name==='content_library_snapshot_v1'){assert.equal(args.p_learner,'actual-user');return {data:{catalog:{concepts:[],questions:[{status:'in_review',answerOptionId:'secret'}]},notes:[],questionMetadata:[],conceptMetadata:[],links:[],stats:[]},error:null};}
    throw new Error('Unexpected RPC '+name);
  },from:name=>{
    const result=name==='study_catalog'?{body:{concepts:[],questions:[{status:'in_review',answerOptionId:'secret'}]}}:[];
    const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,single:async()=>({data:result,error:null}),then:resolve=>resolve({data:result,error:null})};return query;
  }};
  return {handler:module.createLibraryHandler?.({admin,getUser:async()=>options.signedOut?null:{id:'actual-user'},runtimeAccess:async()=>({allowed:options.revoked!==true}),allowedOrigins:[origin]}),writes:()=>writes};
};
const req=(path,method='GET',body,extra={})=>new Request('https://example.supabase.co/functions/v1/content-library-api'+path,{method,headers:{Origin:origin,Authorization:'Bearer synthetic',...(body===undefined?{}:{'Content-Type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('unknown origins are denied before credentials or database work',async()=>{assert.equal(typeof module.createLibraryHandler,'function');const f=fixture();const r=await f.handler(req('/library','GET',undefined,{Origin:origin+'.evil.example'}));assert.equal(r.status,403);assert.equal(f.writes(),0);});
test('signed-out or revoked sessions cannot read the graph or publish',async()=>{assert.equal(typeof module.createLibraryHandler,'function');for(const opts of [{signedOut:true},{revoked:true}]){const f=fixture(opts);assert.equal((await f.handler(req('/library'))).status,401);assert.equal(f.writes(),0);}});
test('ordinary learners cannot read raw imports or submit publication even with attested true',async()=>{assert.equal(typeof module.createLibraryHandler,'function');const f=fixture({isAdmin:false});for(const r of [req('/imports'),req('/imports/test/publish','POST',{digest:'x',rightsDecisions:[],reviewNotes:'Inspected',attested:true})])assert.equal((await f.handler(r)).status,403);assert.equal(f.writes(),0);});
test('admin publish rejects missing attestation and injected reviewer identity',async()=>{assert.equal(typeof module.createLibraryHandler,'function');const f=fixture();for(const b of [{digest:'x',rightsDecisions:[],reviewNotes:'Inspected',attested:false},{digest:'x',rightsDecisions:[],reviewNotes:'Inspected',attested:true,reviewerId:'forged'}])assert.equal((await f.handler(req('/imports/test/publish','POST',b))).status,400);assert.equal(f.writes(),0);});
test('publication derives administrator identity from Auth and reports stale digest as conflict',async()=>{assert.equal(typeof module.createLibraryHandler,'function');const f=fixture({dbFailure:true});const r=await f.handler(req('/imports/test/publish','POST',{digest:'a'.repeat(64),rightsDecisions:[],reviewNotes:'Inspected external content',attested:true}));assert.equal(r.status,409);assert.equal(f.writes(),1);assert.deepEqual(await r.json(),{error:'stale_import_digest'});});
test('learner response excludes unpublished answer-bearing objects and is never cached',async()=>{assert.equal(typeof module.createLibraryHandler,'function');const f=fixture();const r=await f.handler(req('/library'));assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(JSON.stringify(await r.json()).includes('secret'),false);assert.equal(f.writes(),0);});

test('filtered study accepts only distinct published versions and derives learner identity',async()=>{const f=fixture({study:true});for(const ids of [[],['hidden@1'],['published@1','published@1']]){assert.equal((await f.handler(req('/study','POST',{questionVersionIds:ids}))).status,400);}assert.equal(f.writes(),0);const r=await f.handler(req('/study','POST',{questionVersionIds:['published@1']}));assert.equal(r.status,200);assert.deepEqual(await r.json(),{sessionId:'saved-session',resumedExisting:true});assert.equal(f.writes(),1);});

test('encoded valid import IDs reach the exact publication gate; malformed escapes fail',async()=>{const f=fixture();const body={digest:'a'.repeat(64),rightsDecisions:[],reviewNotes:'Inspected',attested:true};assert.equal((await f.handler(req('/imports/review%3A2026%40v1/publish','POST',body))).status,200);assert.equal(f.writes(),1);assert.equal((await f.handler(req('/imports/%ZZ/publish','POST',body))).status,400);assert.equal(f.writes(),1);});
