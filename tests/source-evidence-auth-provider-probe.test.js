import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNonproductionAuthProbeConfig,runIsolatedAuthProviderProbe} from '../scripts/lib/source-evidence-auth-provider-probe.js';
const userA={email:'first+mlos-probe-owner@example.org',password:'test-only-password-very-long'};
const userB={email:'second+mlos-probe-reviewer@example.org',password:'test-only-password-different'};
const liveProject='iyapppmeieqhflnzslao',legacyProject='ueuguguoladoqvtxkumt',nonprod='aaaaaaaaaaaaaaaaaaaa';
const setup={url:`https://${nonprod}.supabase.co`,projectRef:nonprod,confirmation:'ISOLATED_NONPRODUCTION_TEST_ACCOUNTS',accountA:userA,accountB:userB};
test('nonproduction guard blocks both actual project refs and misleading test settings',()=>{
 assert.equal(validateNonproductionAuthProbeConfig(setup).projectRef,nonprod);
 for(const value of [
  {...setup,projectRef:liveProject,url:`https://${liveProject}.supabase.co`},
  {...setup,projectRef:legacyProject,url:`https://${legacyProject}.supabase.co`},
  {...setup,confirmation:'yes'},
  {...setup,url:'http://'+nonprod+'.supabase.co'},
  {...setup,url:'https://evil.example.net'},
  {...setup,accountB:userA},
  {...setup,accountA:{email:'owner@example.org',password:userA.password}},
  {...setup,accountB:{email:userB.email,password:'short'}}
 ])assert.throws(()=>validateNonproductionAuthProbeConfig(value),/auth_probe_isolation_not_established/);
});
function mockProvider({brokenGlobal=false,brokenLocal=false,invalidAfterSignOut=false}={}){
 const actor={ [userA.email]:'11111111-1111-4111-8111-111111111111',[userB.email]:'22222222-2222-4222-8222-222222222222'};
 const sessions=new Map(),tokens=new Map();let serial=0;const actions=[];
 function mint(session){
  const payload={sub:session.user,session_id:session.id,exp:Math.floor(Date.now()/1000)+3600,aal:'aal1'};
  const access_token='e30.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.sig';
  const refresh_token='private-refresh-'+(++serial);
  tokens.set(access_token,session.id);session.refresh=refresh_token;
  return {access_token,refresh_token};
 }
 return {actions,createClient(){
  let activeId=null;
  return {auth:{
   async signInWithPassword({email,password}){
    const account=email===userA.email?userA:email===userB.email?userB:null;
    if(!account||account.password!==password)return {data:null,error:{message:'invalid'}};
    const id='33333333-3333-4333-8333-'+String(++serial).padStart(12,'0');
    const session={id,user:actor[email],revoked:false,refresh:null};sessions.set(id,session);activeId=id;
    actions.push('login');return {data:{session:mint(session)},error:null};
   },
   async getUser(token){
    const sid=tokens.get(token),s=sessions.get(sid);
    if(!s||(invalidAfterSignOut&&s.revoked))return {data:{user:null},error:{message:'invalid'}};
    return {data:{user:{id:s.user}},error:null};
   },
   async refreshSession({refresh_token}){
    const s=[...sessions.values()].find(x=>x.refresh===refresh_token&&!x.revoked);
    if(!s)return {data:null,error:{message:'refresh rejected'}};
    activeId=s.id;actions.push('refresh');return {data:{session:mint(s)},error:null};
   },
   async signOut({scope}){
    actions.push('logout:'+scope);
    const active=sessions.get(activeId);
    if(!active)return {error:{message:'not logged in'}};
    const victims=scope==='global'?[...sessions.values()].filter(s=>s.user===active.user):[active];
    for(const s of victims)if(!((scope==='global'&&brokenGlobal)||(scope==='local'&&brokenLocal)))s.revoked=true;
    activeId=null;return {error:null};
   }
  }};
 }};
}
test('probe records live-style JWT survival while proving session refresh revocation and isolation',async()=>{
 const fake=mockProvider();
 const report=await runIsolatedAuthProviderProbe({createClient:fake.createClient,accountA:userA,accountB:userB});
 assert.deepEqual(report,{
  status:'observed_nonproduction_provider',separateUsersAndSessions:true,
  refreshPreservedSession:true,localAndGlobalRefreshRevocation:true,
  otherAccountUnaffected:true,tamperedSignatureRejected:true,
  oldLocalJwtRecognized:true,oldGlobalJwtRecognized:true,
  observedAssuranceLevels:['aal1','aal1','aal1'],mfaChallenge:'not_exercised',
  signedExpiredJwt:'not_exercised',databaseAuthority:'not_exercised',
  providerRaceSerialization:'not_exercised',deployApproved:false
 });
 assert.ok(fake.actions.includes('logout:global'));
 assert.equal(fake.actions.filter(a=>a==='logout:local').length,2);
 assert.ok(!JSON.stringify(report).includes(userA.email)&&!JSON.stringify(report).includes('private-refresh'));
});
test('a provider that fails to revoke local or global refresh tokens never passes',async()=>{
 for(const opts of [{brokenLocal:true},{brokenGlobal:true}]){
  const fake=mockProvider(opts);
  await assert.rejects(
   runIsolatedAuthProviderProbe({createClient:fake.createClient,accountA:userA,accountB:userB}),
   e=>e.message==='auth_provider_probe_failed'
  );
  assert.ok(fake.actions.includes('logout:local'));
 }
});
test('probe never infers Auth lifetime validity from JWT sign-out behavior',async()=>{
 const fake=mockProvider({invalidAfterSignOut:true});
 const result=await runIsolatedAuthProviderProbe({createClient:fake.createClient,accountA:userA,accountB:userB});
 assert.equal(result.oldLocalJwtRecognized,false);
 assert.equal(result.oldGlobalJwtRecognized,false);
 assert.equal(result.databaseAuthority,'not_exercised');
 assert.equal(result.signedExpiredJwt,'not_exercised');
});
test('probe refuses mismatched test identities before allocating clients',async()=>{
 let n=0;await assert.rejects(
  runIsolatedAuthProviderProbe({createClient:()=>{n++;return {};},accountA:userA,accountB:userA}),
  /auth_probe_isolation_not_established/
 );assert.equal(n,0);
});
