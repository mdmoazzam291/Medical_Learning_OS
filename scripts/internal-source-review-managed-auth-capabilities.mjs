// Read-only, offline classifier for the exact managed-Auth catalog probe.
// No Supabase client, credentials, network, SQL execution or production writes.
// This does NOT authenticate anyone or authorize a reviewer.
const FIELDS=Object.freeze([
 'postgres_version','auth_sessions_present','authenticated_auth_schema_usage',
 'authenticated_sessions_select','authenticated_sessions_update',
 'service_role_auth_schema_usage','service_role_sessions_select',
 'service_role_sessions_update'
]);
const BOOLEANS=FIELDS.filter(k=>k!=='postgres_version');
const verdict=(status,detail)=>Object.freeze({
 status,detail,
 metadataOnly:true,
 directAuthSessionRowLockApproved:false,
 managedSourceReviewEndpointApproved:false,
 transactionalSessionRevocationVerified:false,
 reviewerGrantAuthorityVerified:false,
 publicationApproved:false,
 nonproductionAcceptanceRequired:true,
 independentSecurityReviewRequired:true
});

export function assessManagedAuthSessionCapabilities(record){
 try{
  if(!record||typeof record!=='object'||Array.isArray(record)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(record)))throw Error('invalid');
  const keys=Reflect.ownKeys(record);
  if(keys.length!==FIELDS.length||keys.some(k=>typeof k!=='string'||!FIELDS.includes(k)))
   throw Error('invalid');
  for(const key of FIELDS){
   const descriptor=Object.getOwnPropertyDescriptor(record,key);
   if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw Error('invalid');
  }
  if(typeof record.postgres_version!=='string'||!/^[0-9]+(?:\.[0-9]+){1,2}$/.test(record.postgres_version)||
   BOOLEANS.some(k=>typeof record[k]!=='boolean'))throw Error('invalid');

  if(!record.auth_sessions_present)return verdict('schema-unverified',
   'Auth sessions table unavailable; no direct-table design can be assumed');
  if(record.authenticated_sessions_select||record.authenticated_sessions_update||
   record.service_role_sessions_select||record.service_role_sessions_update)
   return verdict('unexpected-auth-session-privilege',
    'Review unexpected broad managed-Auth table privileges; never use as release authority');

  return verdict('provider-owned-auth-isolated',
   'Direct role access to auth.sessions denied; use independent application review-grant controls and separately verify current session semantics');
 }catch{
  return verdict('invalid-or-untrusted-report',
   'Capability probe missing or malformed; do not infer database access or release readiness');
 }
}
