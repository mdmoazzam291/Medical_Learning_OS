import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const target=new URL('../ops/prototypes/source-evidence/internal-review-staging-rls-readback.sql',import.meta.url);
const policy=new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url);
const sql=()=>readFile(target,'utf8');

test('source-reviewed staging-only SQL is transactionally disposable and not a managed migration',async()=>{
 const source=await sql(),body=source.replace(/^--.*$/gm,'').trim();
 assert.match(source,/staging vwtdwafjrraptrgeshzt/i);
 assert.match(source,/NOT signed GoTrue authentication/);
 assert.match(body,/^BEGIN;\s+SET LOCAL statement_timeout='8s'/);
 assert.match(body,/ROLLBACK;$/);
 assert.equal((body.match(/\bBEGIN;/g)||[]).length,1);
 assert.equal((body.match(/\bROLLBACK;/g)||[]).length,1);
 assert.equal((body.match(/\bCREATE TEMP TABLE /g)||[]).length,3);
 assert.equal((body.match(/\bON COMMIT DROP/g)||[]).length,3);
 assert.doesNotMatch(body,/\b(?:CREATE\s+(?:OR\s+REPLACE\s+)?(?:SCHEMA|FUNCTION|ROLE|TRIGGER|EXTENSION)|DROP\s+(?:TABLE|SCHEMA)|COMMIT;|SECURITY\s+DEFINER)\b/i);
 assert.doesNotMatch(body,/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:auth|public|storage)\./i);
 assert.doesNotMatch(body,/\b(?:FROM|JOIN|UPDATE|INSERT\s+INTO)\s+auth\.sessions\b/i);
 assert.doesNotMatch(body,/\b(?:ALTER\s+DEFAULT\s+PRIVILEGES|GRANT\s+ALL|GRANT\s+EXECUTE)\b/i);
});
test('all simulated reviewer-facing tables enforce RLS and select-only ACL',async()=>{
 const body=await sql();
 for(const table of ['mlos_staging_rls_sessions','mlos_staging_rls_grants','mlos_staging_rls_receipts']){
  assert.ok(body.includes('ALTER TABLE '+table+' ENABLE ROW LEVEL SECURITY'),table);
 }
 assert.match(body,/CREATE POLICY mlos_receipt_reader/);
 assert.match(body,/FOR SELECT TO authenticated/);
 assert.match(body,/reviewer_id=\(select auth\.uid\(\)\)/);
 assert.match(body,/auth\.jwt\(\)->>'session_id'/);
 assert.match(body,/has_table_privilege\('anon','mlos_staging_rls_receipts','SELECT'\)/);
 for(const action of ['UPDATE','INSERT','DELETE'])
  assert.ok(body.includes("'authenticated','mlos_staging_rls_receipts','"+action+"'"));
 assert.match(body,/GRANT SELECT ON mlos_staging_rls_sessions,mlos_staging_rls_grants,mlos_staging_rls_receipts TO authenticated/);
 assert.doesNotMatch(body,/\bGRANT\s+(?:INSERT|UPDATE|DELETE|ALL)\b/i);
});
test('RLS tests deny missing claim, foreign session and two independent revocation cases',async()=>{
 const source=await sql();
 for(const name of ['test_no_claims','test_a','test_wrong_session','test_b',
  'test_revoke_session','test_revoke_grant'])
  assert.ok(source.includes('$'+name+'$'),name);
 for(const code of ['synthetic_no_claims_leak','synthetic_a_scope_failed',
  'synthetic_wrong_session_visible','synthetic_b_scope_failed',
  'synthetic_revoked_session_visible','synthetic_revoked_grant_visible',
  'synthetic_acl_excess'])
  assert.ok(source.includes(code),code);
 assert.match(source,/RESET ROLE;/);
 assert.equal((source.match(/SET LOCAL ROLE authenticated;/g)||[]).length,6);
 assert.match(source,/SET LOCAL statement_timeout='8s'/);
});
test('production and legacy remain rejected: staging reference pins identity, never authorizes writes',async()=>{
 const p=JSON.parse(await readFile(policy,'utf8'));
 assert.equal(p.approvedStagingProjectRef,'vwtdwafjrraptrgeshzt');
 assert.notEqual(p.approvedStagingProjectRef,p.productionProjectRef);
 assert.ok(!p.excludedLegacyProjectRefs.includes(p.approvedStagingProjectRef));
 assert.equal(p.requiresExplicitOwnerApproval,true);
});
