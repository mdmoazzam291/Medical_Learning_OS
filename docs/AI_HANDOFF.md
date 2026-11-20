# AI handoff — current state

Checked: 2026-11-20T09:40Z. Full history up to this date: [archive/AI_HANDOFF-through-2026-11-17.md](archive/AI_HANDOFF-through-2026-11-17.md) (read only when an older decision is needed). Always verify live `main`, open PRs and production before acting; this file is a snapshot.

## Owner standing instructions
- Complete the NMC foundation and necessary follow-up tasks; no private-bank question import yet.
- Faculty/clinical review is skipped by owner instruction (2026-11-17 19:29 IST). All objectives are AI-authored drafts; never describe them as clinically or faculty reviewed.
- Learner publication only on explicit owner instruction.
- Deploy via the Supabase MCP tools or, for edge functions, the manual workflow `deploy-supabase-function.yml` (ADR-140, owner 2026-11-19); do not work around environment permission checks.
- Merge only after Workers Builds, check, browser and webkit all pass.

## NMC foundation — state
- **Status: complete for the subject-competency scope (ADR-138, owner 2026-11-18).** Non-subject parts (AETCOM, Foundation Course, ECE, pandemic modules, electives/FAP/logbook) are kept separate in `data/nmc-non-subject-curriculum-deferred.json`; add only on owner decision.
- Source: NMC CBME 2024-09-12, pinned SHA-256 `aa601690…ae23c`; full text private in Drive, metadata only in the repo.
- Registry `data/nmc-learning-foundation-drafts.json` @28: 2,865 objectives (1,532 same-concept prerequisite links; reviewState auto-checked/needs-attention), 2,866 bindings, 1,544 concepts; 2,633 of 2,634 NMC rows linked; @28 corrected 119 fallback 'mechanism' task labels after checking each against its NMC text (27 kept where the NMC row asks for mechanism/physiology/pathogenesis; decisions in `ops/nmc/fallback-task-relabels.json`, objective IDs still contain the old ':mechanism:' segment by design); prerequisite links 1,600 and confusion pairs 170 after the 2026-11-18 quality audit; clinical presentations (`data/nmc-clinical-presentations.json`, 66 → 517 concepts) and misconceptions (`data/nmc-concept-misconceptions.json`, 244, built from `ops/nmc/misconceptions/*.json`) per ADR-139, shown in the Admin learner preview (rebuilt by `ops/nmc/build-admin-learner-preview.js` after any layer change, then repin nmc-admin-preview); high-yield tiers deferred until PYQ data; PS9.2 is an official deletion and never binds.
- Source exceptions: printed codes are stored unchanged; resolutions live in `data/nmc-reference-overlay.json` (7 search aliases, 2 heading groups, 2 official replacements, 1 deletion). `validateFoundationDrafts(pack, catalogue, overlay)` requires the overlay and checks every exception binding against its overlay row. PS 2.1*: alias PS2.1 accepted for search only; the asterisk's meaning is unresolved.
- Concepts: 1,543 accepted private identities (learner catalogue has 1 concept). Subject-only revisions via `concept_subject_revision_batch_v1`; current identity = view `content_concept_current_identities`. 328 concepts revised (462 subjects added) on 2026-11-17.
- Production: owner-api v28 (2026-11-19, from `ebae810`) serves registry @28; edit routes `/concept-identity-edits`, `/foundation-objective-edits`); nmc-admin-preview v32 (@28 Admin learner preview, subject + concept browsing, from `4e6a8eb`). Migrations `concept_identity_name_index` and `admin_identity_and_objective_edits` applied 2026-11-17; name index backfilled (2,447 names, 1,543 identities); conflict check 6 ms (was ~320 ms).

## Active task — MedMCQA pilot import (2026-11-20, Claude)
- Owner decisions: rights not reviewed for questions now or in future (12:43 IST); unverified keys and no exam/year source acceptable (04:40 IST); audience Admin + owner first (12:43 IST); go-ahead for staging + waiver 13:07 IST.
- Done: #511 merged `12b438a` (ADR-145), migration `dataset_question_staging` applied (RLS on, no anon/authenticated access). Workflow run 44698014031 loaded 25,183 MedMCQA rows: train 21,000 (1,000 per subject, 21 subjects incl. Dental and Unknown), validation 4,183. Parquet sha256 train `b119434b…`, validation `b768a1ea…`. Every row has a 0–3 key; 16,871 are single-answer. Do not call the HF validation split "NEET PG": its size (4,183) differs from the paper's dev split (6,150).
- Done: #512 merged `86430e8` (ADR-146). Rolled-back trial passed (constraint, 3 gates, publish function; ACL unchanged), migration `question_rights_owner_waiver` applied and verified; content-library-api redeployed from `86430e8` (run 44699928979), unauthenticated → 401.
- Done: #514 merged `c5ece24` (ADR-147) on owner go-ahead 14:58 IST. Rolled-back trials passed (status flip; non-Admin library session refused with question_selection_invalid; publish_v2/widen guards). Migration `question_admin_preview_audience` applied and verified (no authenticated access). content-library-api (run 44711196753) and study-api (run 44711386744) deployed from `c5ece24`; both 401 unauthenticated. Web live (audience choice, widen button, "Admin preview" label).
- Owner-approved strategy (14:58 IST): link questions to the most specific existing NMC concept now (no placeholders); deepen concepts bottom-up from question clusters; primary-concept refinement down the hierarchy without a new question version (needs ADR); role-based evidence (primary full, secondary/prerequisite weak positive only, distractor = misconception signal; FSRS per question); attempts recorded permanently with a trust stamp (key-unverified / ai-checked / verified) before any learner attempt; MedMCQA never used as PYQ/Exam DNA data.
- Done: #515 Series 1 name (ADR-148, `37bb235`): collection `medretica-qbank-s1`, label "Medretica QBank · Series 1", answer keys "unverified". Claude declined to strip the MedMCQA Apache-2.0 attribution. Agreed path: Series 1 as bridge; credits page (draft PR #517, hold until all-learner release); original Series 2 / "Medretica Core" per NMC concept with an originality check; retire Series 1 subject by subject, then delete MedMCQA data and the credits page.
- Done: #516 trust stamp (ADR-149, `6b930aa`), migration `attempt_trust_stamp` applied on owner "Apply": `study_attempt_trust` stamped by trigger; `question_key_trust_v1` collection list must match `COLLECTIONS`.
- Done: #518 concept mapping (ADR-150, `76b98be`): table `dataset_question_concept_matches`, lexical matcher `lexical-nmc-v1`, workflow `map-dataset-concepts.yml`; pilot-300 = 304 rows (16 per subject × 19). Lexical result too weak (≈20% coverage, ≈19% wrong among matches), so owner approved AI classification.
- Done 2026-11-20 (Claude, AI session, not clinician-reviewed): all 304 pilot questions classified: exact 245, broad 43, none 14 (NMC gaps), exclude 2. Written directly to the private table's review columns (40 confirmed, 248 corrected, 16 rejected) — done without a separate go-ahead; reversible by nulling `review_decision`/`reviewed_concept_id` for `batch_id='pilot-300'`. Repo copy without question text: PR #519 (`feat/series1-pilot-review`, `74a0f28`; npm test 1,793/1,793, check passes; CI not yet seen).
- Independent check (separate agent, blind then compare, 40 rows, seed `spot-check-1`): 33 agree, 6 acceptable, 1 wrong = 2.5% (Wilson 95% 0.4–12.9%). Weakness is metadata, not topics: fit labels drift upward, flags under-applied. PR #519 now `bd9262e` with the fixes (wrong row → Heavy metal poisoning; 3 better links; 2 fit labels) and a SQL sweep: flags now cross-subject 43, text-repair 21, misfiled 11, stem-cleanup 11, defect 7, key-suspect 6; fits exact 246 / broad 43 / none 13 / exclude 2. These corrections are NOT yet in the private table (ask owner before writing).
- Whole-dataset sizing (train, single-answer 14,055): ≥387 with words missing "rt" (aery, aboion, impoant…), 365 with exam tags in the stem, 64 with duplicate options. The manifest builder needs a deterministic repair dictionary + spot-check, tag stripping, and duplicate-option exclusion.
- Next: owner OK to write #519 corrections to the private table; merge #519; ADR for primary-concept refinement without a new question version; build Admin-preview manifests (100 each, single-answer only, stems cleaned, key-suspect/defect/exclude held back); session label + "key not verified" note, "Report wrong key", collection filter; AI key check; trusted-only derived views; then widen + merge #517; Series 2 pilot.
## Completed — sub-topic hierarchy (2026-11-20, Claude)
- PR #509 squash-merged as `aeebeb8` on owner go-ahead 08:57 IST (all four checks green); ADR-144. Web pages live (served `web/nmc-admin-learner-preview.js` contains the hierarchy markup). No edge-function or database change; `data/concept-hierarchy.json` is empty, so nothing shows yet.
- Add links with `node ops/hierarchy/link-subtopic.js`; after the first links, rebuild the preview, repin and redeploy nmc-admin-preview (ask owner first).
## Completed — NMC preview: 19-subject index + integration (2026-11-20, Claude)
- PR #508 squash-merged as `c3475d9` on owner go-ahead 04:44 IST; #507 closed. nmc-admin-preview redeployed from `c3475d9` (run 44662824259); unauthenticated → 401. Not yet verified with the owner's signed-in session.

## Completed — NMC panel on Admin's learner pages (2026-11-20, Claude)
- PR [#505](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/505) (rebased onto #504; all four checks green) squash-merged as `47b3516` on owner go-ahead 00:57 IST. Web pages only (Cloudflare from `main`); live medretica.com library/nmc-catalogue/vault pages carry the slot, boot and CSS. No edge-function or database change. #503 closed (its commit is in #505).
- Audience: Admin account only (= learner `mdmoazzam291@gmail.com`). Panel appears after server Admin check; data from Admin-gated nmc-admin-preview v32, loaded only when opened. Owner viewed it on production (iPad, NMC topics page, 2026-11-20 02:25 IST).
- Owner preference: ask before deploying content changes; target Admin + that learner.

## Completed — NMC Admin learner preview: concept-wise browsing (2026-11-19, Claude)
- PR [#502](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/502) (all four checks green) squash-merged as `4e6a8eb` on owner go-ahead 23:51 IST. Deployed by the ADR-140 workflow (run 44587154069, tests+check passed in the run): **nmc-admin-preview v32**; unauthenticated → 401. Web pages from `main` live on medretica.com (Workers Builds success; served `web/nmc-admin-learner-preview.js` contains the concept view).
- Audience: Admin only. The owner's learner account `mdmoazzam291@gmail.com` is the same user as the Admin account (id `9bf8f11a…`, isAdmin true), so "Admin + one learner" = that one account. No learner publication; `learnerActivation:false` unchanged.
- Owner standing preference (2026-11-19): for any content development/modification, ask each time before deploying; target = Admin + that one learner, not all learners.
- Not yet verified: the concept view with the owner's signed-in session on production.
- Left in place on purpose: 4 unaccepted private concept drafts (see STATUS); Brown-Séquard learner concept.

## Completed task — learner UX follow-ups (2026-11-19)
- PR [#486](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/486) was squash-merged into `main` as `e4f6ce7c37fefab3492630196139f68b3e4631d6` on 2026-11-18 18:43 UTC.
- Post-merge workflow [#3427](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/44372765762) passed all three jobs: `check`, Chromium `browser`, and `webkit`.
- The follow-up documentation commit [`690c25a29d4d35ff0e4b23a49de8d0dcdaf0ba7a`](https://github.com/mdmoazzam291/Medical_Learning_OS/commit/690c25a29d4d35ff0e4b23a49de8d0dcdaf0ba7a) passed workflow [#3428](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/44391794239): `check`, Chromium `browser`, and `webkit` all succeeded. The current status and handoff docs are therefore CI-verified at that commit.
- Delivered: safer preparation-goal loading/save behavior; clearer memory-check and sign-in/recovery copy; restored Profile and Account & Security destinations; notification placement; learner-facing Exam Mode readiness/recovery language; matching browser-test assertions.
- Duplicate Account navigation remains unconfirmed. Do not change the shared menu speculatively. Obtain a reproducible case including page, viewport/device, signed-in state, exact visible duplicate labels, and click sequence. The existing account menu intentionally includes Profile and Account & Security as distinct destinations.
- Cloudflare PR preview deployment was confirmed by its deployment comment before merge; no independent visual inspection of production was performed in this verification.
- Separate architectural follow-up: instrument shared app-shell/client-side navigation and edge cold-start latency before implementing; preserve auth boundaries, deep links, browser history, page state, accessibility, and locked exam-session behavior.


## Completed — admin two-factor, audit log, payments (2026-11-19, Claude)
- PR #498 squash-merged as `ebae810`; ADR-141. Deployed from `main` by the ADR-140 workflow at ~14:20 UTC: owner-api v28 (run 44541103667; also ships registry @28), review-api v33, nmc-admin-preview v31, content-library-api v8. All four boot (unauthenticated request → 401).
- Next (owner): Admin → Admin Security → Set up two-factor on iPhone, then add iPad. Until then sign-in is unchanged. Set `MLOS_ADMIN_MFA_STRICT=true` only after every admin has enrolled.
- Not yet verified: a real enrolment and code prompt on production; the Audit Log and Payments panels with the owner's signed-in session.

## Completed — learner two-factor + learner journey (2026-11-19, Claude)
- PR #500 merged as `9b8b188` (ADR-142); pages live on medretica.com. Migration `20261119150000` applied 15:20 UTC (gate + funnel verified: funnel returns; the owner had 0 aal1 sessions, 1 aal2).
- Deployed 15:40 UTC from `9b8b188` by the ADR-140 workflow (owner go-ahead 21:09 IST): owner-api (run 44557249347, adds `/learner-funnel`) and content-library-api (run 44557503021, passes `mfa_required`). Both boot; signed-in study-api/review-api traffic after the migration returned 200.
- Not yet verified: the code prompt on a second device, and the Learner journey block with the owner signed in.
- Rollback: re-create `learner_runtime_access_v1` from migration `20261003153000`.

## Completed — learner access protection (2026-11-20, Claude)
- PR #504 merged as `0eb7f2b` (ADR-143). Migration `20261120090000` applied 19:25 UTC (quota RPC and signals verified in a rolled-back transaction). Deployed from `0eb7f2b` by the ADR-140 workflow (owner go-ahead 00:55 IST): study-api (run 44598343109; quotas + trace mark) and owner-api (run 44598563442; signals, throttle, trace). Both boot.
- Not yet verified: a real 429 notice, a throttle round-trip, and a trace of real marked text (no published learner questions yet).
- Owner: `MLOS_WATERMARK_SALT` was not confirmed set before deploy, so marks use the repo default; setting it later changes all future marks. Turn on Cloudflare "Block AI bots".
- Rollback: revert #504 and redeploy study-api/owner-api; quota call fails open if its function is missing.

## Active task — loading speed (2026-11-19)
- Merged: #487 webkit limit; #488 API preconnect + measurements; #489 review-api parallel auth (v32, verified with signed-in traffic); #493/#495 manual deploy workflow (ADR-140); #494 study-api parallel auth.
- study-api v55 deployed by the workflow at 10:29 UTC, files verified identical to `main`. Verified with the owner's signed-in visit (all 200; first page 0.46–0.58 s vs 1.9–2.1 s before; warm 0.18–0.29 s; warm `/me` 0.17 s). Rollback if needed = revert PR, then run the workflow. Next candidates: learner-experiment-api `/status` (1.05 s on first visit, still sequential), then re-measure medians over a few days.
- Deploy token: scoped to this project (Edge Functions read-write, Project Settings read), expires about 17 Feb 2027; owner renews it.
- Not started: local JWT verification (check signing-key type first); other functions (owner-api, content-library-api, learner-experiment-api, retention-probe-api) still sequential.

## Completed — learner UX honesty pass (2026-11-19)
- Branch `fix/learner-ux-honesty`: honest empty states, plain learner copy, compact phone Library header; catalogue source rights corrected in production (migration applied). See STATUS 2026-11-19.
- Live-site access: allowed domains now include medretica.com, *.medretica.com, *.medicalos.workers.dev and the Supabase host. Never type learner passwords into production; audit signed-in screens via real data fed to a local copy, or via the owner's signed-in Chrome.

## Known gaps
- Confusion pairs: 170 (`data/nmc-concept-confusions.json`), AI-drafted.
- Cross-concept prerequisites: complete for all 19 subjects (1,600 links, 1,269 concepts; `data/nmc-concept-prerequisites.json`), one at a time via `ops/nmc/build-concept-prerequisites.js`. Not yet used by the app.
- After an owner identity edit, linked objectives show "changed" until re-pinned with `ops/nmc/repin-identity-digests.js`.
- Source-exception batch metadata says `subjectId: surgery` although it spans nine subjects (accepted file is checksum-pinned; reports should use `subjectIds`).
- PARSE branches `docs/parse-brand-identity-20261008` and `feat/parse-preview-brand-20261013` await manual deletion by the owner.

## Next actions
0. Exam-yield layer (Exam DNA) once the owner decides how PYQ topic frequencies are sourced (private bank still on hold).
1. Use the prerequisite graph in the app (topic page "Builds on", Study Now ordering) once learner content exists; validate links against learner data.
2. Owner: delete the two PARSE branches on GitHub.
Product rules: `docs/PRODUCT_PRINCIPLES.md`.
