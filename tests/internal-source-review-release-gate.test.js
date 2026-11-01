import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../ops/prototypes/source-evidence/',import.meta.url);
const gate=async()=>JSON.parse(await readFile(new URL('internal-review-release-gate.json',root),'utf8'));
const policy=async()=>JSON.parse(await readFile(new URL('internal-review-staging-policy.json',root),'utf8'));

test('consolidation is a blocked draft stack, not a deploy/merge approval',async()=>{
 const g=await gate();
 assert.equal(g.schemaVersion,1);
 assert.equal(g.purpose,'ADR-134 internal source-row review');
 assert.equal(g.releaseState,'BLOCKED_REVIEW_ONLY');
 assert.equal(g.latestDraft,374);
 assert.deepEqual(g.draftStack,[352,...Array.from({length:21},(_,i)=>354+i)]);
 assert.equal(new Set(g.draftStack).size,g.draftStack.length);
 assert.ok(!g.draftStack.includes(g.externalProvider.pullRequest));
 assert.equal(g.externalProvider.pullRequest,350);
 assert.equal(g.externalProvider.enabled,false);
 for(const [name,granted] of Object.entries(g.permissions))
  assert.equal(granted,false,name+' must be explicitly reapproved in a later reviewed change');
});
test('all production and legacy project targets remain quarantined',async()=>{
 const g=await gate(),p=await policy();
 assert.equal(g.productionProjectRef,p.productionProjectRef);
 assert.equal(g.stagingProjectRef,p.approvedStagingProjectRef);
 assert.ok(p.excludedLegacyProjectRefs.includes(g.excludedLegacyProjectRef));
 assert.notEqual(g.productionProjectRef,g.stagingProjectRef);
 assert.notEqual(g.excludedLegacyProjectRef,g.stagingProjectRef);
});
test('missing hosted Auth/JWT, concurrency, review authority and rights evidence is not inferred from local CI',async()=>{
 const e=(await gate()).evidence;
 assert.equal(e.localGoTrueSignedJwt,'TESTED_DISPOSABLE_LOCAL_ONLY');
 assert.equal(e.managedStagingRls,'TESTED_ROLLBACK_SYNTHETIC_CLAIMS_ONLY');
 for(const k of [
  'managedStagingAuthenticatedJwt','managedStagingSyntheticIdentityLifecycle',
  'managedStagingTwoConnectionRevocation','providerLogoutAtomicity',
  'qualifiedReviewerAuthorization',
  'immutableProtectedReceipt'
 ]){
  assert.ok(['NOT_EXECUTED','NOT_PROVEN','NOT_VERIFIED'].includes(e[k]),k);
 }
});
test('official SDK is mocked but live hosted Auth admin operations remain unverified',async()=>{
 const e=(await gate()).evidence;
 assert.equal(e.hostedAdminSecretCompatibility,
  'DOCUMENTED_SDK_INTERFACE_TESTED_WITH_MOCKS_HOSTED_UNVERIFIED');
});
test('never expose raw source-review bearer credentials to GitHub pull-request CI',async()=>{
 const ci=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 const lifecycle=await readFile(new URL('../scripts/internal-source-review-staging-test-identity-lifecycle.mjs',import.meta.url),'utf8');
 assert.ok(!ci.includes('MLOS_STAGING_ADMIN_SECRET_KEY'));
 assert.ok(!ci.includes('MLOS_STAGING_TEST_ACCESS_TOKEN'));
 assert.ok(!ci.includes('STAGING_SYNTHETIC_CREATE_AND_DELETE'));
 assert.match(lifecycle,/--create-and-delete/);
 assert.ok(!lifecycle.includes("Authorization:'Bearer '+secret"));
 assert.match(lifecycle,/makeSupabaseSdkStagingAdapters/);
 assert.match(lifecycle,/admin\.auth\.admin\.deleteUser\(userId\)/);
 assert.doesNotMatch(lifecycle,/\/auth\/v1\/admin\/users/);
 assert.ok(!ci.includes('internal-source-review-staging-test-identity-lifecycle.mjs --create-and-delete'));
});
