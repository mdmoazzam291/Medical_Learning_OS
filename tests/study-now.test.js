import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyNowPlan, estimateRevisionItemMs } from '../src/domain/study-now.js';

const now = '2026-09-27T18:00:00.000Z';

test('Study Now selects only due items and orders oldest due first', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 10,
    now,
    revisionItems: [
      { questionVersionId: 'future@1', dueAt: '2026-09-28T18:00:00.000Z', lastDurationMs: 30000 },
      { questionVersionId: 'later@1', dueAt: '2026-09-27T17:30:00.000Z', lastDurationMs: 30000 },
      { questionVersionId: 'older@1', dueAt: '2026-09-27T17:00:00.000Z', lastDurationMs: 30000 }
    ]
  });

  assert.deepEqual(plan.selected.map(item => item.questionVersionId), ['older@1', 'later@1']);
  assert.equal(plan.dueCount, 2);
  assert.equal(plan.deferredDueCount, 0);
  assert.equal(plan.strategy, 'due-then-new-v2');
});

test('Study Now respects the time budget rather than a fixed question target', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 5,
    now,
    revisionItems: [
      { questionVersionId: 'a@1', dueAt: '2026-09-27T17:00:00.000Z', lastDurationMs: 240000 },
      { questionVersionId: 'b@1', dueAt: '2026-09-27T17:01:00.000Z', lastDurationMs: 240000 }
    ]
  });

  assert.equal(plan.selectedCount, 1);
  assert.equal(plan.deferredDueCount, 1);
  assert.ok(plan.estimatedMs <= plan.budgetMs);
});

test('item estimate uses observed duration plus bounded review overhead', () => {
  assert.equal(estimateRevisionItemMs(0), 60000);
  assert.equal(estimateRevisionItemMs(30000), 75000);
  assert.equal(estimateRevisionItemMs(10 * 60 * 1000), 5 * 60 * 1000);
});

test('Study Now does not pull future reviews early to fill spare time', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 60,
    now,
    revisionItems: [
      { questionVersionId: 'future@1', dueAt: '2026-09-28T18:00:00.000Z', lastDurationMs: 30000 }
    ]
  });

  assert.equal(plan.selectedCount, 0);
  assert.equal(plan.dueCount, 0);
});


test('latest incorrect due evidence is labeled mistake repair, not generic mastery', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 10,
    now,
    revisionItems: [
      { questionVersionId: 'wrong@1', dueAt: '2026-09-27T17:00:00.000Z', lastDurationMs: 30000, latestCorrect: false }
    ]
  });
  assert.equal(plan.selected[0].reason, 'mistake-repair');
});

test('new learning fills remaining time only after due work', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 5,
    now,
    revisionItems: [
      { questionVersionId: 'due@1', dueAt: '2026-09-27T17:00:00.000Z', lastDurationMs: 30000, latestCorrect: true }
    ],
    newItems: [
      { questionVersionId: 'new-b@1', catalogOrder: 2 },
      { questionVersionId: 'new-a@1', catalogOrder: 1 }
    ]
  });
  assert.deepEqual(plan.selected.map(item => [item.questionVersionId, item.reason]), [
    ['due@1', 'due-revision'],
    ['new-a@1', 'new-learning']
  ]);
  assert.equal(plan.newLearningCount, 2);
  assert.equal(plan.newLearningSelectedCount, 1);
});

test('new learning can create useful Study Now work when no revision is due', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 10,
    now,
    revisionItems: [],
    newItems: [{ questionVersionId: 'unseen@1', catalogOrder: 0 }]
  });
  assert.equal(plan.dueCount, 0);
  assert.equal(plan.selectedCount, 1);
  assert.equal(plan.selected[0].reason, 'new-learning');
});

test('future revisions are still not pulled early when new learning exists', () => {
  const plan = buildStudyNowPlan({
    availableMinutes: 10,
    now,
    revisionItems: [
      { questionVersionId: 'future@1', dueAt: '2026-09-28T18:00:00.000Z', lastDurationMs: 30000, latestCorrect: true }
    ],
    newItems: [{ questionVersionId: 'new@1', catalogOrder: 0 }]
  });
  assert.deepEqual(plan.selected.map(item => item.questionVersionId), ['new@1']);
});
