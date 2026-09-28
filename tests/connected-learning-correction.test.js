import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalog } from '../src/domain/content.js';
import { projectContentConnections } from '../src/domain/content-connections.js';

const read = async name => JSON.parse(await readFile(new URL('../data/' + name, import.meta.url), 'utf8'));

test('correction preserves intake history while substituting a distinct, unreviewed item', async () => {
  const old = await read('content-intake-connected-learning-08.json');
  const next = await read('content-intake-connected-learning-09-correction.json');
  const seed = await read('medical-seed-anaphylaxis-review.json');
  const rabies = await read('content-intake-pilot-rabies-01.json');
  const catalog = { schemaVersion: 1, concepts: [], sources: [], questions: [] };
  for (const batch of [seed, rabies, old, next]) {
    for (const key of ['concepts', 'sources', 'questions']) catalog[key].push(...batch[key]);
  }
  assert.equal(old.questions[1].status, 'in_review', 'historical promoted manifest must not be rewritten');
  catalog.questions.find(q => q.questionVersionId === old.questions[1].questionVersionId).status = 'retired';
  validateCatalog(catalog);
  const report = projectContentConnections(catalog, (await read('canonical-note-connected-learning-08.json')).notes);
  const washing = report.concepts.find(c => c.conceptId === 'infectious:rabies:pep-wound-washing');
  assert.deepEqual(washing.primaryQuestionIds, [
    'infectious:rabies:pep-wound-wash-15min', 'infectious:rabies:water-only-without-soap'
  ]);
  assert.equal(next.questions[0].status, 'in_review');
  assert.deepEqual(next.questions[0].reviews, []);
  assert.equal(next.sources[0].rights.status, 'unknown');
  assert.equal(report.publicationAuthority, false);
  assert.equal(report.transferValidityEstablished, false);
});

test('migration only retires the exact unreviewed candidate and audits its digest', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260928203738_m02b_retire_duplicate_candidate.sql', import.meta.url), 'utf8');
  for (const token of ['content_candidate_retirement_events', 'content_review_current_status_guard',
    'for update of c', 'question_not_in_review', 'correction_target_changed_or_reviewed',
    'infectious:rabies:washing-before-referral@1', 'v_old::text', 'v_new::text']) assert.ok(sql.includes(token));
  assert.match(sql, /v_old->>'status' <> 'in_review'/);
  assert.match(sql, /exists \(select 1 from public\.content_review_events/);
  assert.doesNotMatch(sql, /grant execute on function public\.content_review_current_status_guard\(\) to authenticated/);
});
