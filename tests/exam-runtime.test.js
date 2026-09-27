import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLockedSectionRuntimeRun,
  seededQuestionOrder
} from '../supabase/functions/study-api/_shared/exam-runtime.js';

test('seeded exam ordering is deterministic and changes sequence without changing membership', async () => {
  const ids = Array.from({ length: 180 }, (_, index) => `qv-${String(index + 1).padStart(3, '0')}`);
  const first = await seededQuestionOrder(ids, 'assembly-seed-alpha');
  const retry = await seededQuestionOrder(ids, 'assembly-seed-alpha');
  const second = await seededQuestionOrder(ids, 'assembly-seed-beta');

  assert.deepEqual(first, retry);
  assert.deepEqual([...first].sort(), [...ids].sort());
  assert.deepEqual([...second].sort(), [...ids].sort());
  assert.notDeepEqual(first, ids);
  assert.notDeepEqual(first, second);
});

test('runtime run preserves seeded question order when assigning locked sections', async () => {
  const ids = Array.from({ length: 6 }, (_, index) => `qv-${index + 1}`);
  const ordered = await seededQuestionOrder(ids, 'section-seed-001');
  const run = createLockedSectionRuntimeRun({
    runId: 'run-1',
    examId: 'exam',
    ruleSetId: 'exam@1',
    caveats: [],
    sections: [
      { sectionId: 'A', label: 'A', questionCount: 3, durationSeconds: 60 },
      { sectionId: 'B', label: 'B', questionCount: 3, durationSeconds: 60 }
    ],
    totalQuestions: 6,
    totalDurationSeconds: 120,
    questionVersionIds: ordered,
    startedAt: '2026-09-27T10:00:00.000Z'
  });

  assert.deepEqual(
    run.sections.flatMap(section => section.questionVersionIds),
    ordered
  );
  assert.equal(run.sections[0].scheduledEndAt, '2026-09-27T10:01:00.000Z');
  assert.equal(run.sections[1].scheduledEndAt, '2026-09-27T10:02:00.000Z');
});
