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
 if(confirmation!=='ISOLATED_NONPRODUCTION_TEST_ACCOUNTS'||
    typeof projectRef!=='string'||!/^[a-z0-9]{20}$/.test(projectRef)||knownProjects.has(projectRef)||
    url!==`https://${projectRef}.supabase.co`||
    !validateAccount(accountA)||!validateAccount(accountB)||
    accountA.email.toLowerCase()===accountB.email.toLowerCase())throw new Error('auth_probe_isolation_not_established');
 return Object.freeze({url,projectRef});
}
async function safeUser(client,token){
 try{
  const result=await client.auth.getUser(token);
  const id=result?.error==null?result?.data?.user?.id:null;
  return typeof id==='string'&&uuid.test(id)?id.toLowerCase():null;
 }catch{return null;}
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
export async function runIsolatedAuthProviderProbe({createClient,url,projectRef,confirmation,accountA,accountB}){
 // Mandatory even when this function is invoked directly rather than via the CLI.
 // Do not allocate a client until the exact sandbox target and identities pass.
 validateNonproductionAuthProbeConfig({url,projectRef,confirmation,accountA,accountB});
 if(typeof createClient!=='function')throw new Error('auth_probe_isolation_not_established');
 const a1=boundClient(createClient,url),a2=boundClient(createClient,url),b=boundClient(createClient,url),verifier=boundClient(createClient,url);
 if([a1,a2,b,verifier].some(c=>!c?.auth||typeof c.auth.getUser!=='function'))throw reject();
 let signedA1=false,signedA2=false,signedB=false;
 try{
  const first=await login(a1,accountA);signedA1=true;
  const second=await login(a2,accountA);signedA2=true;
  const other=await login(b,accountB);signedB=true;
  const [id1,id2,idB]=await Promise.all([safeUser(verifier,first.access_token),safeUser(verifier,second.access_token),safeUser(verifier,other.access_token)]);
  if(!id1||id1!==id2||!idB||id1===idB)throw reject();
  const c1=verifiedClaims(first.access_token,id1,url),c2=verifiedClaims(second.access_token,id1,url),cB=verifiedClaims(other.access_token,idB,url);
  if(new Set([c1.session,c2.session,cB.session]).size!==3)throw reject();
  const renewed=await rotate(a1,first.refresh_token);
  if(await safeUser(verifier,renewed.access_token)!==id1)throw reject();
  const cRenew=verifiedClaims(renewed.access_token,id1,url);
  if(cRenew.session!==c1.session)throw reject();
  await logout(a1,'local');signedA1=false;
  if(!await revokedRefresh(createClient,renewed.refresh_token,url))throw reject();
  const oldLocalJwtRecognized=await safeUser(verifier,renewed.access_token)===id1;
  if(await safeUser(verifier,second.access_token)!==id1)throw reject();
  await logout(a2,'global');signedA2=false;
  if(!await revokedRefresh(createClient,second.refresh_token,url))throw reject();
  const oldGlobalJwtRecognized=await safeUser(verifier,second.access_token)===id1;
  if(await safeUser(verifier,other.access_token)!==idB)throw reject();
  const forged=renewed.access_token.split('.');
  forged[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(forged[1],'base64url').toString('utf8')),sub:idB})).toString('base64url');
  if(await safeUser(verifier,forged.join('.'))!==null)throw reject();
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
