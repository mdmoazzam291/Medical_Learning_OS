// Isolated provider acceptance protocol, not an app route or Auth adapter.
// Only private, explicitly configured nonproduction test accounts are permitted.
const reject=()=>new Error('auth_provider_probe_failed');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function decode(token){
 try{
  if(typeof token!=='string'||token.length>16384)return null;
  const pieces=token.split('.');
  if(pieces.length!==3||pieces.some(x=>!x||!/^[\w-]+$/.test(x)))return null;
  const payload=JSON.parse(Buffer.from(pieces[1],'base64url').toString('utf8'));
  if(!uuid.test(payload.sub)||!uuid.test(payload.session_id)||!Number.isSafeInteger(payload.exp))return null;
  return {sub:payload.sub.toLowerCase(),session:payload.session_id.toLowerCase(),exp:payload.exp,issuer:payload.iss,audience:payload.aud,aal:payload.aal==='aal2'?'aal2':payload.aal==='aal1'?'aal1':'unknown'};
 }catch{return null;}
}
function validateAccount(account){
 return account&&typeof account.email==='string'&&account.email.includes('+mlos-probe-')&&
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)&&
   typeof account.password==='string'&&account.password.length>=12;
}
export function validateNonproductionAuthProbeConfig({url,projectRef,confirmation,accountA,accountB}){
 const knownProjects=new Set(['iyapppmeieqhflnzslao','ueuguguoladoqvtxkumt']);
 const hosted=confirmation==='ISOLATED_NONPRODUCTION_TEST_ACCOUNTS'&&
   typeof projectRef==='string'&&/^[a-z0-9]{20}$/.test(projectRef)&&
   !knownProjects.has(projectRef)&&url===`https://${projectRef}.supabase.co`;
 // Standalone CLI GoTrue is reachable only through an exact loopback origin.
 // This cannot be triggered with a public hostname, remote project ref, or
 // a hosted confirmation string.
 const local=confirmation==='ISOLATED_LOCAL_GOTRUE_TEST_STACK'&&
   projectRef==='local-gotrue-only'&&url==='http://127.0.0.1:54321';
 if((!hosted&&!local)||!validateAccount(accountA)||!validateAccount(accountB)||
    accountA.email.toLowerCase()===accountB.email.toLowerCase())throw new Error('auth_probe_isolation_not_established');
 return Object.freeze({url,projectRef});
}
// A rejected credential is evidence only if Auth itself explicitly rejects it.
// Transport errors, malformed SDK responses and timeouts are inconclusive and
// must fail this acceptance run rather than masquerade as a rejected JWT.
const rejectedAccessCodes=new Set([
 'bad_jwt','session_not_found','session_expired','user_not_found','user_banned'
]);
// Auth SDK may convert a server-side session_not_found reply into a
// client-side AuthSessionMissingError. A direct, bounded /user request is
// required for post-logout JWT *observation*, never for login authority.
// The target URL is the validated sandbox origin; redirects and unknown
// responses fail rather than being counted as revoked or accepted.
export function createIsolatedAuthAccessObserver({
 url,projectRef,confirmation,accountA,accountB,apiKey,fetchImpl=fetch,onDiagnostic
}){
 validateNonproductionAuthProbeConfig({url,projectRef,confirmation,accountA,accountB});
 if(typeof apiKey!=='string'||!apiKey.startsWith('sb_publishable_')||
    apiKey.length>400||typeof fetchImpl!=='function')throw new Error('auth_probe_isolation_not_established');
 return async function observeAccess(token){
  if(typeof token!=='string'||!token||token.length>16384)throw reject();
  let response;
  try{
   response=await fetchImpl(url+'/auth/v1/user',{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{apikey:apiKey,authorization:'Bearer '+token,accept:'application/json'},
    signal:AbortSignal.timeout(7000)
   });
  }catch{throw reject();}
  const safeStatus=[200,400,401,403,404,422,429,500,502,503].includes(response?.status)?response.status:'other';
  onDiagnostic?.('http_status_'+safeStatus);
  const ct=response?.headers?.get('content-type')?.toLowerCase();
  if(!Number.isInteger(response?.status)||!ct?.includes('application/json')){
   onDiagnostic?.('invalid_content_type');throw reject();
  }
  let data;
  try{
   const body=await response.text();
   if(body.length>16384)throw reject();
   data=JSON.parse(body);
  }catch{
   onDiagnostic?.('invalid_json_body');throw reject();
  }
  // GoTrue's wire-level error identifier is error_code. Some adapters
  // expose code instead; never trust conflicting fields or error messages.
  // GoTrue may return {code:403,error_code:"session_not_found"}.
  // Numeric code is the HTTP status, not a second Auth error identifier.
  if(data?.error_code!=null&&typeof data?.code==='string'&&data.error_code!==data.code)throw reject();
  if(data?.code!=null&&typeof data.code==='number'&&data.code!==response.status)throw reject();
  const serverCode=typeof data?.error_code==='string'?data.error_code:
    typeof data?.code==='string'?data.code:null;
  const safeCode=['bad_jwt','session_not_found','session_expired','user_not_found',
   'user_banned','invalid_credentials','invalid_token','jwt_expired']
   .includes(serverCode)?serverCode:'unrecognized_code';
  if(response.status!==200)onDiagnostic?.('http_code_'+safeCode);
  if(response.status===200){
   const id=data?.id;
   if(typeof id!=='string'||!uuid.test(id)){
    onDiagnostic?.('invalid_success_id');throw reject();
   }
   return id.toLowerCase();
  }
  if([400,401,403,422].includes(response.status)&&
     ['bad_jwt','session_not_found','session_expired','user_not_found','user_banned'].includes(serverCode)&&
     data?.id==null)return null;
  throw reject();
 };
}

async function observedUser(client,token,onDiagnostic){
 let result;
 try{result=await client.auth.getUser(token);}catch{
  onDiagnostic?.('transport_exception');throw reject();
 }
 if(result?.error){
  const e=result.error;
  // Diagnostics are fixed labels; never log e.message, an identity or JWT.
  const safeCode=['bad_jwt','session_not_found','session_expired','user_not_found',
   'user_banned','invalid_credentials','invalid_token','jwt_expired','unknown_error']
   .includes(e.code)?e.code:'unrecognized_code';
  const nonproviderName=['AuthSessionMissingError','AuthRetryableFetchError','AuthUnknownError',
   'AuthInvalidTokenResponseError','AuthError','AuthWeakPasswordError','AuthImplicitGrantRedirectError']
   .includes(e.name)?e.name:'unrecognized_error_class';
  onDiagnostic?.(e.name==='AuthApiError'?'provider_'+safeCode:'nonprovider_'+nonproviderName);
  if(result?.data?.user!=null||e.name!=='AuthApiError'||
     !rejectedAccessCodes.has(e.code)||![400,401,403,422].includes(e.status))throw reject();
  return null;
 }
 const id=result?.data?.user?.id;
 if(typeof id!=='string'||!uuid.test(id)){
  onDiagnostic?.('malformed_success');throw reject();
 }
 return id.toLowerCase();
}
async function login(client,account){
 const result=await client.auth.signInWithPassword({email:account.email,password:account.password});
 if(result?.error||!result?.data?.session?.access_token||!result?.data?.session?.refresh_token)throw reject();
 return result.data.session;
}
async function rotate(client,refreshToken){
 const result=await client.auth.refreshSession({refresh_token:refreshToken});
 if(result?.error||!result?.data?.session?.access_token||!result?.data?.session?.refresh_token)throw reject();
 return result.data.session;
}
function boundClient(factory,url){
 const client=factory(url);
 // Real SDK exposes this constructor-bound property at runtime. A test-only
 // mock must expose it too; no uninspectable fallback client is permitted.
 if(client?.supabaseUrl!==url||!client.auth||
    typeof client.auth.getUser!=='function'||typeof client.auth.refreshSession!=='function'||
    typeof client.auth.signOut!=='function')throw reject();
 return client;
}
async function revokedRefresh(createClient,refreshToken,url){
 let client;
 try{
  client=boundClient(createClient,url);
  const result=await client.auth.refreshSession({refresh_token:refreshToken});
  if(result?.data?.session){
   // Unexpected successful refresh: close the newly authenticated disposable
   // session before rejecting the whole acceptance run.
   try{await client.auth.signOut({scope:'local'});}catch{}
   return false;
  }
  // An outage, timeout, thrown SDK error or malformed response is NOT
  // evidence of revocation. Require a real AuthApiError classification.
  const error=result?.error;
  return error?.name==='AuthApiError'&&
    (error.code==='refresh_token_not_found'||error.code==='refresh_token_already_used')&&
    [400,401,422].includes(error.status);
 }catch{return false;}
}
async function logout(client,scope){
 const result=await client.auth.signOut({scope});
 if(result?.error)throw reject();
}
function verifiedClaims(token,id,url){
 const claim=decode(token);
 if(!claim||claim.sub!==id||claim.exp<=Math.floor(Date.now()/1000)||
    claim.issuer!==url+'/auth/v1'||claim.audience!=='authenticated')throw reject();
 return claim;
}
export async function runIsolatedAuthProviderProbe({createClient,url,projectRef,confirmation,accountA,accountB,onPhase,observeAccess}){
 // Mandatory even when this function is invoked directly rather than via the CLI.
 // Do not allocate a client until the exact sandbox target and identities pass.
 validateNonproductionAuthProbeConfig({url,projectRef,confirmation,accountA,accountB});
 if(typeof createClient!=='function')throw new Error('auth_probe_isolation_not_established');
 if(observeAccess!=null&&typeof observeAccess!=='function')throw new Error('auth_probe_isolation_not_established');
 const a1=boundClient(createClient,url),a2=boundClient(createClient,url),b=boundClient(createClient,url),verifier=boundClient(createClient,url);
 if([a1,a2,b,verifier].some(c=>!c?.auth||typeof c.auth.getUser!=='function'))throw reject();
 let signedA1=false,signedA2=false,signedB=false;
 try{
  if(typeof onPhase==='function')onPhase('login_a1');
  const first=await login(a1,accountA);signedA1=true;
  if(typeof onPhase==='function')onPhase('login_a2');
  const second=await login(a2,accountA);signedA2=true;
  if(typeof onPhase==='function')onPhase('login_b');
  const other=await login(b,accountB);signedB=true;
  if(typeof onPhase==='function')onPhase('verify_initial');
  const [id1,id2,idB]=await Promise.all([observedUser(verifier,first.access_token),observedUser(verifier,second.access_token),observedUser(verifier,other.access_token)]);
  if(!id1||id1!==id2||!idB||id1===idB)throw reject();
  const c1=verifiedClaims(first.access_token,id1,url),c2=verifiedClaims(second.access_token,id1,url),cB=verifiedClaims(other.access_token,idB,url);
  if(new Set([c1.session,c2.session,cB.session]).size!==3)throw reject();
  if(typeof onPhase==='function')onPhase('refresh');
  const renewed=await rotate(a1,first.refresh_token);
  if(await observedUser(verifier,renewed.access_token)!==id1)throw reject();
  const cRenew=verifiedClaims(renewed.access_token,id1,url);
  if(cRenew.session!==c1.session)throw reject();
  if(typeof onPhase==='function')onPhase('local_signout');
  await logout(a1,'local');signedA1=false;
  if(typeof onPhase==='function')onPhase('local_revocation');
  if(!await revokedRefresh(createClient,renewed.refresh_token,url))throw reject();
  if(typeof onPhase==='function')onPhase('local_access_observation');
  const oldLocalJwtRecognized=(observeAccess?
   await observeAccess(renewed.access_token):
   await observedUser(verifier,renewed.access_token,label=>onPhase?.('local_access_'+label)))===id1;
  if(typeof onPhase==='function')onPhase('other_session_after_local_signout');
  if(await observedUser(verifier,second.access_token,
   label=>onPhase?.('other_session_'+label))!==id1)throw reject();
  if(typeof onPhase==='function')onPhase('global_signout');
  await logout(a2,'global');signedA2=false;
  if(typeof onPhase==='function')onPhase('global_revocation');
  if(!await revokedRefresh(createClient,second.refresh_token,url))throw reject();
  if(typeof onPhase==='function')onPhase('global_access_observation');
  const oldGlobalJwtRecognized=(observeAccess?
   await observeAccess(second.access_token):
   await observedUser(verifier,second.access_token,label=>onPhase?.('global_access_'+label)))===id1;
  if(await observedUser(verifier,other.access_token)!==idB)throw reject();
  if(typeof onPhase==='function')onPhase('tamper_rejection');
  const forged=renewed.access_token.split('.');
  forged[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(forged[1],'base64url').toString('utf8')),sub:idB})).toString('base64url');
  if((observeAccess?await observeAccess(forged.join('.')):
   await observedUser(verifier,forged.join('.'),label=>onPhase?.('tamper_'+label)))!==null)throw reject();
  return Object.freeze({
   status:'observed_nonproduction_provider',
   separateUsersAndSessions:true,refreshPreservedSession:true,
   localAndGlobalRefreshRevocation:true,otherAccountUnaffected:true,
   tamperedSignatureRejected:true,
   oldLocalJwtRecognized,oldGlobalJwtRecognized,
   observedAssuranceLevels:[c1.aal,c2.aal,cB.aal],
   mfaChallenge:'not_exercised',signedExpiredJwt:'not_exercised',
   databaseAuthority:'not_exercised',providerRaceSerialization:'not_exercised',
   deployApproved:false
  });
 }catch{throw reject();}
 finally{
  for(const [client,signed] of [[a1,signedA1],[a2,signedA2],[b,signedB]]){
   if(signed)try{await client.auth.signOut({scope:'local'});}catch{}
  }
 }
}
