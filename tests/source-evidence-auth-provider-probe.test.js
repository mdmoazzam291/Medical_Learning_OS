import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNonproductionAuthProbeConfig,runIsolatedAuthProviderProbe,createIsolatedAuthAccessObserver} from '../scripts/lib/source-evidence-auth-provider-probe.js';
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
function mockProvider({brokenGlobal=false,brokenLocal=false,invalidAfterSignOut=false,wrongIssuer=false,wrongAudience=false,revokedRefreshNetworkError=false,revokedRefreshTimeout=false,forgedProviderErrorClass=false,wrongClientUrl=false,getUserTransportOn=null,getUserClientErrorOn=null}={}){
 const actor={ [userA.email]:'11111111-1111-4111-8111-111111111111',[userB.email]:'22222222-2222-4222-8222-222222222222'};
 const sessions=new Map(),tokens=new Map();let serial=0;const actions=[];
 function mint(session){
  const payload={sub:session.user,session_id:session.id,exp:Math.floor(Date.now()/1000)+3600,aal:'aal1',iss:wrongIssuer?'https://other-project.supabase.co/auth/v1':setup.url+'/auth/v1',aud:wrongAudience?'anon':'authenticated'};
  const access_token='e30.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.sig';
  const refresh_token='private-refresh-'+(++serial);
  tokens.set(access_token,session.id);session.refresh=refresh_token;
  return {access_token,refresh_token};
 }
 return {actions,createClient(){
  let activeId=null;
  return {supabaseUrl:wrongClientUrl?'https://iyapppmeieqhflnzslao.supabase.co':setup.url,auth:{
   async signInWithPassword({email,password}){
    const account=email===userA.email?userA:email===userB.email?userB:null;
    if(!account||account.password!==password)return {data:null,error:{message:'invalid'}};
    const id='33333333-3333-4333-8333-'+String(++serial).padStart(12,'0');
    const session={id,user:actor[email],revoked:false,refresh:null};sessions.set(id,session);activeId=id;
    actions.push('login');return {data:{session:mint(session)},error:null};
   },
   async getUser(token){
    const sid=tokens.get(token),s=sessions.get(sid);
    const phase=!s?'forged':s.revoked?'afterSignOut':'active';
    if(getUserTransportOn===phase)throw Error('transient-provider-network-outage');
    if(getUserClientErrorOn===phase)return {data:{user:null},error:{name:'AuthRetryableFetchError',code:'bad_jwt',status:401}};
    if(!s||(invalidAfterSignOut&&s.revoked))return {
     data:{user:null},error:{name:'AuthApiError',code:!s?'bad_jwt':'session_not_found',status:401}
    };
    return {data:{user:{id:s.user}},error:null};
   },
   async refreshSession({refresh_token}){
    const s=[...sessions.values()].find(x=>x.refresh===refresh_token&&!x.revoked);
    if(!s){
     if(revokedRefreshNetworkError)throw Error('failed to fetch');
     if(revokedRefreshTimeout)return {data:null,error:{message:'upstream timed out',code:'request_timeout',status:504}};
     return {data:null,error:{name:forgedProviderErrorClass?'AuthRetryableFetchError':'AuthApiError',message:'refresh rejected',code:'refresh_token_not_found',status:400}};
    }
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
 const report=await runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient});
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
   runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
   e=>e.message==='auth_provider_probe_failed'
  );
  assert.ok(fake.actions.includes('logout:local'));
 }
});
test('probe never infers Auth lifetime validity from JWT sign-out behavior',async()=>{
 const fake=mockProvider({invalidAfterSignOut:true});
 const result=await runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient});
 assert.equal(result.oldLocalJwtRecognized,false);
 assert.equal(result.oldGlobalJwtRecognized,false);
 assert.equal(result.databaseAuthority,'not_exercised');
 assert.equal(result.signedExpiredJwt,'not_exercised');
});
test('probe refuses mismatched test identities before allocating clients',async()=>{
 let n=0;await assert.rejects(
  runIsolatedAuthProviderProbe({...setup,createClient:()=>{n++;return {};},accountB:userA}),
  /auth_probe_isolation_not_established/
 );assert.equal(n,0);
});

test('probe enforces target and confirmation BEFORE creating clients even if bypassing CLI',async()=>{
 for(const invalid of [
  {...setup,url:'https://untrusted.example.org'},
  {...setup,projectRef:liveProject,url:`https://${liveProject}.supabase.co`},
  {...setup,projectRef:legacyProject,url:`https://${legacyProject}.supabase.co`},
  {...setup,confirmation:'MISSING'},
  {...setup,accountA:{...userA,email:'ordinary@example.org'}},
 ]){
  let called=0;
  await assert.rejects(
   runIsolatedAuthProviderProbe({...invalid,createClient:()=>{called++;throw Error('must_not_connect');}}),
   /auth_probe_isolation_not_established/
  );
  assert.equal(called,0,'no authentication clients created for unsafe target');
 }
});
test('JWT issuer and authenticated audience must match the explicitly selected sandbox',async()=>{
 for(const bad of [{wrongIssuer:true},{wrongAudience:true}]){
  const fake=mockProvider(bad);
  await assert.rejects(runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),/auth_provider_probe_failed/);
  assert.equal(fake.actions.filter(x=>x==='logout:local').length,3,'all test sessions cleaned on claim mismatch');
 }
});

test('network failure or timeout is never mistaken for proven refresh-token revocation',async()=>{
 for(const mode of [{revokedRefreshNetworkError:true},{revokedRefreshTimeout:true}]){
  const fake=mockProvider(mode);
  await assert.rejects(
   runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
   error=>error.message==='auth_provider_probe_failed'
  );
  assert.ok(fake.actions.includes('logout:local'));
 }
});

test('refuses an SDK client configured for a different Auth endpoint before sign-in',async()=>{
 const fake=mockProvider({wrongClientUrl:true});
 await assert.rejects(
  runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
  error=>error.message==='auth_provider_probe_failed'
 );
 assert.equal(fake.actions.length,0,'no login, logout or other remote operation');
});
test('does not trust client error codes pretending to be a provider API denial',async()=>{
 const fake=mockProvider({forgedProviderErrorClass:true});
 await assert.rejects(
  runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
  error=>error.message==='auth_provider_probe_failed'
 );
 assert.ok(fake.actions.includes('logout:local'));
});

test('forged-token proof does not pass when getUser is offline or yields a client error',async()=>{
 for(const config of [{getUserTransportOn:'forged'},{getUserClientErrorOn:'forged'}]){
  const fake=mockProvider(config);
  await assert.rejects(
   runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
   error=>error.message==='auth_provider_probe_failed'
  );
  assert.ok(fake.actions.includes('logout:local'),'remaining disposable session is closed');
 }
});
test('signed-out access observations do not convert provider outages into false rejections',async()=>{
 for(const config of [{getUserTransportOn:'afterSignOut'},{getUserClientErrorOn:'afterSignOut'}]){
  const fake=mockProvider(config);
  await assert.rejects(
   runIsolatedAuthProviderProbe({...setup,createClient:fake.createClient}),
   error=>error.message==='auth_provider_probe_failed'
  );
 }
});

test('genuine local GoTrue target is allowed only at exact loopback origin and opt-in',async()=>{
 const local={...setup,url:'http://127.0.0.1:54321',
  projectRef:'local-gotrue-only',confirmation:'ISOLATED_LOCAL_GOTRUE_TEST_STACK'};
 assert.equal(validateNonproductionAuthProbeConfig(local).url,local.url);
 for(const bad of [
  {...local,url:'http://localhost:54321'},
  {...local,url:'http://127.0.0.1:54322'},
  {...local,url:'http://0.0.0.0:54321'},
  {...local,url:'https://127.0.0.1:54321'},
  {...local,url:'https://iyapppmeieqhflnzslao.supabase.co'},
  {...local,confirmation:'ISOLATED_NONPRODUCTION_TEST_ACCOUNTS'},
  {...local,projectRef:'iyapppmeieqhflnzslao'},
  {...local,accountB:userA},
 ]){
  let called=0;
  assert.throws(()=>validateNonproductionAuthProbeConfig(bad),/isolation_not_established/);
  await assert.rejects(runIsolatedAuthProviderProbe({...bad,createClient:()=>{called++;throw Error('must_not_call');}}),
   /auth_probe_isolation_not_established/);
  assert.equal(called,0,'no SDK client for invalid local target');
 }
});

function response(status,value,{contentType='application/json'}={}){
 return {status,headers:{get:name=>name==='content-type'?contentType:null},
  async text(){return typeof value==='string'?value:JSON.stringify(value);}};
}
test('direct /user observer only accepts bounded sandbox provider responses',async()=>{
 const seen=[];
 const observed=createIsolatedAuthAccessObserver({...setup,
  apiKey:'sb_publishable_dummy-local-sandbox',
  fetchImpl:async(url,options)=>{
   seen.push({url,options});
   return response(200,{id:'11111111-1111-4111-8111-111111111111'});
  }
 });
 assert.equal(await observed('e30.e30.sig'),'11111111-1111-4111-8111-111111111111');
 assert.equal(seen.length,1);
 assert.equal(seen[0].url,setup.url+'/auth/v1/user');
 assert.equal(seen[0].options.redirect,'error');
 assert.equal(seen[0].options.headers.authorization,'Bearer e30.e30.sig');
 assert.equal(seen[0].options.headers.apikey,'sb_publishable_dummy-local-sandbox');
 for(const [status,body] of [
  [401,{error_code:'bad_jwt'}],[403,{error_code:'session_not_found'}],[422,{error_code:'session_expired'}],[403,{code:'session_not_found'}]
 ]){
  const probe=createIsolatedAuthAccessObserver({...setup,apiKey:'sb_publishable_dummy-local-sandbox',
   fetchImpl:async()=>response(status,body)});
  assert.equal(await probe('e30.e30.sig'),null);
 }
});
test('direct /user observer denies unavailable network, malformed response and ambiguous client/provider errors',async()=>{
 for(const stub of [
  async()=>{throw Error('offline');},
  async()=>response(401,{message:'unauthorized'}),
  async()=>response(500,{code:'bad_jwt'}),
  async()=>response(401,{code:'invalid_credentials'}),
  async()=>response(403,{error_code:'session_not_found',code:'bad_jwt'}),
  async()=>response(403,{error_code:'unexpected_failure'}),
  async()=>response(401,{code:'session_not_found',id:'11111111-1111-4111-8111-111111111111'}),
  async()=>response(200,{id:'not-uuid'}),
  async()=>response(200,{id:'11111111-1111-4111-8111-111111111111'},{contentType:'text/html'}),
  async()=>response(403,'not-json'),
  async()=>response(200,'x'.repeat(17000)),
 ]){
  const probe=createIsolatedAuthAccessObserver({...setup,apiKey:'sb_publishable_dummy-local-sandbox',fetchImpl:stub});
  await assert.rejects(probe('e30.e30.sig'),/auth_provider_probe_failed/);
 }
 let requests=0;
 assert.throws(()=>createIsolatedAuthAccessObserver({...setup,
  url:'https://iyapppmeieqhflnzslao.supabase.co',
  apiKey:'sb_publishable_dummy-local-sandbox',fetchImpl:async()=>{requests++;}}),
  /auth_probe_isolation_not_established/);
 assert.throws(()=>createIsolatedAuthAccessObserver({...setup,
  apiKey:'sb_secret_danger',fetchImpl:async()=>{requests++;}}),
  /auth_probe_isolation_not_established/);
 assert.equal(requests,0);
});
