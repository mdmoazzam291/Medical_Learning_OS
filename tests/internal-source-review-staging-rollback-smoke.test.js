import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sqlPath=new URL('../ops/prototypes/source-evidence/internal-review-staging-rollback-only-smoke.sql',import.meta.url);
const policyPath=new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url);
const stagingRef='vwtdwafjrraptrgeshzt';

test('managed staging smoke is explicitly rollback-only with no permanent schema or Auth mutation',async()=>{
 const source=await readFile(sqlPath,'utf8');
 const sql=source.replace(/^--.*$/gm,'').trim();
 assert.match(source,/STAGING ONLY/);
 assert.match(source,/vwtdwafjrraptrgeshzt/);
 assert.match(sql,/^BEGIN;/i);
 assert.match(sql,/ROLLBACK;$/i);
 assert.equal((sql.match(/\bBEGIN;/g)||[]).length,1);
 assert.equal((sql.match(/\bROLLBACK;/g)||[]).length,1);
 assert.equal((sql.match(/CREATE\s+TEMP\s+TABLE/gi)||[]).length,3);
 assert.equal((sql.match(/ON\s+COMMIT\s+DROP/gi)||[]).length,3);
 assert.doesNotMatch(sql,/\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|SCHEMA|ROLE|POLICY|TRIGGER|EXTENSION|VIEW)\b/i);
 assert.doesNotMatch(sql,/\b(?:GRANT|REVOKE|ALTER\s+ROLE|SET\s+ROLE|SECURITY\s+DEFINER|TRUNCATE|DELETE\s+FROM|DROP\s+TABLE|COMMIT;)\b/i);
 assert.doesNotMatch(sql,/\b(?:INSERT\s+INTO|UPDATE)\s+(?:auth|public|storage)\./i);
 assert.doesNotMatch(sql,/\b(?:FROM|JOIN)\s+auth\.sessions\b/i);
 assert.match(sql,/SET\s+LOCAL\s+statement_timeout='8s'/);
 for(const name of ['mlos_test_session_20261101','mlos_test_grant_20261101','mlos_test_receipt_20261101'])
  assert.match(sql,new RegExp('CREATE TEMP TABLE '+name));
});
test('SQL uses only synthetic UUIDs, unresolved disposition and limits to one idempotent insert',async()=>{
 const sql=await readFile(sqlPath,'utf8');
 assert.match(sql,/retain-unresolved/);
 assert.match(sql,/ON CONFLICT \(request_id\) DO NOTHING/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/synthetic_foreign_grant_failed/);
 assert.match(sql,/synthetic_revocation_failed/);
 assert.match(sql,/synthetic_idempotency_failed/);
 assert.doesNotMatch(sql,/\b(?:clinicalApproved|rightsApproved|examScopeApproved|learnerRelease)\s*=\s*true/i);
});
test('staging identity pin is distinct from protected production and legacy, without write authority',async()=>{
 const p=JSON.parse(await readFile(policyPath,'utf8'));
 assert.equal(p.approvedStagingProjectRef,stagingRef);
 assert.notEqual(p.productionProjectRef,stagingRef);
 assert.ok(!p.excludedLegacyProjectRefs.includes(stagingRef));
 assert.equal(p.requiresExplicitOwnerApproval,true);
});
