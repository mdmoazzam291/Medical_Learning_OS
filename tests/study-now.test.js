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
  assert.equal(plan.strategy, 'due-oldest-first-v1');
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
