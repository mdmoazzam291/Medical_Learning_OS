const MIN_MINUTES = 5;
const MAX_MINUTES = 120;
const MIN_ITEM_MS = 60 * 1000;
const MAX_ITEM_MS = 5 * 60 * 1000;
const REVIEW_OVERHEAD_MS = 45 * 1000;

function integer(value, min, max, field) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`${field} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function estimateRevisionItemMs(lastDurationMs) {
  const observed = Number.isFinite(lastDurationMs) && lastDurationMs >= 0
    ? lastDurationMs
    : MIN_ITEM_MS;
  return Math.min(MAX_ITEM_MS, Math.max(MIN_ITEM_MS, observed + REVIEW_OVERHEAD_MS));
}

export function buildStudyNowPlan({
  revisionItems,
  availableMinutes,
  now,
  maxItems = 50
}) {
  if (!Array.isArray(revisionItems)) throw new TypeError('revisionItems must be an array');
  const minutes = integer(availableMinutes, MIN_MINUTES, MAX_MINUTES, 'availableMinutes');
  const cap = integer(maxItems, 1, 50, 'maxItems');
  if (typeof now !== 'string' || new Date(now).toISOString() !== now) {
    throw new TypeError('now must be a canonical UTC ISO timestamp');
  }

  const nowMs = Date.parse(now);
  const budgetMs = minutes * 60 * 1000;
  const due = revisionItems
    .map(item => {
      const dueMs = Date.parse(item?.dueAt);
      if (!Number.isFinite(dueMs) || typeof item?.questionVersionId !== 'string') {
        throw new TypeError('revision item is invalid');
      }
      return {
        ...item,
        dueMs,
        estimateMs: estimateRevisionItemMs(item.lastDurationMs)
      };
    })
    .filter(item => item.dueMs <= nowMs)
    .sort((a, b) =>
      a.dueMs - b.dueMs ||
      a.questionVersionId.localeCompare(b.questionVersionId));

  const selected = [];
  let usedMs = 0;
  for (const item of due) {
    if (selected.length >= cap) break;
    if (usedMs + item.estimateMs > budgetMs) continue;
    selected.push({
      questionVersionId: item.questionVersionId,
      dueAt: new Date(item.dueMs).toISOString(),
      overdueMs: Math.max(0, nowMs - item.dueMs),
      estimatedMs: item.estimateMs,
      reason: 'due-revision'
    });
    usedMs += item.estimateMs;
  }

  return Object.freeze({
    availableMinutes: minutes,
    budgetMs,
    estimatedMs: usedMs,
    estimatedMinutes: Math.ceil(usedMs / 60000),
    dueCount: due.length,
    selectedCount: selected.length,
    deferredDueCount: due.length - selected.length,
    selected,
    nextDueAt: due.length ? new Date(due[0].dueMs).toISOString() : null,
    strategy: 'due-oldest-first-v1'
  });
}
