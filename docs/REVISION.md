# M05 revision and study planning

## M05a foundation

Revision scheduling is a rebuildable projection over the immutable question-attempt ledger. It is **not** a mastery score.

The first domain module is `src/domain/revision.js`. It projects per-question evidence and creates a due queue through an injected, versioned scheduling policy. The projection is learner-scoped and preserves exact question-version identity.

### Why policy injection comes first

The current production attempt event records a binary outcome: correct/incorrect. It does not record an FSRS-style Again/Hard/Good/Easy rating. Mapping every correct answer to Good and every incorrect answer to Again would silently invent learner evidence.

Therefore:

- attempt events remain the source evidence;
- scheduling policy is replaceable and versioned;
- the initial `bootstrap-binary-v1` interval policy is a provisional product baseline, not a claim of optimized memory prediction;
- no due date is called mastery, retention probability or knowledge;
- changing the scheduler does not require rewriting historical attempts because the queue can be rebuilt.

### Bootstrap policy

For an incorrect latest answer, the baseline schedules a short 10-minute revisit. Consecutive correct answers use 1, 3, 7, 14 and 30-day intervals, capped at 30 days. These intervals are configuration, not learned parameters, and must later be tested against retention outcomes.

This bootstrap exists so the M05 queue, persistence and interruption UX can be exercised end to end before introducing a calibrated forgetting model.

### Next slices

1. Persist the per-learner/per-question revision projection with algorithm/version metadata and rebuild support.
2. Expose an authenticated due-queue endpoint that never leaks another learner's schedule.
3. Add interruption-friendly workload controls: available minutes, maximum due items and carry-over without streak punishment.
4. Decide the evidence contract required for FSRS. Prefer collecting a meaningful post-answer memory judgment or using a separately validated mapping rather than silently converting binary correctness into four-grade ratings.
5. Compare the bootstrap policy against FSRS/other scheduling policies using retention and time-to-mastery outcomes, then migrate by replaying immutable events.


## M05b live persistence boundary

`study_revision_state` is now the persisted cache/projection of immutable `study_attempts`.

Key properties:

- primary key is learner + exact question version;
- evidence counts, latest result, consecutive-correct evidence and last timing are persisted;
- every row stores policy ID/version and projection version;
- `due_at` is scheduling state, not mastery;
- browser roles can read only their own rows through RLS and cannot insert/update/delete them;
- the rebuild function is service-role only;
- rebuild takes the same learner advisory lock as attempt recording, so a full replay cannot race a study write;
- answer recording remains authoritative: after an acknowledged attempt, revision refresh is best-effort and failure does not invalidate the attempt;
- `GET /revision/due` performs a full learner replay before returning the due queue, providing a correctness-recovery path if an earlier best-effort refresh was missed.

The full replay on every due-queue read is intentionally simple for the current tiny beta dataset. It is not the intended scale architecture. Before large learner volumes, replace unconditional full replay with a dirty-watermark/event-count check while retaining replay as the repair mechanism.
