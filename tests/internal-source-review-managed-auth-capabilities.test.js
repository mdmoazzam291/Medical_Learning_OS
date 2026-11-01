import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessManagedAuthSessionCapabilities} from '../scripts/internal-source-review-managed-auth-capabilities.mjs';

const report=()=>({
 postgres_version:'17.6',auth_sessions_present:true,
 authenticated_auth_schema_usage:true,
 authenticated_sessions_select:false,authenticated_sessions_update:false,
 service_role_auth_schema_usage:true,
 service_role_sessions_select:false,service_role_sessions_update:false
});
function closed(v){
 for(const key of ['directAuthSessionRowLockApproved','managedSourceReviewEndpointApproved',
   'transactionalSessionRevocationVerified','reviewerGrantAuthorityVerified','publicationApproved'])
   assert.equal(v[key],false,key);
 assert.equal(v.metadataOnly,true);
 assert.equal(v.nonproductionAcceptanceRequired,true);
 assert.equal(v.independentSecurityReviewRequired,true);
 assert.equal(Object.isFrozen(v),true);
}
test('actual observed privilege profile remains release-blocked despite normal schema usage',()=>{
 const r=assessManagedAuthSessionCapabilities(report());
 assert.equal(r.status,'provider-owned-auth-isolated');
 closed(r);
});
test('unexpected privileges do not silently open a managed Auth lock path',()=>{
 for(const key of ['authenticated_sessions_select','authenticated_sessions_update',
   'service_role_sessions_select','service_role_sessions_update']){
  const r=assessManagedAuthSessionCapabilities({...report(),[key]:true});
  assert.equal(r.status,'unexpected-auth-session-privilege',key);
  closed(r);
 }
});
test('unknown schema, missing or malformed privilege reports fail closed',()=>{
 const missing=assessManagedAuthSessionCapabilities({...report(),auth_sessions_present:false});
 assert.equal(missing.status,'schema-unverified');closed(missing);
 const invalid=[
  null,undefined,{},[],{...report(),authenticated_sessions_select:null},
  {...report(),postgres_version:'17.6; grant all'},
  {...report(),auth_sessions_present:'true'},
  {...report(),authorized:true},
  Object.assign(Object.create({privilege:true}),report())
 ];
 for(const input of invalid){
  const r=assessManagedAuthSessionCapabilities(input);
  assert.equal(r.status,'invalid-or-untrusted-report');
  closed(r);
 }
});
test('accessor, symbol and nonenumerable fields cannot masquerade as capabilities',()=>{
 const a=report();let touched=false;
 Object.defineProperty(a,'authenticated_sessions_select',{enumerable:true,get(){touched=true;return true;}});
 assert.equal(assessManagedAuthSessionCapabilities(a).status,'invalid-or-untrusted-report');
 assert.equal(touched,false);
 const s=report();s[Symbol('approval')]=true;
 assert.equal(assessManagedAuthSessionCapabilities(s).status,'invalid-or-untrusted-report');
 const hidden=report();Object.defineProperty(hidden,'secret',{value:'approve'});
 assert.equal(assessManagedAuthSessionCapabilities(hidden).status,'invalid-or-untrusted-report');
});
test('stored SQL inventory cannot query Auth rows, take locks or change privileges',async()=>{
 const sql=await readFile(new URL('../scripts/internal-source-review-managed-auth-capabilities.sql',import.meta.url),'utf8');
 const stripped=sql.replace(/^--.*$/gm,'').trim();
 assert.match(stripped,/^select\s+current_setting\('server_version'\)/i);
 assert.match(stripped,/has_table_privilege\('authenticated','auth\.sessions','SELECT'\)/);
 assert.match(stripped,/has_table_privilege\('service_role','auth\.sessions','SELECT'\)/);
 assert.match(stripped,/to_regclass\('auth\.sessions'\)/);
 assert.equal((stripped.match(/;/g)||[]).length,1);
 assert.doesNotMatch(stripped,/\b(insert|update|delete|alter|create|drop|truncate|grant|revoke|execute|copy|lock|pg_sleep|for\s+(update|share))\b/i);
 assert.doesNotMatch(stripped,/\bfrom\s+auth\./i);
 assert.doesNotMatch(stripped,/\bjoin\s+auth\./i);
});
