import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryRouteState, libraryContextUrl, selectWorkspace, validateSavedViews, savedViewUrl } from '../src/domain/library-workspaces.js';
import { transitionContext } from '../src/domain/content-workspace.js';
import { profile, curriculum, library } from './fixtures/preparation-fixture.js';
import { createLibraryHandler } from '../supabase/functions/content-library-api/_shared/handler.js';
const view = await import('../web/preparation-view.js').catch(()=>({}));
test('scope survives view changes, saved views and browser route restoration',()=>{
  const route=libraryRouteState('?view=notes&concept=shared&scope=foundations');
  assert.equal(route.options.scope,'foundations');
  assert.match(transitionContext('?concept=shared&scope=goals',{view:'graph'}),/scope=goals/);
  assert.equal(libraryRouteState('?scope=forged').options.scope,'');
  const saved=validateSavedViews([{id:'test',name:'Focus',view:'notes',filters:{concept:'shared'},options:{scope:'goals'}}]);
  assert.match(savedViewUrl(saved[0]),/scope=goals/);
  assert.match(libraryContextUrl('?scope=goals',{scope:'all'}),/scope=all/);
});
test('all Library selections use the preparation scope before ordinary filters',()=>{
  const lib=library();for(const c of lib.concepts)c.classification={subjects:[],systems:[],organs:[],domains:[],tasks:[]};
  for(const q of lib.questions){q.classification={subjects:[],systems:[],organs:[],domains:[],tasks:[]};q.options=[];q.stem=q.questionId;q.home.platforms=[];}
  lib.preparation={profile,curriculum:curriculum()};
  assert.deepEqual(selectWorkspace(lib,{scope:'foundations'}).questions.map(q=>q.questionId),['f-q']);
});
test('Library preparation context comes from authenticated preference and trusted curriculum, with no metadata authority leak',async()=>{
  const handler=createLibraryHandler({admin:{rpc:async()=>({data:{catalog:{concepts:[],questions:[]}}})},getUser:async()=>({id:'u1',user_metadata:{mlos_preparation_profile:profile,isAdmin:true,privateField:'never-return'}}),runtimeAccess:async()=>({allowed:true}),allowedOrigins:[],preparationCurriculum:curriculum()});
  const res=await handler(new Request('https://example.invalid/content-library-api/library',{headers:{authorization:'Bearer synthetic'}}));
  const body=await res.json();assert.equal(res.status,200);assert.deepEqual(body.preparation.profile,profile);
  assert.equal(body.preparation.curriculum.registryVersion,'synthetic@1');assert.doesNotMatch(JSON.stringify(body),/privateField|never-return|isAdmin/);
});
test('preparation UI shows honest unmapped coverage, an explicit all-knowledge escape and only initial goals',()=>{
  assert.equal(typeof view.preparationScopeMarkup,'function');assert.equal(typeof view.preparationAccountMarkup,'function');
  const c=curriculum();c.mappings=[];
  const html=view.preparationScopeMarkup({...library(),preparation:{profile,curriculum:c}},'goals');
  assert.match(html,/Not mapped yet/);assert.doesNotMatch(html,/100%|mastered|ready to pass/);
  assert.match(html,/Explore all knowledge/);assert.match(html,/Needed foundations/);
  const account=view.preparationAccountMarkup({profile:null,loading:false,error:null,saving:false});
  for(const label of ['NEET-PG','INI-CET','Both'])assert.ok(account.includes(label));
  assert.doesNotMatch(account,/USMLE|FMGE|PLAB/);
});
