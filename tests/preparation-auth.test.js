import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAuth } from '../src/adapters/supabase-auth.js';
const profile={schemaVersion:1,pathwayIds:['neet-pg','ini-cet'],primaryPathwayId:'neet-pg'};
function setup({metadata={},failure=false}={}) {
  const saved=new Map(),calls=[];
  const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const user={id:'synthetic-learner',email:'synthetic@example.invalid',user_metadata:metadata};
  const auth=createSupabaseAuth({projectUrl:'https://example.supabase.co',publishableKey:'sb_publishable_synthetic',storage,fetchFn:async(url,options)=>{
    calls.push({url,options});
    if(url.includes('grant_type=password'))return Response.json({access_token:'synthetic',refresh_token:'synthetic-refresh',expires_at:2100000000,user});
    if(failure)return Response.json({error:'temporarily_unavailable'},{status:503});
    if(options.method==='PUT') {const input=JSON.parse(options.body);assert.deepEqual(Object.keys(input),['data']);user.user_metadata={...user.user_metadata,...input.data};}
    return Response.json(user);
  }});
  return {auth,calls,user,saved};
}
test('preparation preference roundtrips through authenticated metadata without copying evidence or other metadata',async()=>{
  const h=setup({metadata:{unrelated:'keep',isAdmin:true}});await h.auth.signIn('synthetic@example.invalid','synthetic-password');
  assert.equal(typeof h.auth.setPreparationProfile,'function');
  assert.equal(await h.auth.preparationProfile(),null);
  assert.deepEqual(await h.auth.setPreparationProfile(profile),profile);
  assert.deepEqual(await h.auth.preparationProfile(),profile);
  assert.equal(h.user.user_metadata.unrelated,'keep');
  assert.deepEqual(JSON.parse(h.calls.find(c=>c.options.method==='PUT').options.body),{data:{mlos_preparation_profile:profile}});
  assert.equal(h.auth.currentUser().isAdmin,undefined);
  assert.doesNotMatch([...h.saved.values()].join(''),/mlos_preparation_profile|unrelated|isAdmin/);
});
test('preparation rejects unsupported goals and authority fields before any write',async()=>{
  const h=setup();await h.auth.signIn('synthetic@example.invalid','synthetic-password');
  assert.equal(typeof h.auth.setPreparationProfile,'function');
  for(const bad of [{...profile,pathwayIds:['usmle']},{...profile,isAdmin:true}])await assert.rejects(h.auth.setPreparationProfile(bad));
  assert.equal(h.calls.filter(c=>c.options.method==='PUT').length,0);
});
test('unavailable or malformed preparation preferences remain errors rather than saved defaults',async()=>{
  const h=setup({failure:true});await h.auth.signIn('synthetic@example.invalid','synthetic-password');
  assert.equal(typeof h.auth.preparationProfile,'function');
  await assert.rejects(h.auth.preparationProfile());await assert.rejects(h.auth.setPreparationProfile(profile));
  assert.equal(h.auth.currentUser().id,'synthetic-learner');
  const bad=setup({metadata:{mlos_preparation_profile:{...profile,primaryPathwayId:'future'}}});await bad.auth.signIn('synthetic@example.invalid','synthetic-password');
  await assert.rejects(bad.auth.preparationProfile());
});
test('preparation requires an authenticated session and checks returned identity',async()=>{
  const h=setup();assert.equal(typeof h.auth.preparationProfile,'function');await assert.rejects(h.auth.preparationProfile());
  assert.equal(h.calls.length,0);
  await h.auth.signIn('synthetic@example.invalid','synthetic-password');h.user.id='other-user';
  await assert.rejects(h.auth.setPreparationProfile(profile),/preparation_identity_mismatch/);
});

test('equivalent metadata field order confirms the saved profile without a false failure',async()=>{
  const storage={getItem:()=>JSON.stringify({accessToken:'synthetic',refreshToken:'r',expiresAt:2100000000,user:{id:'u1'}}),setItem(){},removeItem(){}};
  const auth=createSupabaseAuth({projectUrl:'https://example.supabase.co',publishableKey:'sb_publishable_synthetic',storage,fetchFn:async()=>Response.json({id:'u1',user_metadata:{mlos_preparation_profile:{primaryPathwayId:'neet-pg',pathwayIds:['ini-cet','neet-pg'],schemaVersion:1}}})});
  assert.deepEqual(await auth.setPreparationProfile(profile),profile);
});
