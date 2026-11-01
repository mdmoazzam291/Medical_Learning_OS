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
  'PINNED_REAL_SDK_OFFLINE_CONTRACT_PASSED_HOSTED_UNVERIFIED');
});
test('hosted staging anonymous and forged JWT denials do not grant reviewer or release authority',async()=>{
 const g=await gate(),e=g.evidence;
 assert.equal(e.managedStagingAnonymousAuthDenial,
  'HOSTED_STAGING_PUBLIC_KEY_GET_DENIED_CI_2026_11_01');
 assert.equal(e.managedStagingForgedJwtDenial,
  'HOSTED_STAGING_PUBLIC_KEY_GET_DENIED_CI_2026_11_01');
 assert.equal(e.managedStagingAuthenticatedJwt,'NOT_EXECUTED');
 assert.equal(g.permissions.hostedStagingAuthCreateDeleteApproved,false);
 assert.equal(g.permissions.productionSourceReviewWritesApproved,false);
 const ci=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(ci,/Verify hosted staging Auth rejects anonymous and forged JWTs/);
 assert.match(ci,/--read-only-hosted-negative/);
 assert.doesNotMatch(ci,/MLOS_STAGING_ADMIN_SECRET_KEY/);
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

test('pinned real-SDK offline CI gate cannot inject secrets or execute Auth writes',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 const script=await readFile(new URL('../scripts/internal-source-review-staging-sdk-offline-check.mjs',import.meta.url),'utf8');
 assert.match(workflow,/Verify exact real staging SDK API offline/);
 assert.match(workflow,/startsWith\(github\.head_ref, 'test\/internal-review-'\)/);
 assert.match(workflow,/npm ci --prefix "\$RUNNER_TEMP\/mlos-staging-sdk"/);
 assert.match(workflow,/cp ops\/staging-auth-sdk\/package.json ops\/staging-auth-sdk\/package-lock.json/);
 assert.doesNotMatch(workflow,/MLOS_STAGING_LOCK_EXPORT_BEGIN/);
 assert.match(workflow,/--ignore-scripts/);
 assert.match(script,/const EXPECTED_SDK='2\.118\.0'/);
 assert.match(script,/makeSupabaseSdkStagingAdapters/);
 assert.match(script,/failNetwork=async/);
 assert.doesNotMatch(script,/MLOS_STAGING_TEST_ACCESS_TOKEN/);
 assert.doesNotMatch(script,/process\.env\.MLOS_STAGING_ADMIN_SECRET_KEY/);
 assert.doesNotMatch(script,/auth\.admin\.(?:createUser|deleteUser)\s*\(/);
 assert.doesNotMatch(workflow,/\$\{\{\s*secrets\.MLOS_STAGING/);
});

test('isolated operator SDK dependency tree is private, complete, integrity-locked and registry-scoped',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../ops/staging-auth-sdk/package.json',import.meta.url),'utf8'));
 const lock=JSON.parse(await readFile(new URL('../ops/staging-auth-sdk/package-lock.json',import.meta.url),'utf8'));
 assert.equal(pkg.private,true);
 assert.equal(pkg.name,'mlos-staging-sdk');
 assert.equal(pkg.dependencies['@supabase/supabase-js'],'2.118.0');
 assert.equal(lock.lockfileVersion,3);
 assert.equal(lock.name,pkg.name);
 assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);
 const nodes=Object.entries(lock.packages).filter(([key])=>key!=='');
 assert.ok(nodes.length>=5,'must include transitive lock entries');
 for(const [name,entry] of nodes){
  assert.ok(/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved),name);
  assert.ok(/^sha512-[A-Za-z0-9+/=]+$/.test(entry.integrity),name);
  assert.ok(typeof entry.version==='string' && entry.version.length>0,name);
 }
 const script=await readFile(new URL('../scripts/internal-source-review-staging-test-identity-lifecycle.mjs',import.meta.url),'utf8');
 assert.match(script,/ops\/staging-auth-sdk\/node_modules\/@supabase\/supabase-js\/package\.json/);
 assert.match(script,/createRequire\(/);
 assert.match(script,/ops\/staging-auth-sdk\/package\.json/);
 assert.doesNotMatch(script,/await import\('@supabase\/supabase-js'\)/);
});

test('internal-review branch family reruns isolated native race and local GoTrue JWT checks without hosted secrets',async()=>{
 const ci=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 const native=ci.match(/  internal-review-native-postgres:\n([\s\S]*?)(?=\n  [a-z][a-z0-9_-]*:\n|$)/)?.[1];
 const gotrue=ci.match(/  internal-review-real-gotrue-jwt-atomic:\n([\s\S]*?)(?=\n  [a-z][a-z0-9_-]*:\n|$)/)?.[1];
 assert.ok(native,'native race job must remain present');
 assert.ok(gotrue,'local GoTrue JWT job must remain present');
 assert.match(native,/startsWith\(github\.head_ref, 'test\/internal-review-'\)/);
 assert.match(native,/pgmajor: \['17', '18'\]/);
 assert.match(native,/scripts\/internal-source-review-native-races\.js/);
 assert.match(gotrue,/startsWith\(github\.head_ref, 'test\/internal-review-'\)/);
 assert.match(gotrue,/MLOS_LOCAL_ATOMIC_CONFIRM=ISOLATED_LOCAL_GOTRUE_TEST_STACK/);
 assert.match(gotrue,/MLOS_LOCAL_ATOMIC_URL=http:\/\/127\.0\.0\.1:54321/);
 assert.match(gotrue,/scripts\/internal-source-review-owned-revocation-check\.mjs/);
 assert.match(gotrue,/--no-backup/);
 assert.match(gotrue,/MLOS_CI_HEAD_REF: \$\{\{ github\.head_ref \}\}/);
 assert.match(gotrue,/\"\$MLOS_CI_HEAD_REF\" == test\/internal-review-\*/);
 assert.doesNotMatch(gotrue,/\[\[.*\$\{\{ github\.head_ref \}\}/);
 assert.doesNotMatch(native,/MLOS_STAGING_ADMIN_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(gotrue,/MLOS_STAGING_ADMIN_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(gotrue,/vwtdwafjrraptrgeshzt/);
 assert.doesNotMatch(native,/vwtdwafjrraptrgeshzt/);
});

test('aggregate CI security signal fails closed if required jobs are skipped, failed or cancelled',async()=>{
 const ci=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 const block=ci.match(/\n  internal-review-security-gate:\n([\s\S]*?)(?=\n  [a-z][a-z0-9_-]*:\n|$)/)?.[1];
 assert.ok(block,'internal-review security aggregate job must exist');
 assert.match(block,/always\(\)/);
 assert.match(block,/startsWith\(github\.head_ref, 'test\/internal-review-'\)/);
 assert.match(block,/github\.event_name == 'pull_request'/);
 assert.match(block,/contents: read/);
 assert.match(block,/needs:\s*\n\s*- check\s*\n\s*- browser\s*\n\s*- webkit\s*\n\s*- internal-review-native-postgres\s*\n\s*- internal-review-real-gotrue-jwt-atomic/);
 for(const [name,job] of [
  ['CORE_RESULT','check'],['BROWSER_RESULT','browser'],
  ['WEBKIT_RESULT','webkit'],['NATIVE_PG_RESULT','internal-review-native-postgres'],
  ['GOTRUE_RESULT','internal-review-real-gotrue-jwt-atomic']
 ]){
  assert.ok(block.includes(name+': '+'$'+'{{ needs.'+job+'.result }}'),
   'result of '+job+' must be checked');
  assert.ok(block.includes('"$'+name+'"'),'result '+name+' must be included in gate');
 }
 assert.match(block,/if \[\[ "\$result" != success \]\]; then/);
 assert.match(block,/exit 1/);
 assert.doesNotMatch(block,/continue-on-error|approval: true|sb_secret_|service_role/i);
 assert.doesNotMatch(block,/^\s*(?:environment|deploy):/mi);
});
