import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../web/account.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('async function loadReviewerAccess('),source.indexOf('\nfunction applySessionPreference('));
const signedOut=source.slice(source.indexOf('function signedOutState()'),source.indexOf('\nfunction signedOut()'));
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function tick(){await new Promise(r=>setImmediate(r));}
function harness({holdProgress=false,holdReview=false}={}) {
  const user={id:'learner-A',providers:['email']},progress=deferred(),review=deferred();
  let current=user, profileFailure=false;
  const c=vm.createContext({console,Promise,auth:{getSession:async()=>({user:current}),currentUser:()=>current,preparationProfile:async()=>{if(profileFailure)throw Error('offline');return {schemaVersion:1,pathwayIds:['neet-pg'],primaryPathwayId:'neet-pg'};}},cloud:{progress:()=>holdProgress?progress.promise:Promise.resolve({attempts:1}),questions:async()=>({questions:[]}),retentionProbeConsent:async()=>({})},review:{me:()=>holdReview?review.promise:Promise.resolve({isAdmin:false})},projectionError:()=>null,emptyProjectionErrors:()=>({}),reportUnexpected(){},announce(){},render(){}});
  vm.runInContext('let accountLoadGeneration=0; let preparationState={profile:null}; let state={user:'+JSON.stringify(user)+',projectionErrors:{}};'+signedOut+functions,c);
  return {c,progress,review,failProfile(){profileFailure=true;},setUser(value){current=value;},run:()=>vm.runInContext('loadCloud()',c),state:()=>vm.runInContext('({user:state.user,isAdmin:state.isAdmin,profile:preparationState.profile})',c)};
}
test('a preference load cannot restore a signed-out learner after another projection completes late',async()=>{
  const h=harness({holdProgress:true}),pending=h.run();await tick();
  h.setUser(null);vm.runInContext('state=signedOutState()',h.c);h.progress.resolve({attempts:1});await pending;
  assert.equal(h.state().user,null);assert.equal(h.state().profile,null);
});
test('late reviewer access cannot apply a previous account authority to a switched identity',async()=>{
  const h=harness({holdReview:true}),pending=h.run();await tick();
  h.setUser({id:'learner-B',providers:['email']});vm.runInContext("state={user:{id:'learner-B'},isAdmin:false};preparationState={profile:null}",h.c);
  h.review.resolve({isAdmin:true,reviewKinds:['rights']});await pending;
  assert.equal(h.state().user.id,'learner-B');assert.equal(h.state().isAdmin,false);assert.equal(h.state().profile,null);
});

test('a fresh load under another learner cannot retain the previous profile when its read fails',async()=>{
  const h=harness();await h.run();assert.equal(h.state().profile.primaryPathwayId,'neet-pg');
  h.setUser({id:'learner-B',providers:['email']});h.failProfile();await h.run();
  assert.equal(h.state().user.id,'learner-B');assert.equal(h.state().profile,null);
});
