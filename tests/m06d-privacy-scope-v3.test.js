import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928220030_m06d_privacy_scope_v3.sql', import.meta.url),
  'utf8'
);

test('privacy scope v3 maps learner content issue reports', () => {
  assert.match(sql, /learner-privacy-scope-v3/);
  assert.match(sql, /'scopeVersion',3/);
  assert.match(sql, /\('learner_content_issue_reports'\)/);
  assert.match(sql, /'learner_content_issue_reports',[\s\S]*select count\(\*\) from public\.learner_content_issue_reports/);
});

test('content reports remain append-only except inside the existing privacy erasure transaction', () => {
  assert.match(sql, /block_learner_content_issue_report_mutation/);
  assert.match(sql, /tg_op='DELETE'/);
  assert.match(sql, /mlos\.privacy_erasure/);
  assert.match(sql, /learner-erasure-v1/);
  assert.match(sql, /learner_content_issue_report_append_only/);
});

test('privacy erasure deletes and verifies learner reports in the same atomic scope', () => {
  const erase = sql.match(
    /create or replace function public\.privacy_erase_learner_data[\s\S]*?\n\$function\$;/
  )?.[0] || '';
  assert.match(erase, /delete from public\.learner_content_issue_reports/);
  assert.match(erase, /'learner_content_issue_reports',v_count/);
  assert.match(erase, /select 1 from public\.learner_content_issue_reports where learner_id=p_learner/);
  assert.match(erase, /privacy_erasure_incomplete/);
});

test('privacy v3 preserves service-only authority', () => {
  assert.match(sql, /revoke all on function public\.privacy_learner_scope_status\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.privacy_learner_scope_status\(\)[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.privacy_erase_learner_data\(uuid,text,text\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.privacy_erase_learner_data\(uuid,text,text\)[\s\S]*service_role/);
});
