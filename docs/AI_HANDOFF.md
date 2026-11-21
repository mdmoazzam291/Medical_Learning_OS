# AI handoff — current state

Checked: 2026-11-21T01:10Z. Full history up to this date: [archive/AI_HANDOFF-through-2026-11-17.md](archive/AI_HANDOFF-through-2026-11-17.md) (read only when an older decision is needed). Always verify live `main`, open PRs and production before acting; this file is a snapshot.

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

## Active task — phone navigation Version 4 (2026-11-21, Claude)
- Branch `feat/phone-nav-v4`, stacked on `docs/adr154-merged` (#525) over `main` `c91bd87`; ADR-155; see STATUS 2026-11-21. Web pages only.
- Verified locally: npm test 1,803/1,803, check, axe, 29 Chromium browser checks. Not yet: CI, owner device check, merge.
- Exact next action: CI green → owner go-ahead → squash-merge (includes #525; close it afterwards). Later: server list of open sessions for cross-device resume; honest count badges once the learner model exposes them.

## Completed — phone tab bar, filter sheet, NMC search (2026-11-21, Claude)
- PR #524 squash-merged as `c91bd87` on owner go-ahead (03:13 IST); ADR-154; includes #523 (closed as superseded). Web pages only; Workers Builds deployed. Live check 2026-11-20T21:50Z: served navigation.css/navigation-view.js contain the tab bar, nmc-catalogue.css the sticky search.
- Not yet verified on the owner's own iPhone/iPad.

## Completed — UI type, spacing and layout (2026-11-21, Claude)
- PR #522 squash-merged as `db2d09f` on owner go-ahead (02:00 IST); ADR-153. Web pages only; Workers Builds deployed from `main`. Live check 2026-11-20T20:50Z: medretica.com pages link `ui-foundation.css`, font served as `font/woff2`, phone render uses Atkinson Hyperlegible with 16px inputs.
- Not yet verified on the owner's own iPhone/iPad.
- Follow-ups done in ADR-154 (#524). Separate: fix flaky `preparation-browser-check.js` 'Refresh session' wait (fails 5/6 locally on `9f81832`).

## Active task — MedMCQA pilot import (2026-11-20, Claude)
- Owner decisions: rights not reviewed for questions now or in future (12:43 IST); unverified keys and no exam/year source acceptable (04:40 IST); audience Admin + owner first (12:43 IST).
- PR #511 `feat/medmcqa-staging` (ADR-145): private `dataset_question_staging` table + manual `load-dataset-staging.yml`. PR #512 `feat/question-rights-waiver` (ADR-146): `owner_waived` rights status, automatic for question sources. Both: tests/check pass locally; **migrations not applied**. Both append to DECISIONS.md: rebase the second after the first merges.
- Blocked on owner go-ahead for production DDL. A rolled-back trial of the #512 migration was refused by the safety check (the script lacked a final ROLLBACK, so the refusal was correct); do not retry without go-ahead.
- Workspace cannot reach `cdn.hf.co` or `datasets-server.huggingface.co`; the Drive copy (`MedMCQA for medretica/data.zip`, 55 MB) is too large for the connector, so the workflow downloads on GitHub runners.
- Next after go-ahead: merge #511 → apply staging migration → run workflow (per_subject_train 1000) → verify counts via Supabase MCP; merge #512 → rolled-back trial → apply → redeploy content-library-api. Then ADR-147 Admin-only audience for published questions (today publishing reaches every learner), NMC concept mapping, manifests (100 questions each), unverified-key handling outside mastery/FSRS.

## Active task — sub-topic hierarchy (2026-11-20, Claude)
- Branch `feat/concept-topic-hierarchy` from `main` `c3475d9`; ADR-144; see STATUS 2026-11-20. Verified locally: `npm test` 1,765/1,765, `npm run check` passes. Not yet: CI, merge.
- No deploy needed: preview data unchanged (hierarchy is added to it only once links exist). Web pages deploy from `main` on merge (adds breadcrumb/sub-topic markup that renders nothing while the registry is empty).
- Exact next action: wait for Workers Builds, check, browser, webkit → ask owner → merge. Then MedMCQA import planning (see STATUS).
- Owner answers 2026-11-20 04:44 IST: NMC foundation stays Admin + owner only (no learner publication); merge #508 first (done); one optional parent per concept/topic.

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
