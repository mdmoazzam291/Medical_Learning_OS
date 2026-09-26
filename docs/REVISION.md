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


## M05c Study Now baseline

Study Now v1 is a time-budgeted due-revision selector.

Inputs:
- authenticated learner;
- current published catalog;
- rebuilt learner revision projection;
- available study minutes;
- optional maximum item cap.

Selection:
1. exclude unpublished content;
2. exclude reviews whose due time has not arrived;
3. order due items oldest-first;
4. estimate each item's workload from prior response duration plus bounded explanation/review overhead;
5. admit items while they fit the learner's time budget;
6. resume an existing open session rather than create a competing session.

The current UI offers 10/20/30/60-minute presets. The API accepts 5–120 minutes.

This policy deliberately leaves unused time when nothing is due. Filling spare time with early reviews would optimize visible activity rather than retention. New-learning and misconception-repair candidates will be added later as distinct recommendation classes with their own evidence and priority logic.


## M05c Study Now v2: explainable candidate classes

Study Now v2 extends the time-budget baseline without introducing an opaque score.

Candidate classes:
1. `mistake-repair` — due revision with latest observed answer incorrect.
2. `due-revision` — other due revision.
3. `new-learning` — published exact question versions with no learner attempt history.

Ordering is currently due-first, oldest due first, then new learning in deterministic catalog order if time remains. Future reviews are not pulled forward merely to fill a study window.

Every created Study Now session has an immutable recommendation receipt. The plan records exact selected question versions, reason per item, strategy, estimated workload and available minutes.

`study_recommendation_outcomes` rebuilds descriptive results from recommendation + session + attempt evidence:
- session completion and position;
- selected vs attempted count;
- initial correctness/accuracy;
- estimated vs actual answer time;
- candidate-class mix;
- first later retrieval per selected question and its correctness.

These outcome fields support policy evaluation but are not mastery measures and do not establish causality. The first later retrieval is deliberately preserved because retention after delay is a more meaningful signal than immediate Study Now correctness alone.
