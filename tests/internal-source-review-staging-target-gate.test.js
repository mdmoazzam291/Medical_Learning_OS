import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessInternalReviewStagingTarget} from '../scripts/internal-source-review-staging-target-gate.mjs';

const policyPath=new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url);
const policy=async()=>JSON.parse(await readFile(policyPath,'utf8'));
const productionRef='iyapppmeieqhflnzslao';
const legacyRef='ueuguguoladoqvtxkumt';
const stagingRef='vwtdwafjrraptrgeshzt';
const org='ltvogluubibhqvtxbegg';
const production=()=>({
 id:productionRef,ref:productionRef,name:'medical_learning_os',
 organization_id:org,status:'ACTIVE_HEALTHY'
});
const legacy=()=>({
 id:legacyRef,ref:legacyRef,name:'NEETPG2027',
 organization_id:org,status:'INACTIVE'
});
const staging=()=>({
 id:stagingRef,ref:stagingRef,name:'medical_learning_os_staging',
 organization_id:org,status:'ACTIVE_HEALTHY'
});
const inventory=(...projects)=>({projects});
const denied=result=>{
 assert.equal(Object.isFrozen(result),true);
 assert.equal(result.metadataOnly,true);
 for(const field of ['trustedProviderInventoryVerified','stagingIdentityVerified',
  'stagingAuthAcceptanceApproved','stagingDbWriteApproved','managedMigrationApproved',
  'productionSourceReviewApproved','reviewerGrantAuthorityVerified','learnerRelease'])
  assert.equal(result[field],false,field);
};
test('policy pins independent approved staging identity and protects production and legacy',async()=>{
 const p=await policy();
 assert.equal(p.productionProjectRef,productionRef);
 assert.equal(p.productionProjectName,'medical_learning_os');
 assert.ok(p.excludedLegacyProjectRefs.includes(legacyRef));
 assert.equal(p.approvedStagingProjectRef,stagingRef);
 assert.equal(p.requiresExplicitOwnerApproval,true);
 assert.equal(p.purpose,'internal-source-row-review-auth-acceptance');
});
test('old two-project inventory no longer satisfies the approved staging identity',async()=>{
 const r=assessInternalReviewStagingTarget(await policy(),inventory(production(),legacy()));
 assert.equal(r.reason,'approved-staging-target-not-found');
 assert.equal(r.isolatedStagingMetadataMatched,false);
 denied(r);
});
test('observed new staging metadata matches only as a candidate, never as write authority',async()=>{
 const r=assessInternalReviewStagingTarget(await policy(),inventory(production(),legacy(),staging()));
 assert.equal(r.reason,'isolated-staging-metadata-candidate-only');
 assert.equal(r.isolatedStagingMetadataMatched,true);
 denied(r);
});
test('production or legacy cannot be selected as staging, even if a policy edit tries',async()=>{
 for(const approved of [productionRef,legacyRef]){
  const p={...await policy(),approvedStagingProjectRef:approved};
  const r=assessInternalReviewStagingTarget(p,inventory(production(),legacy()));
  assert.equal(r.reason,'invalid-or-untrusted-metadata');
  denied(r);
 }
});
test('a separately approved active staging metadata candidate is still NOT a permission to touch data',async()=>{
 const p=await policy();
 const r=assessInternalReviewStagingTarget(p,inventory(production(),legacy(),staging()));
 assert.equal(r.reason,'isolated-staging-metadata-candidate-only');
 assert.equal(r.isolatedStagingMetadataMatched,true);
 denied(r);
});
test('an approved staging ref fails on mismatch, inactive status, wrong organization and absence',async()=>{
 const p=await policy();
 const bad=[
  [production(),legacy()],
  [production(),{...staging(),name:'medical_learning_os'}],
  [production(),{...staging(),status:'INACTIVE'}],
  [production(),{...staging(),organization_id:'x'.repeat(20)}]
 ];
 const reasons=[
  'approved-staging-target-not-found','staging-metadata-mismatch',
  'staging-metadata-mismatch','staging-metadata-mismatch'
 ];
 for(let i=0;i<bad.length;i++){
  const r=assessInternalReviewStagingTarget(p,inventory(...bad[i]));
  assert.equal(r.reason,reasons[i]);
  denied(r);
 }
});
test('missing, inactive or relabeled production identity blocks before staging inspection',async()=>{
 const p=await policy();
 for(const options of [
  [staging()],
  [{...production(),status:'INACTIVE'},staging()],
  [{...production(),name:'not-actually-production'},staging()]
 ]){
  const r=assessInternalReviewStagingTarget(p,inventory(...options));
  assert.equal(r.reason,'production-identity-unverified');denied(r);
 }
});
test('ambiguous or fabricated inventory, wrong ID/ref and duplicate projects fail closed',async()=>{
 const p=await policy();
 for(const obj of [
  null,{},[],{projects:[]},{projects:[production(),production()]},
  {projects:[{...production(),id:'m'.repeat(20)}]},
  {projects:[{...production(),status:true}]},
  {projects:[{...production(),name:undefined}]},
  {projects:[{...production(),organization_id:123}]},
  {projects: [Object.assign(Object.create({id:productionRef}),{
   ref:productionRef,name:'medical_learning_os',organization_id:org,status:'ACTIVE_HEALTHY'
  })]}
 ]){
  const r=assessInternalReviewStagingTarget(p,obj);
  assert.equal(r.reason,'invalid-or-untrusted-metadata');
  denied(r);
 }
});
test('unexpected policy keys, fake approval types and dangerous object prototypes fail closed',async()=>{
 const p=await policy();
 for(const mutated of [
  {...p,approvedStagingProjectRef: true},
  {...p,approvedStagingProjectRef: {}},
  {...p,requiresExplicitOwnerApproval:false},
  {...p,stagingDbWriteApproved:true},
  {...p,purpose:'publication'},
  {...p,excludedLegacyProjectRefs:[]},
  {...p,productionProjectRef:'t'.repeat(20),approvedStagingProjectRef:null},
  Object.assign(Object.create({isAdmin:true}),p)
 ]){
  const r=assessInternalReviewStagingTarget(mutated,inventory(production(),legacy()));
  // A modified production pin is not trusted against the observed inventory.
  assert.ok(['invalid-or-untrusted-metadata','production-identity-unverified',
   'approved-staging-target-not-found'].includes(r.reason),r.reason);
  denied(r);
 }
});
test('accessors, symbols, and Proxy traps never become staging approval',async()=>{
 const p=await policy(),s=staging();
 let getterCalled=false;
 Object.defineProperty(s,'status',{enumerable:true,get(){getterCalled=true;return 'ACTIVE_HEALTHY';}});
 const r=assessInternalReviewStagingTarget({...p,approvedStagingProjectRef:stagingRef},
  inventory(production(),s));
 assert.equal(r.reason,'invalid-or-untrusted-metadata');
 assert.equal(getterCalled,false);
 denied(r);
 const sym=production();sym[Symbol('admin')]=true;
 // Extra provider metadata (including symbols) is rejected, not interpreted.
 const r2=assessInternalReviewStagingTarget(p,inventory(sym,legacy()));
 assert.equal(r2.reason,'invalid-or-untrusted-metadata');denied(r2);
 const proxy=new Proxy(production(),{getPrototypeOf(){throw Error('poisoned');}});
 const r3=assessInternalReviewStagingTarget(p,inventory(proxy,legacy()));
 assert.equal(r3.reason,'invalid-or-untrusted-metadata');denied(r3);
});
