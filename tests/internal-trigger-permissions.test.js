import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cases = [
  ['../supabase/migrations/20260927124500_neural_note_review_lifecycle.sql', 'content_review_fill_target_identity'],
  ['../supabase/migrations/20260927140500_exam_occurrence_pyq_evidence.sql', 'prevent_question_exam_evidence_mutation'],
  ['../supabase/migrations/20260927145500_exam_run_ledger.sql', 'prevent_exam_ledger_mutation'],
  ['../supabase/migrations/20260927162000_exam_mock_readiness.sql', 'prevent_exam_rule_set_mutation']
];

test('internal SECURITY DEFINER trigger helpers are not browser or service RPCs', async () => {
  for (const [path, fn] of cases) {
    const sql = await readFile(new URL(path, import.meta.url), 'utf8');
    const pattern = new RegExp(
      `revoke all on function public\\.${fn}\\(\\)\\s+from public, anon, authenticated, service_role`
    );
    assert.match(sql, pattern, fn);
  }
});

test('production follow-up revokes all legacy internal trigger helpers without regranting them', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260927175500_internal_trigger_rpc_permissions.sql', import.meta.url),
    'utf8'
  );
  for (const [, fn] of cases) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\(\\)`));
  }
  assert.doesNotMatch(sql, /grant execute/i);
});
