# Question shortening pilot — 4 October 2026

Status: backend deployed and implementation locally verified; frontend publication explicitly authorized, pending CI/production release. Clinical pilot awaiting supplied originals. Drive originals/inbox/index and the live shared catalog were empty at task start. No erased seed or old backup is eligible for reuse. No question has been rewritten, imported or published by this pilot.

## Q2: first input selection

Use the already accepted first replacement batch: 12 complete supplied questions across asthma, COPD and pneumonia, plus 3 canonical notes. Prefer verified original PYQs where available; keep source wording/options/key and exam/year/session evidence. Recalled items stay labelled recalled. Platform questions are acceptable for quality testing and retain the existing exclusive source policy.

Select four genuinely different tasks per concept: diagnosis/discrimination, initial or confirmatory investigation (actual qualifier retained), next best step, initial/definitive treatment (actual qualifier retained). Do not force unsuitable uploaded questions into slots. Images, missing options, unknown keys, disputed claims, rights gaps, multiple-correct items and sequential cases require their supported review/asset contracts before derivative practice. Classification can retain these formats; the current portable SBA importer cannot encode them as equivalent text-only questions.

For each selected original, create at most one concise-practice derivative and one useful post-answer revision cue. Each links its exact source version, preserves all options/IDs/key, lists protected literal facts, records substantive removals with reasons and eight independent checks. Automated checks verify record integrity; administrator inspection verifies task/medical equivalence. Failure of any gate blocks the candidate. Source versions and derivative IDs do not become new PYQ occurrences or inflate library counts.

## Q3: learning outcome experiment

Hypothesis: concise practice preserves delayed unseen full-question performance at equal study time while reducing wording burden. This remains untested.

Quality pilot: the 12 originals check clinical equivalence, workflow and confusing qualifiers. These 12 are not sufficient to establish learning benefit and may not be reused as supposedly unseen endpoints.

Efficacy feasibility: before allocation, lock the protocol, exact item families, allocation seed, enrollment target, study-time budget, outcome windows, exclusions and analysis. Use counterbalanced original/concise concept blocks within learners; balance task and concept across learners. A learner trains each concept in one arm. Separate full question families test each block at day 7 and day 14. A tested family is never reused at the later endpoint. Holdout answers remain hidden until the response is persisted. Enroll only willing learners under the existing research authorization/consent boundaries; this task installs no enrollment or scheduler.

Provisional feasibility budget: 10 minutes per concept block, fixed for both arms, with a matched opportunity to attempt each assigned item. Record actual duration and uncovered items. Day 7/14 windows are 24 hours after the target elapsed day, measured in UTC elapsed time. Lost qualifiers/semantic drift block the derivative immediately, independent of aggregate accuracy.

Primary outcomes: delayed unseen full-case and transfer accuracy separately by day/arm at matched study time. Report eligible learners, unique families, missing follow-ups and allocation balance. Secondary: answer time, optional confidence calibration, ambiguity, hint use, qualifier errors, and dependence on concise cues. The current evaluator reports descriptive totals only. A future efficacy claim needs preregistered sample size/power and learner/item clustering; the quality pilot does not supply them.

Provisional acceptable-loss margin: 5 percentage points, an owner-reviewable experimental choice, not a proven clinical standard. Do not conclude noninferiority from a small raw difference; the appropriate uncertainty bound must exclude worse degradation under the locked efficacy analysis. Do not automatically change mastery, forgetting or Study Now weights from this feasibility report.

## Measurement implementation

Existing session/attempt records retain source question/version and immutable representation/variant context. Concise answers remain in canonical evidence, but original-only scheduling and library graph observations exclude them. Simulation uses original catalog items. The learning stream carries presentation metadata for replay. Successful siblings never become independent transfer endpoints.

`node scripts/evaluate-shortening.js private-outcomes.json` validates protocol/records, deduplicates retries, and rejects conflicting IDs. It excludes prior family exposure, cross-arm family overlap, intervening exposure, hints, non-full prompts, mismatched time and outcomes outside delay windows. Empty rates are null. Exposure flags require complete actual history; unknown exposure cannot be coded false. Enrollment denominators are required separately to measure attrition.

Input: `{protocol:{protocolId,delayDays:[7,14],studyBudgetMs:600000,acceptableLossPercentagePoints:5},records:[...]}`. Each record: recordId, pseudonymous learnerId, blockId, arm (`original|concise`), phase (`study|test`), familyId, conceptId, representation (`original|concise-practice|revision-cue|transfer-variant`), questionVersionId, occurredAt, studyEndedAt, studyTimeMs, correct, hints, priorExposure, interveningExposure. Keep identifiable learner exports private; never commit them as fixtures.

Receipt: 0 clinical questions selected/re-written/imported; 0 human approvals; 0 enrolled learners; 0 observed efficacy outcomes. Pending input: a complete new PYQ/QBank bundle and separate eligible holdout families. Next intake follows the verified immutable Drive release package and existing one-action admin review.
