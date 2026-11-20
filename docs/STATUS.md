# Status

Current state and recent entries. Entries up to 2026-11-17 are archived in [archive/STATUS-through-2026-11-17.md](archive/STATUS-through-2026-11-17.md) (unchanged). Add new entries at the top of "Recent".

## Current state — 2026-11-19
- NMC foundation complete for the subject-competency scope (ADR-138): registry @28, Admin learner preview browses by subject and by concept (2026-11-19).
- NMC foundation source accounting (2026-11-17): registry @24, 2,865 draft objectives on 1,544 concepts, 2,633/2,634 NMC rows linked (PS9.2 deleted officially). No clinical or faculty review (owner skipped it); no learner activation; no question import.
- Concepts: 1,543 accepted private identities; subject revisions supported and applied to 328 concepts.
- Syllabus checklist functions read current identities (migration `20261117150000`).

## Recent

### 2026-11-21 — Phone tab bar, filter sheet, sticky NMC search (ADR-154), branch `feat/phone-tabbar-filters-catalogue`
- Owner go-ahead 02:07 IST for the three ADR-153 follow-ups. Web pages only.
- Verified locally: `npm test` 1,796/1,796 (new `tests/phone-tabbar.test.js`); `npm run check`; axe WCAG 2.2 audit (120 audits) passes after forcing full opacity on tab labels; 28 Chromium browser checks incl. headless navigation check. `library-browser-check.js` and `navigation-browser-check.js` updated to close the phone filter sheet before page interactions.
- Not run locally: WebKit, headed navigation check (CI). Not checked on the owner's devices.
- Merged as `c91bd87` (#524) on owner go-ahead 03:13 IST and live on medretica.com; #523 closed as included.

### 2026-11-21 — UI type, spacing and layout pass (ADR-153), branch `fix/ui-type-spacing-layout`
- Owner asked for a phone/tablet/desktop review of fonts, boxes and spacing, then "Fix it".
- Measured before/after on 20 pages × 6 viewports (phone and tablet in both orientations, laptop, wide; signed-out and synthetic signed-in): text under 12px 918 → 250 (all remaining instances are the decorative sign-in mock-up), undersized tap targets 372 → 195 (remaining are inline sentence/footer links, exempt under WCAG 2.5.8), longest estimated line 187 → 112 characters, no horizontal scrolling, no page errors.
- Changes: self-hosted Atkinson Hyperlegible; six-step type scale; 16px text fields (stops iPhone zoom); `web/ui-foundation.css`; NMC catalogue navigation highlight; sign-in content baseline hashes updated for the new stylesheet link and snapped sizes (`tests/fixtures/signin-content-baseline.json`).
- Verified locally: `npm test` 1,793/1,793; `npm run check`; axe WCAG 2.2 audit (120 audits, Chromium) passes; 28 Chromium browser checks pass. Not run locally: WebKit jobs and the headed navigation check (CI covers them). Not yet checked on the owner's real iPhone/iPad.
- Merged as `db2d09f` (#522) on owner go-ahead 02:00 IST and live on medretica.com (stylesheet and font served; phone render confirmed). Next: owner choice on the bottom tab bar, filter sheet and NMC catalogue redesign.

### 2026-11-20 — #508 merged and deployed; sub-topic hierarchy (ADR-144)
- Owner (04:44 IST) asked whether the NMC foundation is on the learner side. Answer: Admin account only (= learner `mdmoazzam291@gmail.com`); `learnerActivation:false`. Owner chose to keep it that way for now.
- On owner go-ahead, PR #508 (19-subject index, "Also taught in …") squash-merged as `c3475d9`; #507 closed (included). nmc-admin-preview redeployed from `c3475d9` by the ADR-140 workflow (run 44662824259; tests and check passed in the run); unauthenticated request → 401.
- Branch `feat/concept-topic-hierarchy`: parent → sub-topic links for concepts and topics (ADR-144). Registry `data/concept-hierarchy.json` (empty), domain `src/domain/concept-hierarchy.js`, CLI `ops/hierarchy/link-subtopic.js`, preview breadcrumb/sub-topics, tests `tests/concept-hierarchy.test.js`. Preview data unchanged (same checksum; no redeploy needed for this change). `npm test` 1,765/1,765; `npm run check` passes.
- Next: MedMCQA import (owner decisions 04:40 IST: rights paused, unverified keys and no source acceptable) — questions link to NMC concepts, appear in Library and Question bank via roll-up, answers kept out of mastery/FSRS evidence until keys are verified.

### 2026-11-20 — NMC preview: conventional 19-subject view with textbook-style integration
- Owner request (02:31 IST): browse like conventional books — a subject's topics, each with the other subjects that teach the same thing.
- Browse by Subject now opens on a 19-subject index in NMC document/phase order (Phase 1 Anatomy, Physiology, Biochemistry → Phase III Part II), each card with topics, concepts, objectives and concepts shared with other subjects. Each topic in a subject shows an **"Also taught in …"** box: per shared concept, the other subjects' objectives (expandable, with NMC code links), labelled "Linked by shared concept (AI-mapped), not NMC's own integration list" — the 2024 metadata holds no integration table. Admin console and the Admin-only learner-page panel both get it.
- Domain: `previewPage` adds `subjectIndex` (no-filter Subject view) and `topics[].integration`; `NMC_SUBJECT_ORDER` is tested against `data/nmc-competency-source-metadata.json`. Preview data unchanged (@28, same checksum). **nmc-admin-preview must be redeployed** for the server part; web pages deploy from `main`.
- Verification: `npm test` 1,760/1,760; `npm run check` passed; local Playwright/Chrome at 390/820/1180/1440 px: index (Anatomy first) → Anatomy → integration box → expand → concept → Back to Anatomy; no overflow/console errors; earlier overlay scenarios re-run green.

### 2026-11-20 — NMC foundation panel on learner pages, Admin account only
- Owner request (00:35 IST): show the NMC foundation in the Admin account's own Library / NMC topics / Vault, not to other learners (option 1 of three; recall cards and single-account publication not chosen).
- New `web/nmc-admin-overlay.js` (+ boot, CSS): a collapsed "NMC foundation · Admin preview (AI draft)" panel in Library and NMC topics (full subject/concept browser) and Vault (opens on the selected concept). Rendered only after the server confirms Admin (`review.me()`, same check as the Admin menu); data from the Admin-gated `nmc-admin-preview` (403 for others), loaded only when the panel is opened. No publication, no study/question or catalogue writes; `learnerActivation:false` unchanged. Study Now/Exams unchanged (NMC has no questions).
- `mountLearnerPreview` gains optional `initial` (auto-load; on focus/pageshow reload only if the signed-in user changed, hide on sign-out). Admin console behaviour unchanged. Coupling baseline: `web/nmc-admin-overlay-boot.js` uses the existing Supabase auth adapter (reviewed).
- Verification: `npm test` 1,754/1,754; `npm run check` passed. Local Playwright/Chrome: signed-out → no access check, nothing shown; non-admin → one access check, no preview request, nothing shown; Admin at 390/820/1180/1440 px → closed panel, no load until opened, concept index → HIV infection, focus keeps the page, sign-out hides data, no overflow/console errors; Vault → selected concept, switching concept remounts; real library/nmc-catalogue/vault pages as a guest → slot hidden, no errors. Admin console preview re-checked at four sizes.
- Not yet: CI, merge, production check with the owner's session. Deploy = web pages only (Cloudflare from `main`); no edge-function or database change.

### 2026-11-20 — Learner access protection (ADR-143)
- Per-learner request quotas (study-api), Throttle/Unthrottle actions, Access Signals panel + Action Inbox item, invisible trace mark on session question stems with an admin trace tool, AI-crawler robots.txt, Terms update.
- Verified: npm test 1,755 pass; npm run check pass. Migration applied and study-api/owner-api deployed 2026-11-20 (~19:30 UTC). Not yet: live signed-in check.

### 2026-11-19 — NMC Admin learner preview: concept-wise browsing; full-coverage audit
- Admin learner preview (`nmc-admin-preview`) now browses two ways, per the subject-wise/concept-wise decision: **Subject** (unchanged; search now also matches concept names, and each objective's concept name opens that concept) and **Concept (across subjects)**: an index of all 1,544 concepts (filter by subject or name/exact NMC code) and a concept page listing only the subjects that link to it, objectives grouped by subject with topic, and the AI-draft concept layers. Read-only; `learnerActivation:false` and the Admin-only banner on every view.
- Preview data unchanged (registry @28, checksum `2d056482…0787`); no re-pin needed. Only function code changed: **nmc-admin-preview must be redeployed** (ADR-140 workflow) for production to show the concept view.
- Coverage audit (repo + live DB, read-only): preview = 2,865/2,865 registry objectives, 19/19 subjects, 1,544 concepts (1,543 accepted identities + learner concept Brown-Séquard), all 1,600 prerequisite links, 170 confusion pairs, 244 misconceptions, 66 presentations (759 links); 2,633/2,634 NMC rows bound (PS9.2 official deletion). DB: 1,543 acceptances, 0 accepted without draft; 4 unaccepted private drafts (engineering test draft C-dd9b3a6e; deferred COPD/asthma respiratory drafts C-89191b5c, C-305ac1fc, C-f2c27acd) are not in the preview and were left in place (immutable audit records, never learner-visible). Nothing deleted. `foundation_objective_revisions` = 0 (no owner objective edits yet).
- Verification: `npm test` 1,751/1,751; `npm run check` passed (local Node 22; CI uses 24). Local Playwright/Chrome run with real data at 390, 820×1180, 1180×820, 1440 px: concept index → HIV infection (8 subjects) → back; subject list → concept link → back to the same subject; no horizontal overflow, no console errors, link targets 28 px. Not verified: production after redeploy with the owner's session.

### 2026-11-19 — Two-factor for learners; learner journey dashboard (ADR-142)
- Account → Sign-in & Security: turn two-factor on/off (admins: status only, managed in Admin Security). Code prompt on every signed-in app page. Server gate in `learner_runtime_access_v1` (migration `20261119150000`).
- Admin → Observed Learning gains a "Learner journey" block from `owner_learner_funnel_v1` (owner-api `/learner-funnel`).
- Verified: npm test 1,747 pass; npm run check pass. Owner enrolled a verified TOTP factor before this change (1 factor in production).

### 2026-11-19 — Admin two-factor sign-in, audit log and payments views (ADR-141)
- Admin-POV audit: the owner console (18 views) lacked two-factor sign-in, a viewer for the immutable admin audit tables, and a payments view.
- Added TOTP two-factor for admins (server-enforced in owner-api, nmc-admin-preview, review-api admin routes and content-library-api admin routes; admin page code prompt; self-service setup in Admin Security). Added read-only Admin Audit Log and Payments panels with owner-api `/audit-events` and `/billing-summary`.
- Merged (#498, `ebae810`) and deployed by the ADR-140 workflow: owner-api v28 (also registry @28), review-api v33, nmc-admin-preview v31, content-library-api v8; all boot. Until the owner enrols a device nothing changes for sign-in.
- Verified: npm test 1,744 pass; npm run check pass. Live DB checked: audit and billing tables exist; 0 MFA factors. Not verified: browser flows on phone/tablet (CI browser jobs run on the PR); a real TOTP enrolment against production Auth.

### 2026-11-19 — Learner UX honesty pass and source-rights correction
- Audit (local app, phone size, fed the real production learner state via `content_library_snapshot_v1` for a test learner): no crashes or overflow; learners see 0 concepts, 0 questions, 0 notes.
- Home and Study now say "Questions and notes are being prepared" with links to the NMC curriculum and exam goals, instead of "Your scheduled reviews are up to date". Dead-end links hidden when empty (Start due reviews, past-paper browse).
- Plain-language rewrite of internal phrases (capacity gate, mastery inference, server-generated autopsy, preregistered gates, blueprint fidelity). Tests keep the same no-mastery/no-fidelity guarantees with new wording.
- Library on phones hides the repeated intro and generic welcome on section pages.
- Production data fix (migration `20261119120000_correct_catalog_source_rights`, applied): recall compilation `SRC-be6ce72162b7a18d92bf` public_domain → unknown; AHA aortic slide set and GeneReviews OTC → citation_only. US federal sources unchanged.
- Verified: npm test 1,735 pass; npm run check pass; study-entry, ux-journey, exam, retention, library and main browser checks pass locally.

### 2026-11-19 — Chromium CI time limit 20 → 30 minutes
- The Chromium `browser` job was cancelled at 20 minutes on a docs-only PR (#496); no test failed. Its last 14 runs took 10–19 minutes, so the limit had no headroom.

### 2026-11-19 — study-api: auth and runtime-access checks run in parallel (deployed v55, verified)
- Same pattern as review-api v32: `learner_runtime_access_v1` starts alongside `getUser` using the token's unverified `sub`; its result is used only if `getUser` returns the same user id. Route reads are unchanged.
- Live study-api v54 was checked file-by-file against `main` before this change (identical, including `data/preparation-curriculum.js` and `src/domain/preparation-pathways.js`).
- Merged as #494 (`5afe257`); deployed by the ADR-140 workflow (run 44506033130, commit `b4ad40f`) as study-api v55 at 10:29 UTC. All 11 deployed files verified byte-identical to `main` (including `data/` and `src/` imports). Verified with the owner's signed-in visit at 10:39 UTC: every review-api v32 and study-api v55 request returned 200 (no 5xx). First page: progress/questions/revision/readiness 455–581 ms (were 1.9–2.1 s in the morning's first visit); second page: 182–292 ms; warm `/me` 174 ms (median 491 ms before). Single visit, so treat as indicative, not a measured median.
### 2026-11-19 — Manual GitHub workflow for edge-function deploys (ADR-140)
- Added `.github/workflows/deploy-supabase-function.yml`: owner-triggered, `main` only, confirmation by retyping the function name, tests and checks first, `production` environment, deployed commit and version in the job summary. Owner added the secret and variable (scoped token: this project only, Edge Functions read-write, Project Settings read, 90-day expiry ≈ 17 Feb 2027). First run (44503071142, study-api) stopped safely at the CLI's confirmation prompt with nothing changed; `--yes` added.

### 2026-11-19 — review-api: auth checks run in parallel (deployed v32)
- `review-api` now starts `getUser`, `learner_runtime_access_v1` and (for `GET /me`) `content_admin_status_v1` at the same time, using the token's unverified `sub` only to start reads. Results are used only after `getUser` verifies the token and returns the same user id; otherwise the old sequential path runs. The early admin-status query is wrapped in `Promise.resolve` so the lazy Supabase query runs once.
- Trade-off: a request with a forged or expired token now also triggers one cheap runtime-access read (and, for `/me`, one admin-status read) before being rejected with 401.
- Deployed via Supabase MCP as review-api v32 at 2026-11-19 07:12 UTC (previous v31 matched `main` exactly). Deployed files verified byte-identical to the repo. Not yet verified with signed-in traffic: the workspace cannot reach the API, and no requests had arrived when checked. Rollback: redeploy `supabase/functions/review-api/` from `origin/main` before this branch.
- Verified 2026-11-19 08:18 UTC with the owner's signed-in iPhone session: two `/me` calls returned 200; no 5xx since deploy. Logs show `/auth/v1/user`, `learner_runtime_access_v1` and `content_admin_status_v1` starting together (08:18:38.709–.714) and finishing in ~0.55 s total. Those two calls still took ~3.0 s because they were the first run of the new version: ~2.4 s passed before the function's first outbound call (one-time load after deploy; the reported `boot_time` was 32 ms). A warm `/me` timing is still to be measured.
- Same visit, study-api v54 (unchanged, sequential): progress/questions/revision 1.9–2.1 s, with `getUser` ~0.59 s then runtime access ~1.0 s before route work. A warm study-api request in the same visit took 217 ms (getUser 21 ms, runtime access 51 ms), so first calls on new connections dominate.
- Expected effect: `/me` drops from about three sequential round-trips (median ~0.5 s) to roughly the auth-server call alone. Re-measure with the STATUS 2026-11-19 log queries.

### 2026-11-19 — NMC foundation: presentations and misconceptions (ADR-139)
- Admin learner preview now shows these layers per concept (builds on, confused with, misconceptions, presentations) in each topic.
- Clinical presentation layer: 66 presentations → 517 concepts (759 links, cause/approach). Misconception library: 244 high-yield wrong beliefs with corrections and error kinds (15 guideline-sensitive). Both AI drafts, Admin-only data, no redeploy needed.
- System tags already on 1,531/1,543 identities; skin and mental-health systems missing from the vocabulary (deferred). High-yield tiers wait for PYQ data.

### 2026-11-19 — API preconnect; server latency measured
- Pages now open the API connection early (`web/api-preconnect.js`, loaded right after `appearance-boot.js` on all 21 pages; one reviewed `supabase` coupling entry; test pins it to `cloudConfig.projectUrl`). Verified in Chromium on exam, account and privacy pages with no console errors.
- Measured from existing production logs (last 24 h, no new learner data collected): learner function boot time averages about 35 ms (max about 220 ms), so cold starts are not the main cost. Every authenticated request first calls `/auth/v1/user` (median 398 ms, p90 823 ms), then `learner_runtime_access_v1` (median 116 ms, p90 578 ms), then its own query, all in sequence. Slowest routes: `review-api/me` (median 491 ms, p90 1,421 ms), `study-api/progress`, `/questions`, `/revision/due`, `/exam-simulator/readiness` (medians 570–680 ms, p90 about 1.5 s).
- `learner_runtime_access_v1` already rejects deleted users, suspended users and inactive sessions from the database. Proposed next step (not done; auth-boundary change, needs owner approval): run the three checks in parallel, and verify the token signature locally instead of calling `/auth/v1/user` if the project uses asymmetric signing keys.

### 2026-11-19 — webkit CI time limit
- Main run on `b319576` failed: webkit was cancelled at 15 minutes (check and browser passed). Cause: PR #483 added the accessibility audit to both browser jobs but raised only Chromium's limit. Webkit limit raised to 25 minutes on `fix/webkit-ci-timeout`.

### 2026-11-19 — Learner UX follow-ups merged (PR #486)
- PR [#486](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/486) was squash-merged into `main` as `e4f6ce7c37fefab3492630196139f68b3e4631d6` on 2026-11-18 18:43 UTC. The PR head was `8f8728b0365263fbdfcedc8751b27987f94492fd`.
- Post-merge GitHub Actions workflow [#3427](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/44372765762) completed successfully on the merge commit: `check`, `browser` (Chromium), and `webkit` all passed.
- Included: learner-facing memory-check and sign-in/recovery copy; preparation-goal profile loading timeout/retry and save guard; restored Profile and Account & Security destinations; notification placement; learner-facing Exam Mode readiness and recovery copy; updated browser assertions.
- Navigation: the reported duplicate Account navigation is **not yet reproduced**. Current source renders Profile, Preferences, Plans, Account & Security, and Sign out in the signed-in account menu; Profile and Account & Security are distinct destinations/anchors within the account experience. Existing unit/browser checks verify expected menu entries, but do not establish the user's reported duplicate. Do not remove either destination or change shared navigation without a concrete page, viewport, auth state, and reproduction sequence.
- Cloudflare PR preview build/deployment was reported successful before merge. This session verified the GitHub post-merge workflow; it did not independently perform a visual inspection of the live production site.
- Documentation follow-up commit [`690c25a29d4d35ff0e4b23a49de8d0dcdaf0ba7a`](https://github.com/mdmoazzam291/Medical_Learning_OS/commit/690c25a29d4d35ff0e4b23a49de8d0dcdaf0ba7a) also passed workflow [#3428](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/44391794239): `check`, Chromium `browser`, and `webkit` all completed successfully. This verifies the updated status and handoff documentation commit.
- Deferred separately: shared client-side navigation/app shell and instrumented edge cold-start improvements. Do not fold these into the Account navigation investigation.

### 2026-11-18 — Learner loading: fewer requests, no false consent error
- Investigated owner's phone recording (12:37–12:44 IST) against production function logs: no learner call failed. Slowness = 5–6 API calls per page load (0.3–2 s each, ~2 s on cold start), CORS preflights, full page reload on every section switch, and a duplicate `review-api/me` per page.
- `src/adapters/cloud-review.js`: concurrent `me()` calls for the same session share one in-flight request (no caching after it settles; separate sessions never share). Removes one request per page load. Tests in `tests/cloud-review.test.js`.
- `web/account.js`: the retention card showed "Consent status is unavailable… Retry account data" while the consent call was still loading; it now shows "Checking pilot status…" and keeps the error only for real failures.
- `web/exam.js`: production and internal-test readiness checks now run in parallel (the internal check's 403 for non-testers is expected and still handled as "not allowed").
- Not changed: CORS max-age is already 86400 s (Safari caps preflight caching). Remaining latency comes from edge-function cold starts and full-page navigation; a shared app shell/client-side navigation would be the structural fix.
- Verified: `npm test` (1,729 pass), `npm run check`; exam, main browser, navigation and auth-recovery browser checks pass.

### 2026-11-18 — Fix palette flash (sage → lavender) on every page load
- Owner-reported (phone screen recording): pages flashed the default sage palette before switching to the saved lavender. Cause: `web/navigation.js` (a deferred module) set `data-palette`/`data-appearance`/`data-surface-style` only after first paint.
- Fix: new classic `web/appearance-boot.js` loaded first in `<head>` of all 21 navigation pages applies the saved `mlos-navigation-v1` theme, palette and surface style before first paint (same validation/defaults as `validatePreferences`). Added to the static allowlist in `scripts/public-surface.js`.
- Verified: browser probe showed first-paint palette was unset (default sage) before the fix and the saved lavender/dark after it on Home, Study, Exam, Library and Account; new `tests/appearance-boot.test.js`; full `npm test` (1,727 pass), `npm run check`, brand (48 cases), public-policies and navigation browser checks. Updated the policy-page script expectation and the reviewed sign-in HTML hash for this intentional change.

### 2026-11-18 — Accessibility audit extended to signed-in learner states and WebKit
- `scripts/accessibility-browser-check.js` now runs two passes per engine: 17 signed-out pages plus 13 signed-in learner pages (Home/Study Now, Account, Study, Today, Library and concept notes, NeuralVault list and a concept with its canonical note, Exam, Retention, Review, NMC catalogue, Plans) at four viewports = 120 audits.
- Signed-in pass uses a synthetic non-admin session and synthetic GET fixtures (reusing `tests/fixtures/preparation-fixture.js`); any non-GET request or page script error fails the run. Other external origins are blocked.
- Runs in Chromium (browser job) and WebKit (macOS webkit job, iPad-closest engine). Per-engine JSON reports are uploaded with the screenshot artifacts.
- Coupling baseline: added the reviewed test-only `supabase` marker for this script (synthetic session key and stubbed API origin, same pattern as the library/vault checks; no SDK or real calls).
- Limits: the Today workspace renders its "Workspace unavailable" fallback under the generic fixtures (still audited, but not its populated state); admin pages are not audited.
- First run (Chromium and WebKit agreed): one serious finding on every signed-in page at phone width — WCAG 2.5.3 Label in Name. The phone menu button shows the current master (e.g. "Study") but was named "Expand navigation", so voice-control commands using the visible word failed. Fixed in `web/navigation-view.js`: the phone button is now named "<Master>: expand/collapse navigation"; the desktop rail keeps "Expand/Collapse navigation". Updated `tests/navigation-view.test.js` and the phone selectors in `scripts/navigation-browser-check.js`.
- Verified locally: `npm test` (1,724 pass), `npm run check`, navigation browser check (172 nested leaves, touch, history, pins) and the two-pass audit plumbing.
- CI: audit passes in Chromium and WebKit (120 audits each, 0 violations). The Chromium job hit its 15-minute limit on one run (install step took 6.5 min; audit adds ~1.5 min to an ~11-minute job), so its timeout is raised to 20 minutes.

### 2026-11-18 — Automated accessibility audit (axe-core, WCAG 2.2 A/AA)
- New `scripts/accessibility-browser-check.js`: audits 17 learner-facing/public pages at phone (390), tablet portrait (820), tablet landscape (1180) and desktop (1440) with axe-core 4.14.1 in the Chromium CI job. External requests blocked; `bypassCSP` is used only so the test can inject axe (production CSP unchanged).
- Gate (`scripts/accessibility-gate.js`, tests in `tests/accessibility-gate.test.js`): serious/critical violations fail CI unless recorded with a reason in `ops/accessibility/baseline.json` (empty; never auto-refresh). Moderate/minor are advisory. JSON report is uploaded with the screenshots artifact.
- Scope limits: signed-out/public render states only; signed-in learner states, admin pages and WebKit are not yet audited. axe catches roughly a third to half of WCAG issues; it does not replace manual review.
- First CI run (axe 4.14.1, 68 audits): no moderate/minor findings; one serious `color-contrast` failure on `/web/account.html` at tablet portrait and landscape. Root cause was a layout bug: at <=1220px the shrunken phone illustration's tab bar overlapped the dark "Start today's plan" button, putting muted text on dark green. Fixed in `web/account-landing.css`: the tab bar now has its own opaque background and divider, and the illustration's spacing is tightened at <=1220px so the full mock screen fits. Desktop unchanged. The sign-in content guard hash (`tests/fixtures/signin-content-baseline.json`) was updated for this intentional, reviewed CSS change.
- Verified locally: full `npm test` (1,724 pass) and `npm run check`; brand, public-policies, public-home and auth-recovery browser checks pass; tablet/desktop screenshots inspected. Baseline remains empty.

### 2026-11-18 — Confusion pairs ("commonly confused with")
- `data/nmc-concept-confusions.json` (new): 173 AI-drafted undirected pairs across 324 concepts, each with the key discriminator (e.g. nephrotic vs nephritic, DKA vs HHS, open- vs angle-closure glaucoma, hanging vs strangulation). Validated by `src/domain/nmc-concept-confusions.js`; source `ops/nmc/confusions/pairs.json`; builder `ops/nmc/build-concept-confusions.js`.
- Purpose: misconception detection (a wrong answer that picks the confused concept) and compare cards. Not faculty-reviewed; not yet used by the app.

### 2026-11-18 — Cross-concept prerequisites complete (all 19 subjects)
- Added preclinical/paraclinical internal links: Physiology 133, Biochemistry 71, Pathology 105, Pharmacology 68, Microbiology 32, Anatomy 119 (incl. clinical anatomy and embryology chains). Total 1,600 links (1,234 essential); 1,269 of 1,544 concepts have at least one prerequisite. The remaining 275 are structures, laws, programmes or skills without a real prerequisite.
- The cycle check caught one cross-batch contradiction (Antimicrobial resistance vs Antimicrobial chemotherapy); kept chemotherapy → resistance.
- AI-drafted; not faculty-reviewed; not yet used by the app.

### 2026-11-18 — Cross-concept prerequisites: all clinical and paraclinical subjects
- Added Community Medicine 67, Forensic Medicine 61, ENT 52, Ophthalmology 49, Orthopaedics 45, Dermatology 35, Psychiatry 15, Anaesthesia 19, Radiology 17 links. Total 1,072 links (817 essential) across 771 concepts; acyclic; none over the review mark. Remaining: links inside preclinical subjects (Anatomy, Physiology, Biochemistry) and leftover paraclinical internals. AI-drafted; not used by the app yet.

### 2026-11-18 — Cross-concept prerequisites: Surgery, Paediatrics, OBG
- Added 137 Surgery, 134 Paediatrics and 100 OBG links (`ops/nmc/prerequisites/*.json`). Total 712 links (557 essential) across 479 concepts; acyclic, none over the 6-link review mark. Concepts already linked by an earlier subject keep their links. Unlinked remainders are structures, skills or programme topics without a real prerequisite. AI-drafted; not used by the app yet.

### 2026-11-18 — Cross-concept prerequisites: Medicine
- `data/nmc-concept-prerequisites.json` (new, separate from the objective registry): 341 AI-drafted "understand A before B" links for Medicine (271 essential, 70 helpful), covering 215 concepts; 16 Medicine concepts have no real prerequisite (skills, ethics, imaging) and are left unlinked. Direct prerequisites only; no cap per concept, more than 6 flagged (none).
- Validated by `src/domain/nmc-concept-prerequisites.js` (known concepts, no duplicates/self links, acyclic). Source list: `ops/nmc/prerequisites/medicine.json`; builder `ops/nmc/build-concept-prerequisites.js` adds subjects one at a time.
- Not yet shown in the app; not faculty-reviewed.

### 2026-11-18 — NMC foundation marked complete (subject-competency scope)
- Owner decision (ADR-138): foundation complete for the 2,633 live subject competency rows; AI-drafted objectives, no faculty review, no learner material.
- The five non-subject parts are kept separate in `data/nmc-non-subject-curriculum-deferred.json` (counts, overlap, recommendation, pointer to the retained audit branch `feat/nmc-support-cohort-reconciliation-20261103` @ `5524c5a`). AETCOM is the first candidate if ever needed.
- Production: nmc-admin-preview v30 on registry @28 with concept layers; owner-api v27 still on @27 (repo pins @28; redeploy pending, deferred to save usage).

### 2026-11-18 — Registry @28: quality-audit fixes
- Seeded audit (60 objectives, 60 prerequisite links, 20 confusion pairs): wording and NMC row matches sound; one systematic issue — 146 clinical-phase objectives carried the classifier's fallback 'mechanism' label.
- Owner rule: keep 'mechanism' only where the NMC competency text asks for it. Checked each against the official NMC 2024 text: 27 kept, 119 relabelled (treatment-selection 39, procedural-skill 16, ethics 10, prevention 10, others). Wording, IDs and bindings unchanged; same-concept prerequisites recomputed (1,532).
- Radial nerve injury ← Humerus fractures reversed (helpful); Abdominal examination → Abdominal pain in children now helpful; 3 general-vs-specific confusion pairs removed (170 left).
- Evidence: `docs/evidence/2026-11-18-nmc-fallback-task-relabels-v1.json`, `...-prerequisites-and-review-v3.json`. AI-authored; not faculty or clinical review.

### 2026-11-18 — Registry @27: duplicate wordings resolved; identity re-pin script
- The 8 @26 duplicate-wording findings are rewritten (GM9.8, GM14.1, GM14.2 split into their two skills; MI4.2/MI4.3 name their own condition). No IDs removed; all 2,865 objectives auto-checked. Evidence: `docs/evidence/2026-11-18-nmc-duplicate-wording-fixes-v1.json`, `...-prerequisites-and-review-v2.json`.
- `ops/nmc/repin-identity-digests.js <export.json> --write <n>` re-pins registry digests to current identities after owner label/alias edits (SQL export query in the script header).

### 2026-11-17 — NMC gaps closed: prerequisites, review state, owner edits, acceptance speed, GM28.18
- Registry @26 (PR #471): 1,549 same-concept prerequisite links on 1,015 objectives (know → recognise → act, then preclinical → paraclinical → clinical; acyclic). Cross-concept prerequisites not authored. `reviewState` from deterministic wording checks: 2,857 auto-checked, 8 needs-attention (duplicate wording). Evidence: `docs/evidence/2026-11-17-nmc-prerequisites-and-review-v1.json`.
- Acceptance speed: name-conflict check was ~320 ms per item at 1,543 identities (nested scan). New trigger-maintained `content_concept_identity_names` index (unique per name; reads current identities). Local check: 200-item batch over 302 identities in 373 ms.
- Owner edit path: `concept_identity_edit_v1` (label/aliases; append-only, digest-guarded, learner-visible refused) and `foundation_objective_revision_v1` (wording; registry = revision 0). owner-api `POST /concept-identity-edits` and `/foundation-objective-edits`; Admin foundation panel has Edit wording / Edit concept name. Owner edits are not faculty review.
- GM28.18: draft "COPD exacerbation management" is a narrower unaccepted proposal, not a duplicate; no change (ADR-137).
- Verification: `npm test` 1,714 pass; `npm run check`; `scripts/concept-identity-edits-db-check.js` on local PostgreSQL 16; PRs #471/#472 merged with all four checks green.
- Production: both migrations applied; name index backfilled (2,447 names); conflict check 6 ms in production (was ~320 ms). owner-api v26 and nmc-admin-preview v27 deployed. Not yet exercised with an authenticated Admin request from this session.

### 2026-11-17 — Deploys, open-PR inventory, product principles
- Deployed owner-api v25 (registry @25, overlay-checked validation) and nmc-admin-preview v26 (@25 Admin learner preview). PR #468 merged after all four checks passed.
- `docs/PR_INVENTORY-2026-11-17.md`: 76 open PRs grouped; owner approved closing 75 (PARSE rebrand dropped). `tests/account-oauth-redirect.test.js` restored from #229 as a regression guard.
- `docs/PRODUCT_PRINCIPLES.md`: durable design rules (exam yield ≠ forgetting, competence vs session state, no early RL/bandits, measure transfer, no learning-style labels).

### 2026-11-17 — Registry @25: learning metadata; full Admin learner preview
- `src/domain/nmc-learning-metadata.js` + `ops/nmc/apply-learning-metadata.js` (deterministic, AI-authored rules; evidence `docs/evidence/2026-11-17-nmc-learning-metadata-v1.json` lists every change). Objective IDs and wording unchanged.
- Task: the 1,875 objectives tagged `mechanism` re-tagged to the question-intelligence vocabulary by the earliest-mentioned focus (747 remain mechanism; e.g. etiology 158, differential 155, interpretation 160, treatment-selection 75). New `taskFacets` lists every task an objective names (1,613 one, 833 two or more).
- Context: population `children` (256, Paediatrics rows) and `women` (146, OG rows); jurisdiction `india` for Forensic and Community Medicine (317); others `not-specified`.
- New `assessability`: in-app 2,012; in-app-partial 799 (shows-how or procedural); offline-only 54 (performs). Validator requires both fields from @25.
- Admin learner preview rebuilt from the registry: all 2,865 objectives with task and assessability; a subject or search is required before listing; banner states AI-drafted, not faculty-reviewed.

### 2026-11-17 — Overlay-checked registry validation; history archived
- `validateFoundationDrafts` and `foundationDraftPage` now require the reference overlay; each exception binding must match its overlay row (search alias or topic group for resolved codes/headings, official replacement for amendment rows); deleted rows never bind. Negative tests cover a missing overlay, a missing row, a wrong kind, a forged basis, a deleted row and a standard row claiming an exception basis. owner-api loads the overlay as a seventh pinned data file (pin commit `bbccf9c`); owner-api is not yet redeployed — the deployed v24 still serves the CI-validated @24 data and will be redeployed with registry @25.
- PS 2.1* overlay note corrected: printed form kept; PS2.1 is a search-only alias; asterisk meaning unresolved.
- STATUS.md and AI_HANDOFF.md history moved unchanged to `docs/archive/`; both files now hold current state only. PROJECT_CONTEXT.md reconciliation date updated.
