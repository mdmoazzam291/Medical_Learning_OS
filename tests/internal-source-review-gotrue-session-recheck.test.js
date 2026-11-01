import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const scriptPath=new URL('../scripts/internal-source-review-owned-revocation-check.mjs',import.meta.url);
test('local signed-JWT acceptance probes Auth getUser before and after provider signout',async()=>{
 const source=await readFile(scriptPath,'utf8');
 const before=source.indexOf('const userBeforeSignout=await authA.auth.getUser(providerOnlyToken)');
 const signout=source.indexOf("const providerOnlyLogout=await authA.auth.signOut({scope:'local'})");
 const after=source.indexOf('const userAfterSignout=await authA.auth.getUser(providerOnlyToken)');
 const signedBearer=source.indexOf("const staleBearer=await call('mlos_owned_source_review_local_v1'");
 const ownedRevoke=source.indexOf("await admin.query('select evidence_internal.revoke_owned_reviewer_session($1,$2)',\n  [a.user,providerOnlySid])");
 assert.ok(before>=0&&before<signout&&signout<after&&after<signedBearer&&signedBearer<ownedRevoke,
  'fresh current-user check must occur after signout but before JWT-only counterexample');
 assert.match(source,/assert\.ok\(userAfterSignout\.error\|\|!userAfterSignout\.data\?\.user/);
 assert.match(source,/assert\.equal\(userBeforeSignout\.data\.user\.id,a\.user\)/);
});
