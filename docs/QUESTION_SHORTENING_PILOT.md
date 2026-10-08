# Question shortening evaluator — optional study design

Current status — 8 October 2026: fixed respiratory intake cancelled; clinical experiment suspended. Question-intelligence/evaluator implementation remains released through PR #201/#202. The next material intake is final polished PYQs with no fixed count or respiratory requirement. No holdouts, enrollment or outcome experiment is required for ordinary intake. Erased pilots stay excluded; no clinical pilot, human approval or outcome is created by this design.

## Historical design and optional future use

The design below retains representation/evaluation safeguards for a separately resumed experiment. It has no current execution authority and does not override the post-reset PYQ intake plan.

## Q2: first input selection

If a separate quality study is resumed, select genuinely supplied eligible originals under the current intake/review contract and lock its count/concept coverage in that study design. There is no active 12-question or three-note requirement. Prefer evidenced PYQs where available; preserve source wording/options/key, polishing lineage and actual exam/year/session evidence. Recalled items remain recalled; platform appearances retain the exclusive source policy.

Any future task coverage must follow actual supplied material, including: diagnosis/discrimination, initial or confirmatory investigation (actual qualifier retained), next best step, initial/definitive treatment (actual qualifier retained). Do not force unsuitable uploaded questions into slots. Images, missing options, unknown keys, disputed claims, rights gaps, multiple-correct items and sequential cases require their supported review/asset contracts before derivative practice. Classification can retain these formats; the current portable SBA importer cannot encode them as equivalent text-only questions.

For each selected original, create at most one concise-practice derivative and one useful post-answer revision cue. Each links its exact source version, preserves all options/IDs/key, lists protected literal facts, records substantive removals with reasons and eight independent checks. Automated checks verify record integrity; administrator inspection verifies task/medical equivalence. Failure of any gate blocks the candidate. Source versions and derivative IDs do not become new PYQ occurrences or inflate library counts.

## Q3: learning outcome experiment

Hypothesis: concise practice preserves delayed unseen full-question performance at equal study time while reducing wording burden. This remains untested.

A separately chosen quality sample can check clinical equivalence, workflow and qualifiers. Its training originals/derivatives are not unseen endpoints and cannot establish learning benefit alone. The cancelled respiratory selection creates no sample-size requirement.

Efficacy feasibility: before allocation, lock the protocol, exact item families, allocation seed, enrollment target, study-time budget, outcome windows, exclusions and analysis. Use counterbalanced original/concise concept blocks within learners; balance task and concept across learners. A learner trains each concept in one arm. Separate full question families test each block at day 7 and day 14. A tested family is never reused at the later endpoint. Holdout answers remain hidden until the response is persisted. Enroll only willing learners under the existing research authorization/consent boundaries; this task installs no enrollment or scheduler.

Provisional feasibility budget: 10 minutes per concept block, fixed for both arms, with a matched opportunity to attempt each assigned item. Record actual duration and uncovered items. Day 7/14 windows are 24 hours after the target elapsed day, measured in UTC elapsed time. Lost qualifiers/semantic drift block the derivative immediately, independent of aggregate accuracy.

Primary outcomes: delayed unseen full-case and transfer accuracy separately by day/arm at matched study time. Report eligible learners, unique families, missing follow-ups and allocation balance. Secondary: answer time, optional confidence calibration, ambiguity, hint use, qualifier errors, and dependence on concise cues. The current evaluator reports descriptive totals only. A future efficacy claim needs preregistered sample size/power and learner/item clustering; the quality pilot does not supply them.

Provisional acceptable-loss margin: 5 percentage points, an owner-reviewable experimental choice, not a proven clinical standard. Do not conclude noninferiority from a small raw difference; the appropriate uncertainty bound must exclude worse degradation under the locked efficacy analysis. Do not automatically change mastery, forgetting or Study Now weights from this feasibility report.

## Measurement implementation

Existing session/attempt records retain source question/version and immutable representation/variant context. Concise answers remain in canonical evidence, but original-only scheduling and library graph observations exclude them. Simulation uses original catalog items. The learning stream carries presentation metadata for replay. Successful siblings never become independent transfer endpoints.

`node scripts/evaluate-shortening.js private-outcomes.json` validates protocol/records, deduplicates retries, and rejects conflicting IDs. It excludes prior family exposure, cross-arm family overlap, intervening exposure, hints, non-full prompts, mismatched time and outcomes outside delay windows. Empty rates are null. Exposure flags require complete actual history; unknown exposure cannot be coded false. Enrollment denominators are required separately to measure attrition.

Input: `{protocol:{protocolId,delayDays:[7,14],studyBudgetMs:600000,acceptableLossPercentagePoints:5},records:[...]}`. Each record: recordId, pseudonymous learnerId, blockId, arm (`original|concise`), phase (`study|test`), familyId, conceptId, representation (`original|concise-practice|revision-cue|transfer-variant`), questionVersionId, occurredAt, studyEndedAt, studyTimeMs, correct, hints, priorExposure, interveningExposure. Keep identifiable learner exports private; never commit them as fixtures.

Receipt: 0 clinical questions selected/re-written/imported; 0 human approvals; 0 enrolled learners; 0 observed efficacy outcomes. Ordinary next input: final polished PYQs under the immutable Drive release and genuine one-action admin review. Separate eligible holdout families/participants are needed only if an experiment is independently resumed; no research execution is scheduled.
