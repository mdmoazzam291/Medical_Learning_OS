import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sqlFile=new URL('../ops/prototypes/source-evidence/internal-review-owned-revocation.sql',import.meta.url);
const checkFile=new URL('../scripts/internal-source-review-owned-revocation-check.mjs',import.meta.url);

test('disposable owned-gate fixture never reads or locks GoTrue-owned auth.sessions',async()=>{
 const source=await readFile(sqlFile,'utf8');
 assert.match(source,/-- ISOLATED LOCAL GOTRUE \+ POSTGREST FIXTURE/);
 assert.match(source,/evidence_internal\.owned_reviewer_sessions/);
 assert.match(source,/evidence_internal\.owned_reviewer_grant_history/);
 assert.match(source,/auth\.uid\(\)/);
 assert.match(source,/auth\.jwt\(\)/);
 assert.doesNotMatch(source,/(?:from|join|update|delete\s+from|truncate|insert\s+into|lock\s+table|grant\s+.+\s+on)\s+auth\.sessions\b/i);
 assert.doesNotMatch(source,/\bfor\s+share\b/i);
 assert.match(source,/revoke all on function public\.mlos_owned_source_review_local_v1/);
 assert.match(source,/grant execute on function public\.mlos_owned_source_review_local_v1/);
 assert.match(source,/to authenticated;/);
 assert.doesNotMatch(source,/grant\s+execute\s+on\s+function\s+evidence_internal\.revoke_owned_reviewer_(session|grant).*to\s+authenticated/is);
});
test('grant and session revocation are independent, and history forbids modification',async()=>{
 const source=await readFile(sqlFile,'utf8');
 for(const fragment of [
  'owned_session_revocations_immutable','owned_grant_history_immutable',
  'owned_session_revocation_only','revoke_owned_reviewer_session',
  'revoke_owned_reviewer_grant','owned_scoped_grant',
  'owned_review_session_reactivation_denied'
 ])assert.ok(source.includes(fragment),fragment);
 const check=await readFile(checkFile,'utf8');
 for(const label of [
  'session-decision-first writer sleep','session revoke blocked by decision',
  'grant revocation-first writer lock','grant revoker waits for decision',
  'session revocation-first writer lock',
  'provider-only signout is NOT synchronized'
 ])assert.ok(check.includes(label),label);
 assert.match(check,/MLOS_LOCAL_ATOMIC_CONFIRM/);
 assert.match(check,/127\\?\.0\\?\.0\\?\.1:54322/);
 assert.doesNotMatch(check,/https:\/\/[^\s'\"\x60]+supabase\.co/i);
});
