Warning: truncated output (original token count: 130753)
Total output lines: 2849

## Genuine PR335 Admin and learner HTTP acceptance — 30 October 2026 IST
- Owner requested autonomous completion. Codex resumed branch `feat/admin-syllabus-baseline-drafts-20261029` at tested code head `0d59e8fae059f8bd1156ed238d6c5848daa2a7e3`; no implementation edits. Foundation run 40937425017 independently confirmed completed SUCCESS.
- Real cloud-browser sign-in through secure credential handling: Admin syllabus suite PASS (anonymous GET/invalid POST 401; Admin inventory GET 200 and fixed invalid POST 400). Signed out, separately authenticated a learner; learner suite PASS (anonymous 401; learner GET/invalid POST 403). No credentials, tokens or identity values extracted.
- Independent production function-edge log aggregation for 2026-10-29T19:35:00Z–19:42:00Z confirms Owner API v13, exactly TWO distinct authenticated subjects, one authenticated request per expected GET200/POST400/GET403/POST403. This supersedes the prior no-authenticated-session blocker. Observed Admin request window 19:37:00–19:37:07Z; learner 19:40:19–19:40:26Z.
- Read-only database verification: zero syllabus draft revisions, zero private acceptances, learner catalog version 446. No valid save, attestation, review grant, medical/rights decision or publication submitted.
- PR335 remains unmerged pending final source/recovery/release review; this receipt is verification, not syllabus approval. Documentation update requires fresh exact-head CI. PR336 and PR337 remain separate stacked drafts; previous heads have successful Foundation runs 40928662668 and 40931908949 respectively, which does not certify rebased/new source.
- Next: final exact-head PR335 release review and recovery evidence, then serial release. Review PR336/337 against PR335 accepted-private identity bindings, reconcile with released parent without force-pushing other work, re-run isolated SQL and hosted Auth checks before those releases. Preserve #326/#330. No outgoing remote jobs launched; ownership available to resume.

## PR335 hosted syllabus role acceptance page wired — 30 October 2026 IST
- Extended the existing non-persisting engineering acceptance page with Admin/learner syllabus test controls on exact Cloudflare PR335 preview origin. Each requires a real matching authenticated browser session and sends only GET or deliberately invalid {} POST; credentials, response bodies and user identifiers are not displayed. No syllabus approval or learner publication.
- Owner API v13 and Review API v30 deployed, each **only one exact CORS origin addition**, source parity 16/16 and 2/2. No auth/role/grant changes. GitHub CI 40935355530 Foundation SUCCESS and hosted 5 negative + 3 preview/origin checks SUCCESS. Full Chromium/WebKit suite was still in progress at checkpoint.
- PR335 remains draft/unmerged until distinct real Admin and learner endpoint checks are observed; production private drafts 0, private concept acceptances 0, catalog v446. PR336/337 independent draft work stays blocked in serial order. Rights #326 and publication #330 still require their own release gates.

## PR334 exact preview access approved — 29 October 2026 IST
- Owner explicitly approved all necessary next checks and exact334preview origin on Owner+Review APIs. Added only https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev alongside existing333origin; no wildcard or Auth/runtime/Admin bypass. Retained v10/v28 rollback manifests.
- Preview-only session-bound checker now supports both exact approved origins and acceptance suite: anonymousGET/invalidPOST401, real learnerGET/invalidPOST403, AdminGET405/invalidPOST400. Fixed{} POSTs only, no valid acceptance or attestation payload, no credential/body output.18focused role/origin/scope/error tests PASS. Full checks/deploy/live browser and exactCI pending at source checkpoint; do not assert release.
- Prior staging migration20261029161151 and rollback proof, backup40909908198/restore40910513398 PASS remain valid.0durable acceptances/1draftrevision/catalog446 unchanged. No persistent acceptance authorized; keep engineering draft unaccepted and revision2 unsaved.334 remains draft until browser/CI gates; preserve326/330.

## PR334 backend and recovery staged — 29 October 2026 IST
- Source2dc231a6f18a1a380d3af05ce9e983b1f2c37b78 remains draft onmain. Core+Chromium40908425894 SUCCESS; cancelledWebKit123569450477 rerun requested separately. Do not cancel that code-head run for documentation-only updates. This docs checkpoint is on docs/private-acceptance-staging-20261029; no code delta.
- Applied reviewed migration provider20261029161151/admin_concept_acceptance; SQL SHA256864b8bcf15a82882a22ca0c4a98da30ea8e6e4b8c91e9ad14ed76a0f2a7d8ff1 exactly source. RLS=true; anon/authenticated table/RPC denied; serviceSELECT/INSERT granted, UPDATE/DELETE denied. No learner catalog mutation. OwnerAPIv10 ACTIVE hash4ff7b8382c0861871acb69fc770821b09a11fef0859810053b281bc69257567b;14/14 deployed files exact source. Priorv9 fullbundle is rollback. ReviewAPI28 unchanged.
- Explicit productionBEGIN/ROLLBACK synthetic nonclinical acceptance test passed private receipt/readback/exact retry, wrong actor, stale and conflicting retry, original draft replay, post-acceptance revision rejection and private identity collision. Independent post-rollback0acceptances/1originaldraftrevision/catalog446/digest9b5e6a2ef1210c1c15ea41a507c8aa59be180af6f8e1393dddf5bbb28d60b5d3 unchanged. No real identity/classification attestation retained. Do not accept existing engineering draft; revision2 still unsaved after earlier auto-review rejection.
- Fresh backup40909908198 SUCCESS: supabase/2026/10/29/20261029T161634Z. Isolated restore40910513398/job123576913942 SUCCESS on2dc231a6, selected that archive; checksum/source/freshness, exact public owners/grants/defaults, data/encrypted configuration and cleanup passed. No production restore/provider failover. Real anonymous and invalid-bearer POST/concept-draft-accept401/no-store; unrelatedorigin403. Actual production333 draft reader still works withv10.
- Remaining before334frontend: nativeWebKit exact-head pass, real authenticated acceptance-endpoint invalid/learner denial and preview control checks. Actual334preview https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev currently preflight403origin_not_allowed. Prior approval covers only333preview. Obtain approval for this exact334origin on BOTH Owner and Review APIs; retain all Auth/runtime/Admin checks and avoid wildcard. Existing non-persisting acceptance harness may be extended with fixed invalid{} acceptance requests; no token extraction, valid acceptance or new review attestation. Keep334unmerged; preserve326/330 and335–337. Issue338 has full live receipts.

## PR333 released; serial continuation PR334 — 29 October 2026 IST
- PR333 merged a52982e786ca63a0f174129eb55e0c4d3c3c087a; merged tree886cbb71ee1b07d02a81024a54de7e26b68b465d exactly equals tested a38bcc3b tree. Exact feature Foundation40903412540 SUCCESS across core/Chromium/nativeWebKit. Production website df596c06-0a3a-40a5-877a-2e9b9a8a4c30 and heartbeat4ce0b099-55c9-4145-827d-30794ceb105c SUCCESS. Main40906463499 completed SUCCESS across core/Chromium/nativeWebKit.
- Owner API9/hash a014aaa7f6b3852d9fa7b2ea49eb2dee84560ceda5558e1eb3657d68fa6bc131 exact12 files; Review API28/hash684dca0ab739c0ffb5583fb4de2c2ed607a8d01429977a6ef8fa96ba1641fd99 exact2-file content. Both exact preview origin additions owner-approved, Auth/runtime/Admin intact. Draft migration20261029113205 unchanged. Fresh backup40893708167 and isolated schema restore40894417921 SUCCESS (before retained engineering test draft; no claim that draft row itself was restored).
- Actual browser seven-case endpoint contract PASS: anonymousGET/invalidPOST401, real learnerGET/invalidPOST403, Admin inventory200/missing404/invalidPOST400, no-store and readable browser CORS. Tokens never extracted. Actual Admin save/exact revision1 readback/reload and production released editor readback PASS; actual production learner route denial PASS; production acceptance-tool page disabled. One retained private nonclinical proposal aa61bb76-a21e-4c58-bbde-07d753cadd83 revision1; no revision2 after auto-review refusal. Catalog446/10concepts/6questions/digest9b5e6a2ef1210c1c15ea41a507c8aa59be180af6f8e1393dddf5bbb28d60b5d3 unchanged. No canonical acceptance/publication or clinical/rights approval; real induced transport-retry remains unclaimed.
- Next PR334 owner Codex: reconcile original906886a9 with released maina52982e by non-forced merge, keep existing private-identity safety fixes and333 origin/harness fixes. Resolved only portability-register overlap by preserving reviewed entries from both, then minimized formatting diff. Effective increment inspected: new Admin-private identities only, no learner catalog writes; existing concept revisions cannot be accepted. Add release333 receipt in this checkpoint. Local combined full test/check/build and new exact-head CI pending before any334 migration/API/frontend. Keep334 draft and undeployed; do not accept the engineering test draft. Preserve326/330 and335–337/sibling stack.

## Non-persisting hosted HTTP acceptance UI — 29 October 2026 IST
- Existing Node harness needs operator-supplied tokens; browser automation cannot extract them. Added exact-preview-only /web/concept-http-check.html using existing auth internally, selected-role verification through Review API/me, anonymous401, learner403, Admin inventory200/missing404/invalid400. All POST bodies fixed to{}; no valid save endpoint payload, token/identity/body output or persistence. Readable browser response proves CORS enforcement; no false assertion on non-exposed ACAO header.
- Four focused tests pass including scope/role/session rejection, exact invalid requests, sanitized reports, transport/status/cache/JSON failures. New two Supabase adapter/UI coupling entries explicitly reviewed. Local full test/check/build and exact CI/live page acceptance pending. Product authoring unchanged; no new API/schema. PR333 remains unmerged. Prior revision2 denial respected; one existing revision1 retained.

## Real candidate Admin save/readback passed — 29 October 2026 IST
- Owner approved same exact first-party concept preview origin for Review API. Read deployedv27 pinned sourcedf6039fe; repository Review API byte-equal. Deployed full source+runtime helper asv28, bundle684dca0ab739c0ffb5583fb4de2c2ed607a8d01429977a6ef8fa96ba1641fd99; both files exact content-match readback (provider normalizes paths). Added only exact origin and removed unused JSR declaration import; no Auth/runtime/role bypass. Twelve real-handler origin tests,1514Node and check13services241locations passed. Live preview OPTIONS200, anonymousGET401, lookalike403.
- Genuine signed-in Admin candidate loaded concept editor via review.me and Owner APIv9;10canonical targets/catalog446/6questions; empty drafts before test. Saved proposed nonclinical Engineering acceptance — private draft only through actual UI, status Saved and confirmed revision1. Exact source/reason/label displayed in readback; proposal aa61bb76-a21e-4c58-bbde-07d753cadd83, new draft conceptC-dd9b3a6e-936f-4b2b-bbf9-e39da774e570. No medical classification/claims or canonical acceptance/publication. This is ONE retained private engineering proposal; earlier zero-draft receipts are historical.
- Automatic approval review rejected attempted second immutable revision because exact follow-up payload/revision was not explicitly authorized. No second save/revision performed. Retained SQL readback independently confirms revision1 original reason. Browser transport then disconnected; reload acceptance and current unsaved UI state unverified. Never bypass rejected write using SQL/API.
- Source7af41ff409cd0800ddbeab7c55c188a74334665f; Foundation40899234769 queued at checkpoint. Need explicit approval for exact revision2 if desired, hosted endpoint-specific negative/invalid cases and fresh CI before merge. Prior transaction rollback tests cover idempotent retry but no claim of real browser retry transport test. PR333 remains unmerged; no clinical/learner/canonical write. Preserve326/330 and serial releases.

## Exact candidate origin authorized — 29 October 2026 IST
- Owner explicitly approved only https://feat-admin-concept-drafts-20261029-medical-learning-os-web.medicalos.workers.dev for Owner API acceptance. Added this exact origin, no wildcard; Auth/runtime/singleton Admin checks unchanged. Direct preview works without Cloudflare dashboard sign-in; before change its OPTIONS returned403 origin_not_allowed.
- Real-handler origin regression now includes Owner API and verifies exact preview preflight, unrelated/lookalike/HTTP origin rejection and missing/invalid-token401. Twelve focused cases pass. Full test/check and new hosted CI tracked separately; do not infer deployment from source checkpoint.
- Prior Owner APIv8 complete12-file bundle retained as rollback; candidate differs only in entrypoint origin line. Backend deployment/readback and live preflight pending at this source checkpoint. Current app session learner; candidate session signed out. PR333 remains unmerged; no clinical/learner/canonical writes.

## Fresh deployed-schema recovery proof — 29 October 2026 IST
- Backup40893708167/job123517004526 SUCCESS on main13b3c8c; uploaded and size-verified supabase/2026/10/29/20261029T143958Z. Live service-only privilege audit passed before dump.
- Isolated restore40894417921/job123519531797 SUCCESS on PR333 exact9b87c294; selected that archive/run40893708167, freshness/checksums/source passed, restored exact public access metadata/data/encrypted Vault and cleanup passed. Snapshot job skipped. Restore workflow and verifier byte-unchanged from main; feature branch supplies deployed draft migration to exact-table inventory. No production restore or provider failover.
- Real Admin access and distinct learner Admin-route denial previously passed; runtime CI40890803494 SUCCESS. PR333 remains unmerged. Endpoint-specific seven-case HTTP checks, authorized draft save/retry/readback and editor frontend acceptance remain. Current Work app session is learner. No canonical/clinical/learner write or function/frontend deployment.

## Hosted acceptance continuation — 29 October 2026 IST
- Current PR333 exact head802b52204fe09d6d1a333bd4fd2820d8bc68f762 is open/unmerged; Foundation40870298366 completed SUCCESS. Owner API remains ACTIVE v8, bundle93871fd489f3953ff6f670583712f198d0992345631d7d878b43b14c44421d36. No migration reapplication or redeployment.
- Secure real Admin sign-in succeeded in Work browser; fresh Home showed Master Admin and server-verified Owner Overview loaded through live APIv8. This verifies existing Admin access, not the undeployed333editor or concept-drafts HTTP contract. Keep the signed-in browser for continuation; do not extract tokens.
- Direct GitHub jobs readback confirms isolated restore40846013331/123353574201 SUCCESS, including backup freshness/checksums/source, disposable restoration, access/data/encrypted Vault verification and cleanup. Snapshot job skipped. It recovered Oct25 backup; no later draft-table recovery asserted. Latest scheduled-run enumeration is unavailable through the connector fetch allowlist.
- Remaining release gates: real distinct non-Admin HTTP/browser denial; Admin concept-draft HTTP contract and source-authorized safe save/retry/exact readback; recovery coverage/rollback readiness for added draft schema; then controlled333frontend release/build and editor acceptance. No synthetic permanent clinical drafts, new accounts, permissions, canonical/learner/clinical writes or merges performed. Keep334–337 unreleased and326/330 independent.

## PR332 released; next unit PR333 — 29 October 2026 IST
- Codex completed staged332 rollout after owner requested integration instead of more features. PR332 merged13b3c8c; website production8f70c0a6 SUCCESS; Owner APIv7 exact10-file source and migration20261029111344/hash verified. Real Admin Coverage Index and existing integrity/dashboard acceptance passed; catalog446/digest and review/rights counts unchanged. See releases/2026-10-29-admin-coverage-index-release.md and issue338 for exact evidence/limits.
- No other feature PR merged/deployed. Parent333 is now based on main13b3c8c; effective24-file concept-only increment inspected, no duplicated coverage migration. This docs checkpoint changes no333runtime source. Reverify fresh exact-head CI before its staged migration/API/frontend rollout. No new feature development; preserve326/330 and the later341/342 sibling stack.
- Main332 core and dedicated Chromium/nativeWebKit steps passed; broader main suites were running at checkpoint. Genuine learner-account HTTP denial, physical iPad and dashboard rollback controls remain unverified. CLI asset byte equality failed403/timeouts but real browser feature and API are verified. No clinical/source approval or learner/content mutation.

## Concept draft editor — reviewed source complete, 29 October 2026 IST
- Stacked PR333 adds zero-question concept proposals and revisions with immutable history, exact readback/idempotent retries, safe incomplete/newer typing and stale-base protection. Runtime 2af00ae693d18668a12f57cff1b319443c64eb85; see [receipt](CONCEPT_DRAFTS.md).
- 1,511Node/check13services240locations/build118/disposable SQL and Chromium3viewport authoring/inventory checks pass. Important review findings fixed with regressions. New-branch full CI remains pending; no hosted acceptance or production deployment. Parent PR332 final CI40764606041 all jobs SUCCESS and ready for review.
- Canonical concepts, syllabus baseline, review/rights evidence and learner publication remain unchanged. This is the first authoring increment, not all slice2 or a deployed master collection.

## Admin Coverage Index — slice1 implemented, 29 October 2026 IST
- Owner approved design PR331 and requested implementation. Feature branch feat/admin-coverage-index-20261029 / draft [PR332](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/332), remote code81d87c888d837a0605f242578c0a3aa5f67d608b. Admin inventory filters preserve empty concepts; coherent actor/registry-bound metadata snapshots, separate pending/stored counts, note relationships and scoped PYQ claims reuse canonical IDs.
- Latest1503Node tests, syntax/catalog/ADR/portability13services236locations,116-file Pages build, disposable PostgreSQL permission/replay/expiry/redaction checks and Chromium phone/tablet/desktop coverage flows pass. Fresh review findings fixed with failing regressions. Initial native WebKit coverage passed; whole navigation CI found duplicate Coverage Index headings, now fixed with a browser regression. Fresh CI40763850459 pending; local Linux WebKit remains unaccepted after dependency/runtime crash. [Exact receipt and limits](COVERAGE_INDEX.md).
- No production migration/API/site deployment, content import, clinical/source approval, learner evidence or visibility changes. Baseline incomplete and true approved coverage unknown. Slices2/3 and PR318/330 remain separate.

## Canonical note reader — production release verified, 25 October 2026 IST
- Owner-selected formatted notes/section navigation released: [PR #328](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/328) merged as `345ac4e112c1b30ed7bbdc17e1f766998e2c8866`. Foundation run **40145021645**: Node/check/build, Chromium and native WebKit all successful, including responsive Library/Vault note navigation, iPad rotation and existing Back/Forward/personal overlay flows. Provider production Cloudflare builds succeeded for `medical-learning-os` (`2c4d257b-1b2b-4d11-831b-3632b796f3ce`) and `medical-learning-os-web` (`63a4e332-4728-404b-9868-b88b30749b93`).
- Shared zero-dependency escaped Markdown renderer and opaque palette-aware reading layout added; actual six published notes each produce six section anchors. No clinical/rights content changes, DB writes, auth, backend, theme or master navigation changes. Rights/provenance issue #326 remains open and draft disclaimers still visible. Live signed-in browser acceptance and served-asset byte equality remain separate. [Release evidence](releases/2026-10-25-canonical-note-reader-release.md).

## Canonical note reading UI — feature verification in progress, 25 October 2026 IST
- Owner selected Build now: properly formatted canonical notes, section navigation and clean reading layout in NeuralVault and Library, preserving the approved theme and navigation. Current task branch `feat/canonical-note-reader-20261025`, based on main `a2a1436ae9b58fe8ab84d1ce7aea795e681cafe1`. No medical-content rewrite, approval/status mutation, schema migration or learner-data write.
- Adds a shared no-dependency escaped Markdown renderer with anchored headings, list/inline formatting, inert HTTPS references and per-note outline. Shared styles use opaque Sage/Lavender surfaces and responsive reading measure. Vault and Library/Compare/References/Recall rendering use the same presentation; existing exact hashes and private overlays remain. Regression tests include malicious Markdown and phone/tablet/desktop real browser interactions; full CI and deployment verification are **not yet confirmed at this checkpoint**.
- Existing content governance incident [#326](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/326) is unaffected; stale unpublished-warning text remains faithfully present as content pending review. No false reviewed exam relevance or mastery values added.
- Next verify full Node/check/build and Chromium/WebKit across all viewports, repair observed regressions, merge only after green PR, verify Cloudflare website build, then record exact deployment evidence and remaining real signed-in acceptance.

## Saved-attempt review continuation PR324 — 25 October 2026

PR324 supersedes closed PR322, preserving main90aaacdc and the released PR321 learner-content fallback. Combined1484Node tests/check/build pass on exact source0e59653. Fresh Foundation40142407864 is queued; responsive hosted acceptance, runtime deployment and website release are pending. Original text review is implemented; archived-retired authorization and non-original/media history remain unfinished. All content and learner data stay in Supabase.

## Published learner-content fallback — production release verified
- Checked 25 October 2026 IST. Owner fix PR #321 merged as `c264eb1bfcd23e3158760ff721d7979fc3148181`. Foundation run 40141314085 passed Node/check, Chromium and native WebKit; Cloudflare production web/heartbeat builds succeeded. Supabase `study-api` v53 ACTIVE includes the no-mapping fallback; exact ten-file bundle audited. Catalog v446, 6 published questions and 6 published notes unchanged. No clinical review/rights/learner writes or migration. Real authenticated production learner acceptance and served-asset equality remain unverified. See [release receipt](releases/2026-10-25-learner-content-visibility-release.md). Follow up with normal learner Library/Study Now/Notes/Graph acceptance and approved exam requirements.

## Learner published-content visibility repair — PR #321 pending validation
- Checked 25 October 2026 (Asia/Kolkata). Live Supabase catalog v446 contains 6 published questions, 6 published canonical notes and 10 concepts. The shipped preparation registry has zero approved objectives/mappings/artifacts, previously hiding the catalog under valid configured goal profiles.
- Owner requested a fix. Feature branch `fix/learner-unmapped-content-fallback-20261025`, PR #321 changes only the shared preparation projection, Study Now fallback receipt/learner message, Library status message, preparation tests, responsive browser assertions and documentation. It does not publish content, grant medical/exam approval, change DB privileges, or restore erased pilots.
- Initial CI check failed on two older medical-graph integration assertions expecting unmapped to hide published graph context. Those assertions were updated on the same feature branch to retain published context only for valid profiles. Follow-up CI is not yet confirmed here. Production web and `study-api` deployment and genuine signed-in acceptance remain pending; existing sessions and approved mapped scopes retain old behavior.
- Exact next: verify PR #321 full Node/check, Chromium and WebKit; review diff; merge only if green; deploy coupled web + study-api; inspect live API and route with genuine learner credentials when available. Unrelated PR #318 remains untouched.

## Saved-attempt review UI — 25 October 2026

PR322 now includes Recent Activity review links and read-only exact-version question/result/explanation display. URL preserves attempt/page across reload/return; failures and restrictions preserve activity with no protected content.1482Node tests/check/build pass. Hosted responsive/Chromium/WebKit flow and deployment acceptance pending. All retired versions remain denied; archive authorization and non-original/media retrieval remain open. No database or production runtime changed in this follow-up.

## Protected attempt review backend — 25 October 2026

PR322 saves the first learner-owned historical review boundary on codea38e22b. Exact still-published original-text prompts and stored receipts can be retrieved independently of session closure; retired/rights-restricted/missing content stays redacted. Final1476Node tests/check/build pass; hosted CI and deployment pending. No UI or archived-retired authorization is claimed; frozen non-original/media retrieval remains open. No production database or learner records changed. See latest handoff and the scoped plan.

## Scheduled retention acceptance — 25 October 2026

Natural04:15IST monitor execution persisted normal capacity:22,047,891bytes against500,000,000 operating budget. Delivery now diagnoses missing configuration. R2 correctly remains degraded because no main storage audit exists; repaired its manual-only workflow with monthly read-only inventory and scoped main-file-change triggers. Eight guard tests and1465Node/check/build pass. Hosted repaired CI and audit execution pending; sender and withdrawal-aware historical retrieval remain open. Supabase remains authoritative.

## Retention acceptance follow-up — 25 October 2026

PR319 hosted core checks pass; Chromium found an eager accessible-name selection race in the navigation test helper. The helper now waits for either valid phone Tools control without weakening assertions or changing runtime. Local tests/check/build and full hosted browser acceptance pending. Version7 scheduled snapshots, sender configuration and withdrawal-aware historical retrieval remain separately unverified. No content or learner data moved.

## Supabase retention monitor deployed — 25 October 2026

PR319 monitoring source is live as version7; exact pin readback and unauthenticated401 verified. Database-byte measurement22,047,891 is below budget. Local1465tests/check/build pass; exact-head CI and natural scheduled snapshot pending. Email remains blocked by sender configuration; full hosted historical-prompt retrieval remains unimplemented. No content, learner records, schema or credentials changed. See retention readiness and handoff.

## Supabase retention safeguards — 25 October 2026

PR319 adds capacity stages and accurate backup/notification evidence while retaining Supabase authority. Local1465Node tests/check/build pass; Python24pass/2skip. Exact-head CI and pinned monitor rollout pending. Existing encrypted backup repair was already integrated; sender configuration and safe hosted historical-prompt retrieval remain gaps. See [readiness](SUPABASE_RETENTION_READINESS.md) and latest handoff for limits and exact next action. No production data/schema/credentials changed.

## Responsive Admin top entry and complete feature map — released
- Checked 24 October 2026 at 15:32 IST. Owner explicitly chose Master Admin in tablet/iPad/desktop top navigation, phone/narrow split entry in avatar. PR316 merged asfacfbaa2b351f607e21c2ceb77c46b83d13440fa fromd72fc325a5b546474d0cc08a49ca936c607e6778; merged treee614aa4fad2451b45fbadad3c63f00c5d4d1cb69 equals the exact tested feature tree. Codex owns docs/admin-responsive-entry-release-20261024 for this receipt; no runtime change after merge.

## Responsive Admin top entry and complete feature map — released
- Checked 24 October 2026 at 15:32 IST. Owner explicitly chose Master Admin in tablet/iPad/desktop top navigation, phone/narrow split entry in avatar. PR316 merged asfacfbaa2b351f607e21c2ceb77c46b83d13440fa fromd72fc325a5b546474d0cc08a49ca936c607e6778; merged treee614aa4fad2451b45fbadad3c63f00c5d4d1cb69 equals the exact tested feature tree. Codex owns docs/admin-responsive-entry-release-20261024 for this receipt; no runtime change after merge.
- Single authorized entry per layout; wide Admin is a destination without a learner-context Admin tool disclosure. Existing Admin local toolbar, five groups, legacy-pin isolation, draft/history and denial behavior remain. Ordinary learner/guest navigation is byte-identical to base across40 rendering combinations. No backend/grant/content or other learner-feature changes.
- Foundation40083545559 completed SUCCESS on exactd72fc325:1460Node tests/check/110-file build, six isolated PostgreSQL scripts, Chromium and native WebKit with phone/iPad/desktop/rotation, fit, drafts, history and denial/adjacent flows. Responsive regression failed before fix then65focused/fullsuite green. Independent reviewer found no Critical/Important/Minor findings, passed36targeted tests and verified isolated geometry at11widths701–1600px; that fixture is distinct from full application acceptance.
- Production web buildcd17fe51-0799-4d70-8951-db9cdc7c0b06, heartbeat914f54e6-c7e3-4c59-b3a0-3ee25337d541 and existing sandboxf0e82231-bd08-427c-824a-569aa547979c all SUCCESS at merge. Existing Git integration only; no provider/security/payment settings or transactions changed. Fresh live guest Admin requires sign-in. No genuine signed-in production acceptance or served-asset byte equality is claimed.
- docs/ADMIN_FEATURE_MAP.md records all five groups/19destinations, exact implemented actions and limits, and prioritized stability suggestions. Broader status/blocker, draft recovery/error, pagination, guided relationship, experiment separation, audit and telemetry changes are proposals only. Task complete; next owner decision is the proposed Admin workflow-stability scope. Keep genuine source/clinical review and populated acceptance separate; no content publication or learner data created. Automatic main/docs CI may run; exact feature core/Chromium/WebKit already passed. No mutating background task retained; other worktrees/PRs untouched.

## Responsive Admin top entry and complete feature map — verification checkpoint
- Checked 24 October 2026 at 15:19 IST. Owner explicitly selected Master Admin in the top row on tablet/iPad/desktop, phone entry in the avatar. Codex owns fix/admin-tablet-top-entry-20261024, base main0ac50bbc72d32566e44b937d7428cf8dc2957435, in Medical_Learning_OS_relationship299. This supersedes only all-device avatar placement; Admin tools/pin isolation and local toolbar remain intact. Broader Admin stability changes are recommendations only.
- Wide navigation now exposes a server-authorized Admin destination without an Admin tool disclosure or duplicate avatar entry. Phone keeps its existing avatar entry and four learner master links. No backend/grant/content or learner feature changes. Responsive regression failed before the fix, then65focused/1460full tests pass; check13services/230locations,110-file build and diff whitespace pass. Existing Chromium/WebKit journeys now locate the single responsive Admin entry. Exact-head hosted results pending.
- Added docs/ADMIN_FEATURE_MAP.md: all five current groups/19destinations, actual actions, authority/workflow boundaries and limitations. Source audit includes reviewer authority being a status-only view, conditional AI telemetry, source watch as owner-operated evidence, latest100 relationship inbox, and health/restore workflow evidence distinct from actual recovery. Proposed status/blocker consistency, draft recovery, friendly errors, pagination, guided relationship entry and separation of experiments remain unimplemented.
- Independent readonly review is running; no final verdict claimed. Exact next: checkpoint remotely/open PR, complete review and exact-head browser checks/fit, merge scoped placement correction and verify production runtime/delivery. Do not implement the broader map recommendations without owner selection. Real clinical/reuse review and populated acceptance remain separate; no mutating hosted data task retained.

## Admin navigation isolation — production release verified
- Checked 24 October 2026 at 14:59 IST. Owner-authorized Admin-only repair PR314 merged as40f852622fce5e7c66fa9c7c41af31a4c1770559. Reviewed/tested head589c5f8c20c409fa1fb07cac42126e91b766cf12; merged tree643996c33e6b1442077b5f2ee1650c78b577fffe equals that feature tree exactly. Codex owns docs/admin-navigation-release-20261024 for this receipt; no runtime changes after merge.
- Admin is absent from global learner master lists and entered from the server-authorized avatar. Admin pages have their own local Tools control; existing five groups remain. Legacy Admin pins cannot render in learner menus or offer new cross-workspace pins. Ordinary learner/guest shell is byte-identical to base across40 render combinations. Intake removes its redundant navigation row and links its existing medical relationship section through draft-safe same-document history. No backend/API/database/grant/clinical changes.
- Foundation40081311132 completed SUCCESS on exact589c5f8: core1460Node tests/check/build, six disposable PostgreSQL checks, Chromium and native WebKit including phone/iPad portrait/landscape/split/desktop, Admin draft/history, focus rotation, denial and adjacent workflows. Local full Chromium also passed. Phone/tablet/desktop Admin images inspected. Independent reviewer had two Important findings, both RED-to-GREEN fixed and full suite green; no Critical/Minor findings. Earlier failed/test-synchronization states remain recorded below.
- Git-triggered production website buildc466d732-e395-4b90-a48c-5e3a391caa83 and heartbeat27bd13f7-8ada-4c28-870e-0e87a382865c both SUCCESS at merged source. No manual provider setting or payment operation. Live guest Admin page requires sign-in, no avatar Admin link/local toolbar; fresh DOM adminWorkspace=false confirms new navigation runtime. Raw CLI HTTP reads returned HTTPError, so full served-asset byte equality is not claimed. Genuine authenticated production Admin acceptance was unavailable; automated signed-in checks use nonclinical fixtures.
- Work complete within authorized scope. Exact next: owner refreshes the website, opens avatar → Master Admin, and uses its local Tools menu. Keep real content/reviewer approval and populated acceptance301 separate; no source publication, learner records or human attestations created. Automatic main/docs CI may still run; exact feature core/Chromium/WebKit already passed. Other worktrees/PRs untouched; no custom mutating background task retained. See docs/releases/2026-10-24-admin-navigation-isolation-release.md.

## Admin navigation isolation — browser verification checkpoint
- Checked 24 October 2026 at 14:46 IST. Codex owns PR314/fix/admin-navigation-isolation-20261024; actual source checkpointacebbfda13fbb798ea276e90f35cab776f1c8e26 is saved remotely, base main17c813410769113825c4e76c866922cc76f7457e. Scope remains only Admin entry/tools and leakage; no learner feature, backend or content changes. No production release yet.
- Full1460/1460 Node tests, check13services/230coupling locations,110-file build and diff check pass. Local Chromium completed the full three-layout navigation journey on8abec347 with real Admin draft/history, rotation focus, independent groups, appearances/pins and denial checks. Phone/tablet/desktop Admin screenshots inspected; inherited toolbar margin was reproduced by geometry failure then corrected. No dependency/package changes in repository.
- Independent review's two Important findings both have RED-to-GREEN fixes; no Critical/Minor findings. Hosted Foundation40080915215 core passed; WebKit failed at menu sweep immediately after cross-page avatar entry (admin:overview assertion). Latest checkpoint adds explicit Admin heading/data readiness and expected menu-heading waits, preserving every leaf assertion. Earlier local failures were missing browser executable, legacy top-header selector and resize-test synchronization; none is hidden as a green run. Latest exact-head hosted result pending.
- Exact next: inspect final hosted core/Chromium/WebKit, fix any reproduced failure, then merge/release the scoped UI repair and verify byte-exact delivered navigation assets and signed-out denial. Genuine authenticated production acceptance is not claimed. All private content/source review remains separate. No mutating hosted data task retained; other worktrees/PRs untouched.

## Admin navigation isolation — implementation checkpoint
- Checked 24 October 2026, 14:35 IST (Asia/Kolkata). Owner authorizes only Master Admin entry/tools and removal of Admin controls leaking into other masters; no broader learner redesign. Codex owns fix/admin-navigation-isolation-20261024 in Medical_Learning_OS_relationship299, base main17c813410769113825c4e76c866922cc76f7457e. Changes are not deployed at this checkpoint.
- Found real navigation overlap: authorized Admin pins surfaced in learner contextual menus. Admin entry now renders only in the server-authorized avatar; global learner masters retain Home/Study/Library/Exams. Admin pages have their own local toolbar/trigger; existing phone drawer and tablet/desktop contextual tools remain. Admin pins no longer render or offer cross-workspace pin actions. All five Admin groups remain; existing Medical relationships anchor is discoverable and redundant intake navigation row removed. No database/API/reviewer/clinical/source publication changes.
- Baseline1453/1453 passed. Four initial isolation/discovery tests failed before implementation; focused65 passed after. Independent review identified two Important findings: clean-URL relationship shortcut could reload away drafts, and phone drawer rotation lost focus. Both were reproduced with failing regressions and fixed using bounded same-page Admin intake interception plus Admin-only resize focus return; full1460/1460 now passes. Reviewer had no Critical/Minor findings; no second review claimed. Browser regression also asserts real intake draft/history and rotation focus. npm run check (13services/230coupling locations),110-file build and diff whitespace passed before the final reviewer fixes; fresh final rerun/hosted CI pending.
- Local Chromium was initially missing; isolated pinned Playwright/browser installed outside the repo, then existing navigation journey launched against synthetic nonclinical fixtures. Final browser/hosted results pending; no actual signed-in production acceptance is claimed. No dependency or package/lockfile changed. Existing backend authorization remains authoritative and fail-closed.
- Exact next: save code/docs checkpoint remotely and open PR; finish local browser and fresh check/build, inspect hosted core/Chromium/WebKit plus final images, repair reproduced failures, merge scoped repair and verify delivered assets/public denial. Retain genuine content review and issue301 separately. One writer; independent reviewer readonly and complete; no mutating hosted task retained.

## Content publication failure — production repair verified
- Checked 24 October 2026, 03:32 IST (Asia/Kolkata). Codex completed the screenshot-reported import_publication_failed engineering repair. PR312 code636ecc60db55e4ccdd2a45cbde4cc3901975d6fb merged asad9c618e87821e389f55c347ac2fbb795419dbce; merged tree69bde69f6c688b2ada5e18887d4a622abb3a0413 equals the tested feature tree. This docs receipt uses docs/content-publication-release-20261024, based on that merge; no competing writer or custom mutating background job retained.
- Exact-head Foundation40029990672 completed SUCCESS: core1453Node tests/build/check, all six disposable PostgreSQL checks, Chromium and WebKit/phone/tablet workflows. Independent reviewer found no Critical/Important/Minor issues. The specific SQLSTATE42725 regression failed before replacement and passed after. Full platform migration-chain replay and actual signed-in clinical publication remain unclaimed.
- Committed migration20261023214659_content_import_intelligence_grouping.sql applied through apply_migration as ledger20261023220111/content_import_intelligence_grouping. Stored single SQL body SHA256be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb exactly matches reviewed source. Full live pg_get_functiondef byte-matches the original definition with only the grouped extraction change. Wrapper OID24165/ownerpostgres, SECURITY DEFINER, empty search_path and service-only EXECUTE unchanged; anon/authenticated denied. Legacy OID23533/MD5b4eb4a30b179e281fd5eb6ed666314c4 unchanged. Security/performance advisor findings match pre-repair. No API/static source or provider settings changed.
- Fresh live readback: NEETPG26-CORE6-20261024-v1 remains draft, digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112, no publication receipt. Catalog407/questions0/notes0/clinical-review-events0 and existing rights-events12 unchanged. No hosted publication RPC was invoked, no reviewer impersonated and no clinical/rights approval invented.
- Exact next: genuine signed-in Admin retries Review & publish on the retained draft after checking actual review/permission evidence. Failure retains the current form values while the page remains open; a reload may require re-entering unsaved notes. The blank medical relationship editor is separate and can stay empty for ordinary question/note publication. Relationship proposals remain private pending published endpoint bindings and genuine separate review. Populated acceptance301, pagination300 and deeper exploration302 remain open. See docs/releases/2026-10-24-content-publication-grouping-repair.md. Post-merge CI may run automatically; the complete tested feature tree is already green.

## Content publication failure — reviewed repair ready for CI
- Checked 24 October 2026, 03:28 IST (Asia/Kolkata). Codex owns fix/content-import-publication-20261024 in Medical_Learning_OS_relationship299, base main09a0b596159cd42b3c5672c0c8e1f538b6cc33a7 (PR311). Owner screenshots report import_publication_failed after genuine Admin review submission. Scope is the engineering repair; no agent publication or fabricated reviewer/rights attestation.
- Live PostgreSQL logs at 23 October 21:39:02 and21:41:56 UTC show SQLSTATE42725 in content_library_review_publish_v1: x->'intelligence'-'derivatives' ambiguously binds subtraction before JSON extraction. The forward migration20261023214659_content_import_intelligence_grouping.sql groups the extracted JSONB before subtraction. The historical migration stays unchanged; delegate, advisory lock, version/conflict behavior, SECURITY DEFINER, empty search_path and service-only execution remain intact. No content rows or human approvals are written by the repair.
- RED reproduced the exact unknown-minus-unknown error without the forward replacement. GREEN targeted PGlite historical-wrapper-to-forward-replacement replay covers empty-derivative first publication, retries, successive derivative appends, metadata/removal/change conflicts, transactional rollback, legacy/schema1 behavior, delegated attestation/digest failures and browser denial. The legacy publisher is explicitly a component fixture; actual Medical/References/Rights acceptance and full platform migration-chain replay are not claimed. Full Node1453/1453, npm run check (13services/230coupling locations) and git diff --check passed.
- Independent readonly reviewer review_publication_grouping_fix reports no Critical/Important/Minor findings and independently reproduced RED and passed GREEN/check/diff. New coupling baseline entry was manually reviewed; no new provider/store/dependency or ownership/export gap. The CLI created this forward filename; no applied history rewritten. Exact migration SHA256be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb.
- Live readonly inventory after failed submissions: NEETPG26-CORE6-20261024-v1 remains draft, same digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112 and no receipt. Catalog407/questions0/notes0/review-events0; existing rights-events12 unchanged. The blank relationship JSON editor is a separate workflow, not an ordinary-question publication prerequisite.
- Exact next: checkpoint engineering/docs remotely; obtain exact-head hosted CI, merge the reviewed repair, apply only committed SQL through apply_migration, and read back ledger bytes/function privileges and unchanged private draft. At this checkpoint no live DDL has been applied. Then genuine Admin retries their review form after resolving its real gates. Never call hosted publication with a fabricated actor or substitute a clinical approval. Issues300/301/302 remain separate; no custom mutating background task retained.

## NEET-PG core-content intake — staged for genuine review
- Checked 24 October 2026, 02:58 IST. Owner explicitly requested the smallest useful selection from the dedicated Drive NEET-PG folder for website feature testing. Codex owns content/neetpg-feature-coverage-20261024 in Medical_Learning_OS_relationship299, base main359c5d246aec58f49e9ced76a0b8701fb689212d. This is content curation/staging and a docs receipt; no product code, migration or deployment changed.
- Selected6complete text questions, prepared6unapproved original AI-assisted linked note drafts,10proposed canonical concepts and8source records. Preserved source stems/options/recall lineage; proposed keys are not official or human-approved. Three medical-relationship proposals remain private/unstaged. One visibly conflicting source key was excluded rather than silently corrected. Separate2026recall material was not merged into the5285-question collection; erased pilots/fixtures were not restored.
- Existing content_library_stage_v1(jsonb,null) staged immutable NEETPG26-CORE6-20261024-v1, status draft, publicationAuthority=false, digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112. Exact JSONB readback matches; submitted_byNULL honestly identifies service staging, not a human actor. No publication receipt. Catalog407/questions0/notes0/relationships0/clinical-review-events0 and existing12rights-events unchanged. Genuine Admin review and actual source reuse permission remain pending; no fabricated attestation or learner/research records.
- Verified original PDF SHA256, all1166extraction-file checksums, seven source-image pixel/page bindings and visual inspection of the six selected crops. Node and live read-only SQL validate the manifest;12placement items retain pending human review and unresolved curriculum; prompt-only preview question objects omit keys/explanations/private provenance. Saved35-file private review ZIP (34checksummed contents) in Drive, downloaded it and verified exact bytes/hash5d23735be7e4752014e1a0e8e66cf226bdb831857a71299015659f7a3bd87496. Companion staging receipt and NEETPG-folder pointer roundtrip match. INDEX30 preserves the old index and records only candidate staging; private source bodies/bindings stay outside Git.
- Live guest Admin intake shows Sign in to continue; there is no current authenticated cloud session and no signed-in draft/populated learner acceptance is claimed. Six questions are a practical core-workflow candidate, not all-feature coverage: full recorded180-question exam/Autopsy, clinical media/cases, verified multi-year Exam DNA, official curriculum, derivative/transfer/retention/research, load, billing/privacy and physical-device actions retain separate requirements. See NEETPG_CORE_CONTENT_STAGING.md for coverage and limits.
- Exact next: genuine authorized Admin inspects this exact draft, resolves clinical/reference and reuse-rights evidence, and performs the existing Review & publish action only after the gates pass; then run authenticated phone/tablet/desktop acceptance301 and bind any separately reviewed medical assertions to actual published versions. Current owner authorization covers selection/intake, not invented clinical facts, commercial permission or human attestation. This receipt releases implementation ownership; no custom mutating background task retained.

## Relationship registry #299 — approved production rollout verified
- Checked 23 October 2026, 15:36 IST (Asia/Kolkata). Owner explicitly approved the concrete PR309 merge, migration/API/static release with “Ok I approve you”. PR309 merged as4c6f3771935a60b46fee03eedf3d09f3437555c2; tree7505022f93674c958750c8e9f5149f0d5c541430 equals reviewed3660aa7. Codex owns docs/relationship-registry-release-20261023 in Medical_Learning_OS_relationship299 for this receipt; no runtime edits after merge.
- Applied committed20261023091436_medical_relationship_registry.sql as provider-ledger20261023095946 medical_relationship_registry. Readback of its single SQL body SHA25669493ff4704ca3488b87c6a4ae8f09eb7f0ccb9ed2ccae87269a3fb7491ae74b equals the exact reviewed file. Both new tables RLS/no browser access/no service direct write/immutable triggers; five external RPCs plus snapshot service-executable, internal helpers/browser execution denied, fixed empty search_path verified.
- Live catalog remains407 with0concepts/0sources/0questions; registry0versions/0events; feed/snapshot arrays empty. Existing Admin inspection is empty with actual current three grants; no actor ID exposed. Privacy v10 complete=true, missing/unmapped[]. Security adds only expected two INFO no-policy service-only ledgers; existing leaked-password WARN unchanged. No new unindexed FK; new covering indexes unused on empty registry.
- Library APIv7 ACTIVE/all8files byte-exact merged source; only handler changed fromv6. Existing verify_jwt=false plus actual Auth/runtime checks preserved. Study API unchanged. Git-triggered Cloudflare website64fda0cd-f124-43a4-99f5-b4fe2cb1111e, heartbeatcd07dc94-7160-4097-8261-a925f916155f and existing sandbox2fa31988-f353-48ec-92c8-45f29d7f6ea4 builds SUCCESS at exactmerge. No manual deploy/auth attempt/provider/security/billing setting or payment changed.
- Canonical HTML/controller200 with byte-exact source; .html307 canonical redirect followed. Anonymous Library/relationship endpoints401 and direct new-table requests401/42501 denied. Fresh live guest Chromium shows relationship section with staging disabled and Sign in to continue. No live authenticated/populated acceptance is claimed. Cloudflare Dashboard ordinary sign-out did not block the verified Git deployment; no need for credentials or login handoff.
- Final release checked 23 October 2026, 19:45 IST. Feature Foundation39933609853 and post-merge Foundation39935853125 are ALL SUCCESS:1453Node tests, six disposable PostgreSQL checks, Chromium and WebKit. Main Chromium attempt1 hit the15-minute limit after dependency installation consumed about9m38s, without a product assertion failure; the single targeted retry120458461843 passed all steps, including172navigation leaves and adjacent workflows. Core/WebKit successes were retained; no runtime/CI settings changed. Retry artifact12507152590 ZIP SHA256f6b712833c4616584c876de281da322eb25a279892e22a4980faf26a341af12e; original final-feature screenshots remain the inspected visual evidence.
- Engineering release and verification complete; issue299 CLOSED as completed, with clinical launch gates explicitly retained. Final operational receipt is docs-only PR310; tested runtime remains merge4c6f377. Exact next work remains genuine source/provenance/rights review and authenticated populated acceptance301, pagination300 or deeper graph exploration302 as separately selected. Real multi-connection contention and extended-schema hosted restore remain unverified. No real claims, source imports, grants, attestations, learner responses or research enrollment created. Ownership releases after this receipt is saved; no custom mutating background task retained.

## Relationship registry #299 — engineering complete, production authorization pending
- Checked 23 October 2026, 15:21 IST (Asia/Kolkata). PR309 / feature/relationship-registry-299-20261023 is ready for review, based on main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Product code026d2eb642827a9ffebe765f0250ce6aa4b9d41d; final tested code/test head3f9c112f3b93073bca77a07ba27d7e0e4585e29c / treeb414a7deff2006fa3df1e868fe74048cb236c086. This final checkpoint changes Markdown only; it does not rerun identical runtime jobs. Local worktree Medical_Learning_OS_relationship299 is preserved for the rollout/review.
- Completed protected immutable assertion/version and lifecycle ledgers, exact source/endpoint bindings, current actual singleton-Admin/reviewer/rights gates, service-only RPCs and trusted learner snapshot. Existing Import & review supports external-curator staging, exact-target inspection/attestation, corrections, immutable history and retirement. Client actor/verification injection cannot authorize publication. No question co-occurrence becomes a clinical assertion.
- Final1453/1453 Node tests and all six disposable PostgreSQL checks PASS: relationship authority/rights/expiry/rotation/drift/latest suppression/immutability/idempotency/rollback/role isolation, question intelligence, access manifest, recovered baseline, privacy scope and chronological ACL71tables195statements. Syntax/decision/portability13services229locations,110-file build and whitespace pass. PostgreSQL fixtures execute exact migration/helpers on minimal platform shapes, not a full hosted platform or concurrent-session rehearsal.
- Foundation39933609853 at3f9c112: check, Chromium and WebKit ALL SUCCESS. Relationship stage/inspect/approve/graph/correct/retire, errors, current rights/grants, delayed editor locks, dirty edits and escaped claims pass phone/tablet/desktop alongside all adjacent journeys. Final screenshots from12493172036 inspected; ZIP SHA25645ad034d9807f8ef45911b7963f53f6c5d7efa7c8543231fed59dd98a695a037. Hosted static artifact12493215522 matches all110local files byte-for-byte; ZIP SHA256dd1451d8cd8a02fbe2761337a55c7d980ea74ed8426da91645d7643e1b2123dd. Local browser engines were unavailable; hosted acceptance supplies these results.
- Independent fresh whole-branch reviewer found no Critical/Minor and one Important pending-save edit loss. Four regressions failed before the fix; all editors lock during awaited saves/inspection, failed saves preserve changes and another form's draft needs explicit discard confirmation. Five UI regressions and full1453 suite pass. No second review claimed. Earlier browser failures were missing-panel RED and two fixture defects (per-tab interception; assuming a concept stayed public after its only eligible claim disappeared); final corrected assertions include zero edges/no draft leakage.
- Exact migration/API/controller hashes, deployment order, evidence and limits: releases/2026-10-23-relationship-registry-development-acceptance.md and MEDICAL_RELATIONSHIP_REGISTRY.md. No merge, production DDL/API/static deployment, clinical content, grants, human attestation, learner responses, research enrollment or provider setting changed. Previous production release remains live; no new live authenticated/populated acceptance claimed.
- Rulings/limits: intake is external-curator-only under ADR-097; native self-authored assertions need a separate supported review path. Clinical/provenance/rights truth requires genuine human review. Inbox is latest100 versions; pagination300 remains separate and older identities may need exact IDs. Multi-connection contention and full hosted restore of this new schema remain unverified. No deferred Minor findings. Private supplied material stays unapproved and outside Git.
- Exact next: obtain explicit authorization for PR309 merge plus the committed transactional migration/API/static rollout, then follow the receipt and verify live grants/RLS/security advisors, unchanged empty catalog, empty registry and protected/anonymous API behavior. Never attest or publish clinical assertions on the agent's behalf; populated expert-content acceptance301 and deeper exploration302 remain open. Issue299 stays open for rollout. Implementation ownership releases after this verified checkpoint; no custom mutating background task retained. Other branches untouched.

## Relationship registry #299 — reviewed implementation, release pending
- Checked 23 October 2026, 15:08 IST (Asia/Kolkata). Codex owns PR309 / feature/relationship-registry-299-20261023 in isolated Medical_Learning_OS_relationship299, base main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Latest code026d2eb642827a9ffebe765f0250ce6aa4b9d41d / treed7dc7f48fb8aa6afdb1ff196b8363b4e8cd23416 is saved remotely. Production release is not authorized by the engineering checkpoint; no live DDL/API/static/clinical changes performed.
- SQL registry, current singleton Admin/reviewer grants, exact source/endpoint bindings, immutable publication/retirement and trusted learner snapshot are implemented. Existing Import & review now stages/inspects externally authored assertions, binds actions to digest, shows live gates/history, prepares corrections and supports retirement. API identities derive from Auth and strict envelope validation. Registry/rollback/export documentation is MEDICAL_RELATIONSHIP_REGISTRY.md; migration README explicitly marks development only.
- Fresh full1453/1453 Node tests,15focused controller/route/adjacent draft tests, npm check13services229locations,110-file build and diff whitespace pass. Exact new SQL and genuine current helper fixture PGlite passes; latest helper includes singleton Admin rotation. Earlier existing privacy scope and71-table/195-statement chronological ACL replay passed locally and hosted check39932206590. Initial migration/routes tests failed before implementation.
- Hosted RED39931728460: Chromium/WebKit correctly failed missing panel. First UI run39932206590 check SUCCESS; both browsers reached publication then failed learner graph because test interception covered only Admin tab. Corrected fixture to context.route covering both tabs; no product graph fix was inferred. Latest026d2eb Foundation39933229293 remains IN PROGRESS; no final browser acceptance claimed yet.
- Fresh independent whole-branch reviewer relationship299_code_review read SQL/API/UI and passed22focused/PGlite. No Critical/Minor, one Important pending-save edit loss. Four regressions failed first; all editors now lock through awaited mutation/inspection, failure retains edits and unsaved work in another form requires discard confirmation. Five UI regressions and1453full now pass. No second independent review claimed.
- Builder/review rulings: external-curator-only follows ADR-097; native self-authored clinical assertions need a separate reviewed path. Genuine clinical/provenance/rights truth cannot come from engineering fixtures. Latest100-version Admin inbox is bounded; pagination300 remains separate and older identities may need a known exact ID. Real multi-connection contention is unverified; single-connection PostgreSQL behavior/locks/predecessor checks and code review are not concurrent-session acceptance. Production rollout and populated clinical acceptance301 remain pending. No deferred Minor findings.
- Exact next: inspect final Foundation39933229293 Chromium/WebKit results (including delayed edit locks and context-scoped learner fixture), repair any reproduced failure, inspect generated phone/tablet/desktop screenshots; then finish plan/docs/PR ready status. Preserve clinical emptiness and immutable audit history; present the concrete migration/API/static release for authorization. Other open PRs/branches untouched. No custom mutating background job retained.

## Relationship registry #299 — development checkpoint, 23 October 2026
- Checked 23 October 2026, 14:55 Asia/Kolkata. Owner “Next” selects the previously recorded next task. Codex owns feature/relationship-registry-299-20261023 in Medical_Learning_OS_relationship299, based on main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Code checkpoint 4b79a3f0eb9b87a469718a8932c7e9443f4f2131 / tree7cac2b86020695874964c47dc540951c830e60d1 is saved remotely. Other branches remain untouched.
- Implemented immutable relationship versions and publication/retirement receipts, exact assertion/source/endpoint bindings, current reviewer/source-rights checks, service-only RPCs and trusted Library snapshot. Authenticated relationship routes require current Admin and derive actors from Auth; client approval flags cannot supply authority. External-curator provenance preserves ADR-097; native self-authored clinical assertions are outside this intake.
- Baseline1441/1441 and current1448/1448 Node tests pass. Six new route behaviors failed first because routes were absent; one async failure escaped the outer handler, fixed with awaited invocation and regression. New PGlite test failed on absent migration then passed exact SQL: stale targets, grants/expiry, rights, retirement/correction, immutable rows, rollback, retries and browser/service denial. Existing privacy scope check passes. ACL replay initially failed because future tables were created before chronological migration replay; replay now creates each shape at its actual migration boundary and passes71tables/195statements. npm run check passed13services/228locations before adding the new browser journey path.
- Builder check identified external-curator versus native-author distinction, resolved from ADR-097 and documented. No clinical source content, human attestations, real grants, live learner data or research enrollment created. No production DDL, API/website deploy or clinical publication performed. Live catalog remains the separately verified empty v407; this checkpoint is not live registry acceptance.
- Unfinished: Admin relationship panel, browser RED→GREEN (new journey is intentionally added before panel), independent code review and exact-head final checks. Issue299 remains open; pagination300, populated real-content acceptance301 and deeper exploration302 stay separate.
- Exact next: open draft PR, observe missing-panel browser failure; implement the panel on existing Import & review; run Chromium/WebKit phone/tablet/desktop, local SQL/Node/check/build, independent review, then prepare the concrete release for review. Do not deploy this WIP. No competing writer or custom mutating background task retained.

# Current status

## Graph integration released and main verified — 23 October 2026 (Asia/Kolkata)
- Owner “Next” completed PR303 integration. Runtime dd5424eddcba97587f0b2c2032ccb62b1a315e58 merged as ff46e6d9207d5fc0766246b8b88c7ff5b19324a5; tested/merged tree94bfad145755f7a83422ecc02ce549eb79cd2411 matches exactly. Codex owns the final docs-only reconciliation on docs/preparation-curriculum-review-20261023 / PR308; its earlier material-readiness changes are preserved alongside this release receipt. Other open branches remain untouched.
- Preparation and graph now agree on visible endpoints and exact source rows. Shared conceptNeighborhood scopes original API inventory, covering the actual UI call path. Six new regressions cover goals/foundations/all, empty/invalid focus, immutable input and source availability. Three first failed, a source-retention assertion failed after endpoint repair, and two reviewer reproductions failed before the raw-renderer fix. Independent review had one Important finding, now fixed; no Critical/Minor findings or second independent review claimed.
- Final1441/1441 Node tests,35focused tests, syntax/decision/portability13services/226locations,109-file build and diff against main pass. Feature Foundation39926198142 AND main Foundation39927285345: check, Chromium and WebKit ALL SUCCESS. Five-width synthetic goal/foundation/all, Back/reload, positive/revoked/retired graphs, bounds, escaping, draft isolation and adjacent journeys passed. Phone/iPad-landscape/desktop screenshots inspected. Hosted109-file artifact equals local build; ZIP SHA256a3978574ee002fb356d4f2a1903bef78df49484080423f95ff289c16a199a363.
- Production website build61fe2600-5f9a-4a99-84f9-a2cf6dc89230 and heartbeat buildd0828e0d-ac27-44bc-9c41-72812f9ce9fd SUCCESS. Library APIv6 ACTIVE/all8files and Study APIv52 ACTIVE/all10files exactly match merged source. Existing verify_jwt=false and server Auth/runtime checks preserved; only preparation domain changed in the Study bundle. All5changed public runtime assets returned200 with exact source bytes; anonymous Library and consent endpoints returned401 unauthorized. Initial direct asset403 was followed by successful curl readback, with no cause inferred.
- Live cloud-Chromium guest reload retained the Medical graph URL and safe sign-in return target. Prior authenticated tab/session was gone; no new signed-in or populated medical-content acceptance is claimed. Read-only SQL confirmed catalogv407, concepts0/sources0/questions0 and no medical snapshot feed. No SQL, clinical publication/review, content restoration, research enrollment, learner response or provider setting changed. Current protected-registry work remains issue299; issue301 stays open.
- Earlier local Chromium installation failed (invalid archive); hosted suites supply browser acceptance. Earlier1399baseline overlapped merge exploration and is not clean baseline evidence. Staged merge whitespace warning concerned a pre-existing EOF blank in main's retention receipt; current-main diff passes and unrelated text was preserved. See releases/2026-10-23-medical-graph-integration-release.md for precise evidence limits and PREPARATION_CURRICULUM_READINESS.md for already-archived private material (INDEX29/rules6/privatev0.23), still unapproved.
- Exact next: implement issue299's protected relationship/version registry, actual reviewer/current-rights receipts, immutable publication/retirement, Admin controls and trusted feed with disposable PostgreSQL authority tests; keep source/clinical/rights review genuine and the live catalog empty until publication gates pass. Issue300 pagination,301 populated acceptance and302 deeper exploration remain separate. This task's implementation ownership releases after the verified docs checkpoint; no custom mutating background job retained.

## Graph PR303 integration with current main — 23 October 2026
- Checked 23 October 2026, 14:08 Asia/Kolkata. Owner “Next” resumes the existing approved read/display slice. Codex owns PR303 remote feat/reviewed-medical-graph-projection-20261022, original head96a8010923ad98fcbcdb74456283c188ef6c6923; local isolated worktree Medical_Learning_OS_graph303 on integrate/graph303-current-main-20261023 merges main26b9c0f48b7f70a36a38afe714794cf36f9d72f9. No competing writer observed. Preparation/retention releases are retained. PR308 remains a separate open supplied-material readiness reconciliation.
- Reproduced three documentation merge conflicts; retained newer main receipts and historical graph matrix. Existing runtime files merged cleanly but executable tests exposed scope inconsistency: medical relationships survived excluded endpoints and lost their referenced source rows. Three regressions failed first; endpoint filtering left a separate source-retention failure, then both were fixed.
- Independent read-only reviewer found one additional Important actual-renderer bypass: the UI passes original API inventory to conceptNeighborhood. Two raw-entry regressions failed first; applying preparation scope at that shared boundary fixed medical/exam/learning entry consistency. Six integration regressions now cover goals/foundations/all, invalid/unmapped, input immutability, source metadata and original API renderer calls. No Critical/Minor findings. No second review is claimed; the material finding was fixed and verified by the root.
- Fresh final full1441/1441 Node tests and35focused tests pass; npm run check passes13services/226couplinglocations;109-file build, syntax and whitespace checks pass. Earlier1399 baseline run overlapped the exploratory merge and is not clean baseline evidence. Local Chromium binary was missing and download returned an invalid archive; no local browser acceptance is claimed. New actual-controller five-width graph/preparation scope and Back/reload cases join existing positive/revoked/retired/draft tests; hosted Chromium/WebKit remain pending.
- Scope remains read/display only. #299 protected DB versions/reviewer grants/current rights/publication/retirement/snapshot feed remains unimplemented; clinical validity/learning efficacy and genuine reviewed-content acceptance under301 are separate. No clinical data, review attestation, research enrollment, learner response, SQL or provider setting changed. New module must be bundled wherever content-library.js is imported; existing APIs currently have no medical feed and correctly show empty graphs.
- Exact next: save this tested integration to the original PR using a non-forced expected-head update, verify remote tree/head, inspect exact-head hosted checks and repair any reproduced failure before merge/release claims. Keep issue299/301 open and include current preparation/account behavior in rollout readback. Codex retains implementation ownership until the final saved receipt; only normal CI/provider build jobs run remotely.

## Preparation curriculum and supplied-material readiness — 2026-10-23
- Checkpoint receipt checked2026-10-23T07:21Z: documentation commit27b21c67d850ca108f3888e181f09d0aeea32e3d, treec0a1ddfa21e1a0baf1512250e80d46a6360f5ca3, saved and fetched byte-identically on the owned branch; PR308 OPEN, not merged. Foundation39917058815 was queued at this receipt, not a passing result. This follow-up records the prior commit and PR; no code commit exists for this docs-only task.
- Checked2026-10-23T07:15:08Z against main26b9c0f48b7f70a36a38afe714794cf36f9d72f9. Connected material is already archived: live governance INDEX29 / ACTIVE_RULES6 identifies private working v0.23, extending the v0.21 evidence freeze. This supersedes a blanket “awaiting supplied material” description, not human review or release gates.
- Reported unified inventory:5285 question identities/5358 appearances;204 older items have provisional subject tags;33 classification rechecks proposed9 revisions with3 cases still unresolved. No human subject/clinical approvals or official year verifications. Frozen review requests cover20 source-incomplete questions/21 appearances and12 unsigned clinician packets; all other material also remains unapproved and rights remain unknown.
- Separate NEET-PG2026 extractionv2:171 fragments,103 structurally complete drafts,68 source-gap fragments and8 priority review packets. Structural completeness does not mean clinically valid or study-ready. No merge with the unified bank was performed or inferred.
- PREPARATION_CURRICULUM_READINESS.md records evidence read, current-version precedence, source acquisition limitations and exact publication/mapping dependencies. No private clinical text, Drive IDs or source media copied into Git; no production registry/runtime/database changes. Full dataset hashes/clinical references were not independently revalidated in this metadata reconciliation.
- Retention main Foundation39915010221 now ALL SUCCESS: check, browser/Chromium, WebKit. This docs-only task passed25existing preparation tests, npm run check (13services/226couplinglocations),32relative-link checks and diff whitespace validation. Clinical publication and populated live acceptance remain pending genuine source/rights/reviewer evidence; next independent engineering candidate is existing PR303 integration.

## Inactive retention pilot fix deployed and accepted — 2026-10-23 (Asia/Kolkata)
- Owner “proceed next” completed issue265's Account warning fix. Runtime8841addab39be7df5889245eb415c81947c87f06 merged through PR306 as cecce6cc1a4f83cd40679a5bc7a48c6f785db10c; merged treeb15c471aef967236cd77be346f7b80d92750f8e9 equals the tested feature tree. Codex owns docs/inactive-retention-release-20261023 for this docs-only receipt; unrelated PR303 remains untouched.
- Verified root cause: the successful consent RPC returns SQL NULL when no preregistered optional protocol exists. The GET now returns explicit inactive status, null protocol/event and all authority flags false. Registered receipts/consent writes remain unchanged. Real errors remain500; independently loaded account metrics remain visible and unavailable metrics remain unknown. Account renders inactive without opt-in/withdrawal controls or a false global failure warning.
- Verification: baseline1411Node tests; two new reproductions failed before implementation. Focused47tests and full1420/1420Node tests pass; syntax/decision/portability13services/226locations and108-file bundle pass. Independent reviewer and follow-up found no Critical/Important/Minor findings. PR Foundation39914014198 core, Chromium and WebKit ALL SUCCESS, including five-width inactive/error/registered/reload cases and full adjacent regressions. An obsolete source guard banning the entire word mastery was narrowed to actual mastery RPCs/true authority without weakening behavioral checks.
- Production frontend build628f4698-6902-4b5a-940e-e2d1bc7ec929 SUCCESS, web version0a6d3788-d814-46e4-a21b-f27459bcb243. Heartbeat build5263072a-4eab-432e-bfbf-11237f2e65b3 SUCCESS, version1d97a4d6-b0dc-4237-bcab-9bcb9ceb4bc9. Study APIv51 ACTIVE, all10files byte-identical to merged source; existing verify_jwt=false/server token+runtime checks preserved. Served account.js matches merged bytes. Anonymous consent read returns401 unauthorized. No migration, privilege/origin configuration change or new service.
- Real signed-in cloud-Chromium acceptance: reproduced warning/unavailable consent with visible0/0/0learning metrics before rollout. After coordinated frontend/API deployment, reload showed Retention feasibility: inactive, no failure warning, no unavailable message, no opt-in button and the same metrics; explicit Refresh session completed with the same healthy result. Workspace/browser briefly disconnected and were restored; the authenticated session survived, without another login. Initial immediate post-deploy locator observation timed out; subsequent fresh DOM and refreshed-page assertions confirmed the actual completed state. No credentials, private identifiers or account screenshots are recorded here.
- Post-release read-only database counts: optional protocols0, consent events0, assignments0. No pilot recreated, research enrolled/scheduled, learner answers/ratings or content changed. Registered-protocol/failure/device cases use synthetic tests; no deliberate live database/network failure or native-device acceptance is claimed.
- Main Foundation39915010221 core SUCCESS; duplicate post-merge Chromium/WebKit suites still running at this receipt. Runtime bytes equal the already-green PR source; do not claim these pending jobs passed. Exact next: record their eventual results if needed, then continue reviewed NEET-PG/INI-CET objective mappings and supplied-content acceptance under normal human source/rights/publication gates. Issue265 can close for this fix; separate domain/merchant work remains under266. Codex releases implementation ownership after this saved receipt; no custom mutating background job retained.

## Inactive retention Account fix — implementation checkpoint, 2026-10-23 (Asia/Kolkata)
- Owner “proceed next” resumes issue265. Codex owns fix/inactive-retention-account-20261023 from main4e555b5fc7b1eb25492954d6c60b636b1ab9df15. Other branches/PR303 untouched. No production rollout yet.
- Root cause verified against deployed study-api v50 and live SQL definition: no preregistered protocol makes the read RPC return SQL NULL; API classified that as500. Live protocol count remains0. Successful missing-protocol reads now project inactive status with protocol:null, no consent event and all authority false. Account hides opt-in/withdrawal without a spurious data warning; real errors stay errors and available metrics remain visible. No SQL/migration, enrollment, scheduler, Auth/origin change or content restoration.
- New executable route/controller tests first reproduced2expected failures; focused15 then47tests passed. Baseline1411Node tests passed. First full changed suite1419/1420 had one obsolete source-text guard matching masteryInferenceAuthority:false; reviewed guard now rejects actual mastery RPCs/true authority instead. Fresh full suite1420/1420passed. Syntax/portability13services/226locations and108-file build passed. Independent read-only review found no Critical/Important/Minor findings; focused reviewer17tests passed. Reviewer rechecked guard/docs and independently passed47focused tests; no findings.
- Expanded existing five-width preparation acceptance with inactive, genuine-failure, registered and reload cases. Hosted Chromium/WebKit and final full suite remain pending; do not claim deployed/live acceptance from synthetic coverage.
- Exact next: save this checkpoint/PR, inspect fresh full suite and hosted checks, repair reproduced failures, then perform the coordinated study-api/frontend release and authenticated Account readback. Keep optional research inactive and genuine errors distinguishable. Implementation ownership remains Codex; no custom mutating background job.

## Preparation production release verified — checked 2026-10-23 (Asia/Kolkata)
- Owner's “Next” completed the recorded PR304 release. Codex owns docs/preparation-release-receipt-20261023 from merge/main 8d37ff3da549573982d827637311f22cc09d8af5 (tree 069f432ce6c664ed70370308c0c8172f4f35096b); receipt PR305. PR304 is merged. Unrelated PR303 and other branches remain untouched. Merged source exactly matched the freshly tested task tree.
- Fresh local 1411/1411 Node tests, syntax/decision/portability checks (13 services / 226 coupling locations) and 108-file build pass. Exact main Foundation39859651120: core, Chromium and WebKit ALL SUCCESS, including preparation, workspace, responsive navigation and adjacent learner journeys. https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/39859651120 . Earlier feature Foundation39845183157 also passed all three jobs.
- Production: content-library-api v5 (7 files), study-api v50 (10 files), every deployed file byte-identical to merged source, including the shared preparation modules. Existing verify_jwt=false plus server auth.getUser/runtime-access checks preserved. Both anonymous reads return401 unauthorized; Cloudflare origin preflights return200 and correct CORS; unknown origins return403 without allow-origin. No SQL migration or authorization change.
- Cloudflare web build acb712f9-3050-4804-a92d-086684ef01ee SUCCESS / version9172cf7d-1bfa-4b08-8a0a-88ca2388ab93; heartbeat build7055fb7d-6063-4cd0-bd13-a361aadf8f7f SUCCESS / version32fe923a-91bd-4383-b668-0b5a4cda0fe9. All12 changed public bundle files match production byte-for-byte; Account and Library HTML also match. This is production readback, beyond a preview receipt.
- Real single-account cloud-Chromium acceptance passed after secure user-provided email sign-in: saved Both (NEET-PG + INI-CET; primary NEET-PG), reloaded and observed confirmed saved goals, opened authenticated Library, switched foundations/all scope and restored both through Back/Forward. Separate NEET-PG/INI-CET inventory states honestly say Not mapped yet. Authenticated Study reads zero attempts/questions and shows the empty-catalog state. No answer, rating, consent, billing, content publication or clinical import performed. Only the requested combined preparation preference was saved; existing account identity was retained. No credentials or private identifiers are recorded here.
- Limits: no real populated curriculum/question/session existed, so live recommendation selection, non-empty cross-view material and unfinished-session preservation were not exercised with real content. Those behaviors have synthetic automated coverage. Live native iPad/cross-device and two-real-account checks were not repeated. Account's optional retention consent panel reported unavailable and a partial-data warning; this pathway release does not certify that optional service or infer a cause. That read failure remains a bounded follow-up before any retention-pilot onboarding.
- Exact next: populate real reviewed curriculum requirements and exact approved artifact bindings through existing human source/rights/publication gates, then perform a real-content Library→Study loop. Diagnose the optional retention-consent projection separately without enrolling learners or changing research authority. Never restore erased pilots, fabricate clinical mappings or claim syllabus completeness/mastery. Future pathways remain unavailable. Codex releases implementation ownership once this docs-only receipt is saved/integrated; no custom mutating background jobs retained.


## Preparation foundation complete and ready for review — checked 23 October 2026 (Asia/Kolkata)
- Objective completed by Codex on feat/combined-preparation-pathways-20261023, PR304: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/304 . Base main288b84100cbb64e44702065314727154cecdd7ba remains unchanged; unrelated graph PR303 was not modified or merged. Final tested runtime0bddf286b8bebdbf6aa38ac31a859602374af796 / tree438692ca701605e85a715cd2ffd0477a972044b0. Receipt commitb35ff655b24bedb66be2ba3e3d82259811226e70 and subsequent final receipt alter documentation/register text only; no runtime changes follow the tested code.
- Foundation39845183157 attempt2: **coreSUCCESS, Chromium browserSUCCESS, WebKitSUCCESS**. Both engines passed the new5width Account save/reload/retry/account-switch isolation and Library goals/foundations/all, exact-note dossier, Back/Forward and unmapped-curriculum checks. Full adjacent navigation, Study, Library/Admin draft isolation, Vault, Exams and other existing journeys also passed. Attempt1's cancelled Chromium job followed9minutes of dependency installation and the15minute job deadline; only that job was retried, with no runtime changes or test relaxation. Earlier cancellation/failure records below are historical and superseded by this exact-source acceptance.
- Local1411/1411Node tests, full syntax/portability check13services/226locations,108-file production bundle and focused34preparation/state tests passed. Independent read-only review found no remaining Critical/Important product issues after reproduced scope, navigation and account-isolation defects were fixed. Public sign-in markup remains frozen independently of authorized authenticated Account changes. The simulator registry is byte-identical to main.
- Delivered: shared canonical NEET-PG/INI-CET/Both preparation, synced learner preference (not authority), versioned objective/context/prerequisite/requirement/artifact contracts, consistent Library scope and per-exam inventory, metadata placement warning, and scoped new Study Now plans with existing-session and history preservation. Two active preparation identities ship; objective/mapping/artifact registry remains intentionally empty until genuinely reviewed material is provided. Future pathways and additional assessment runtimes remain unavailable. See PREPARATION_PATHWAYS.md.
- Saved source and tested tree were independently verified through GitHub. PR304 is being marked ready, not merged. No production API deployment, database migration, actual learner-data mutation, clinical content publication, erased-content restoration or new paid service. The successful Cloudflare feature-preview build is not production release or live authenticated acceptance.
- Next owner-authorized release task: review/integrate PR304; deploy the matching frontend, content-library-api and study-api including shared preparation modules; verify real signed-in Account/Library/Study behavior. Then add reviewed curriculum requirements and exact published bindings through normal human content/rights review. Keep initial pathways free of invented syllabus-completeness or mastery claims. Existing Home/QBank/revision inventory counts remain full-catalog evidence; goal focus is Library/new Study Now plus per-exam mapping inventory in this foundation.
- Codex releases implementation ownership at this saved receipt. No custom mutating background job retained; verification jobs completed. Incoming agents should resume from actual PR/main metadata and this receipt, not the older active/WIP checkpoints below. Do not repeat completed fixes or auto-merge unrelated work.


## Preparation foundation saved; final Chromium retry — 23 October 2026 (Asia/Kolkata)
- Codex owns feat/combined-preparation-pathways-20261023 / draft PR304, base main288b84100cbb64e44702065314727154cecdd7ba. Final runtime0bddf286b8bebdbf6aa38ac31a859602374af796 has exact tree438692ca701605e85a715cd2ffd0477a972044b0. Remote/local source-tree parity, unchanged main and mergeable PR were verified. Subsequent receipt/register edits are documentation-only.
- Complete code: existing canonical workspace reused; validated exam/objective/context/prerequisite/binding registry; synced NEET-PG/INI-CET/Both preference; consistent goals/foundations/all scope and per-exam inventory; new Study Now selection uses shared requirements; existing sessions and historical evidence remain authoritative. Source contains two active preparation identities and no fabricated clinical objectives/mappings/content. Simulator registry is byte-identical to main. Curriculum authoring/rights review and actual medical publication remain separate.
- Verification:1411/1411localNode tests; full syntax/portability check13services/226locations;108-file bundle. Independent reviewer confirmed no remaining Critical/Important product finding after scope/history and account-isolation fixes. Final new preference/scope/account-switch tests passed at5widths in BOTH hosted Chromium and WebKit, as did the existing unified workspace/draft-isolation tests.
- Foundation39845183157 on exact runtime0bdd: coreSUCCESS and fullWebKitSUCCESS. Chromium attempt1 installed dependencies from20:02:12 through20:11:50UTC, then passed new preparation/workspace and prior adjacent journeys. Job hit its15minute deadline during old navigation at20:17:23; no failing application assertion was reported. Reran ONLY cancelled browser job120056845505 on the same source; final broad Chromium acceptance remains pending. Preserve success-vs-cancellation distinction.
- No main merge, production API deployment, schema change, real learner write, content ingestion or new paid service. Cloudflare feature-preview build15679dc7-ead2-4409-8c41-f09f090af897 SUCCESS is a preview, not production release. Source has no live authenticated acceptance claim.
- Exact next: inspect attempt2 browser job for39845183157, repair any reproduced code failure, then record its final receipt, mark PR ready and release ownership. Normal release needs coordinated frontend/content-library-api/study-api rollout (include preparation-pathways.js and preparation-curriculum.js imports), then real signed-in acceptance. Populate reviewed curricula/real artifacts through existing review gates; never restore erased pilots.


## Final account-owner isolation regression — 23 October 2026 (Asia/Kolkata)
- PR304 runtime7c358cfad245431ad0e7f57015ffbaaf1306cb1a / treea76dff8abdfca5612aa2dd3b6dd8ae9af9f33c4c passed hosted core checks and the new five-width WebKit preparation step in Foundation39844636236; remaining job results were still running at inspection. Local1410Node tests, full check13services/226locations and108-file build pass.
- Reviewer found one further case: starting a fresh load as learnerB after learnerA could retain A's preference if B's read failed. New RED→GREEN regression verifies the profile clears on identity change; the same reset clears previous progress/question/consent/admin display caches. Added browser coverage that changes the stored synthetic identity, fails its preference read and verifies no saved-goal display leaks.
- Follow-up remains on this owned feature branch, no release/merge or production request. Full fresh suite and final saved-head hosted acceptance are required before ready-for-review. Earlier failed runs remain superseded evidence, not successes.


## Preparation review corrections and hosted acceptance — 23 October 2026 (Asia/Kolkata)
- Active Codex branch feat/combined-preparation-pathways-20261023, draft PR304. Saved code7d3be4060a10c70ce896d275ff396db75f8f458f has exact treeb28df63469a0330910af693f63aba584c316b906; source trees verified equal locally/remotely. All1407Node tests pass on this scope-fix implementation; static build108files passes.
- First hosted Foundation39844047399 core failed only on the new synthetic-auth browser marker missing from the portability baseline. Reviewed script intercepts every existing-origin request; explicitly added its single path/provider pair (13services/226locations). No new service. Chromium passed all earlier adjacent journeys, then new preparation flow timed out on a standalone note-title selector; actual dossier displays the title in a provenance line. Selector now targets that actual line. WebKit pending at this checkpoint; no hosted full acceptance claimed.
- Independent review confirmed all3original scope fixes and found a late account projection could restore a signed-out learner or old access display. Added generation/identity guards before preference/account writes and after reviewer access, with2RED→GREEN VM regressions. Equivalent metadata field/goal ordering now canonicalizes before save confirmation; regression passes. Failure wording no longer claims an ambiguous remote write definitely left the old preference intact.
- Current local follow-up is being saved to the same PR; fresh full suite/check/build and hosted Chromium/WebKit results remain required. No merge, production deployment, clinical content/mapping, schema or learner evidence change. Exact next: inspect new saved-head CI, repair real failures, obtain final read-only review receipt and release ownership at final checkpoint.


## Combined preparation foundation — checked 23 October 2026 (Asia/Kolkata)
- Owner requested implementation of shared canonical NEET-PG + INI-CET preparation after inspecting existing work. Codex owns feat/combined-preparation-pathways-20261023 from main288b84100cbb64e44702065314727154cecdd7ba. Existing workspace/dossier PR296/298 are merged; older workspace-blocker paragraphs below are stale. Separate medical-graph PR303 is untouched.
- Initial code checkpoint2370770d1acd0e27d601f670c37384c22e8f0e58 saved through the connected GitHub app, exact tree18ae899ff7da25fdf58e08f4cec2f05d78be221b equals local implementation. Direct git push lacked credentials; no credentials requested/exposed. Current follow-up fixes/browser acceptance are being saved on the same branch; PR metadata owns subsequent exact head.
- Added validated pathway/objective/requirement/artifact contracts; synced learner preference via existing Auth metadata (never authority); Account NEET-PG/INI-CET/Both selector; Library goals/foundations/all scopes and separate exam inventory; scoped new Study Now plans with unchanged open-session resume. Registry intentionally has no invented clinical requirements/content; future pathways remain unavailable. See PREPARATION_PATHWAYS.md.
- Baseline1384Node tests passed. First changed full suite had one obsolete whole-Account hash guard failure; narrowed it to preserved public sign-in markup after reviewing authorized signed-in changes. Focused27tests pass; syntax/portability pass13services/225locations. Full fresh suite and hosted browser acceptance remain pending.
- Independent read-only reviewer found3Important scope issues (nested all-mode dossier re-filter, subjects/bookmarks bypass, replaced history). Added reproductions and fixes; focused15tests pass, including history RED→GREEN. Local Chromium download succeeded but launch is blocked by socket Operation not permitted; this is an environment limitation. New five-width synthetic Account/Library acceptance is wired for hosted Chromium/WebKit and has not yet passed.
- Exact next: save follow-up/checkpoint, inspect full suite/check/build and hosted responsive results, fix any actual failure, obtain reviewer recheck, then record final receipts. No merge, production API deployment, SQL change, medical ingestion, learner write or simulator modification performed. Implementation owner remains active; no mutating remote job outside normal verification workflows.

## Workspace re-audit and reviewed-relationship projection — 2026-10-22
- Current main `288b841` includes merged PR296 (shared Library workspace and isolated placement preview) and PR298 (source-grounded structured dossier). Direct GitHub check readback confirms core, Chromium, WebKit and provider builds succeeded. PR297 records ACTIVE content API v4; no fresh live API/session/database claim is made by this audit.
- Old PR296 “implementation pending” and handoff blocking-review text is historical, superseded by the merge receipt and current handoff. Focused graph/dossier/inspector tests pass, including the previously blocking context-list bound.
- Continued existing draft PR303 rather than creating a duplicate foundation. Four reproduced fail-closed gaps repaired: current-source fingerprint mismatch; ambiguous source/concept identities; invalid version states allowing old publication fallback; and reused exact relationship-version identities. Directed graph arrowheads now stop outside target nodes. Tests cover trusted-service handler projection, no cached fallback, synthetic five-width navigation, rights/retirement and bounded escaped display.
- Final local verification on runtime `f2560cbe718ac097f5465b370460abf1c57a6916` / tree `533f283506cf88e09aa0ef08b00e441a7f3d3db0`:1,399/1,399 Node tests;15 focused medical/handler tests; syntax/portability13services/225locations;106-file static build and five-width Chromium workspace/graph/draft checks pass. Independent review confirmed no remaining Critical/Important findings after fixing its reproduced immutable-ID ambiguity. Hosted Foundation39801800398 core and both workspace steps passed; wider Chromium/WebKit navigation acceptance was still running when this docs-only receipt was written. PR303 final body owns eventual results. PR303 is not merged and no production clinical data, schema or human-review authority changed.
- Live cloud-browser read-only check rendered the public homepage and canonical Library sign-in boundary. No authenticated session was available or created. Signed-in learner/Admin and genuine reviewed-content acceptance remain open #301; this observation is narrower than a complete live acceptance run.
- Remaining: #299 full protected relationship registry and SQL/Admin/API feed; #300 server-paginated indexed discovery; #301 authenticated live acceptance and genuinely reviewed content; #302 richer clinical discovery, overlays, comparison/media/cases and outcome-tested learning transitions. Empty catalog is an acknowledged content gate; it does not block synthetic workspace-foundation work.


## Post-release content API acceptance — 2026-10-22
- Supabase project `medical_learning_os` (`iyapppmeieqhflnzslao`) confirmed active. Compared the five deployed `content-library-api` source files to exact GitHub `main` runtime at `16e2ea956a5a6513114e0e1f974a86a23fe4720a`: four files already matched; deployed `src/domain/content-library.js` lacked question/note `sourceIds` and a bounded published `sources` projection with `sourceId/title/url/version`.
- Deployed the five verified `main` files via the existing Supabase function deployment connection, preserving `verify_jwt=false` (the existing handler performs its own token/runtime authorization), dependencies, secrets, schema, rights/publish gates and permitted origins. Deployment result: **ACTIVE `content-library-api` v4**; verified by a fresh function readback and checked that the published-source projection is present. Function digest `d67efe70ae6075ae1dce2893927032395568b00b4e4ad8cbf3904f2e6bb73883`. No database migration, new content, credential change or paid provider.
- Production read-only counts before/after: `content_library_imports=0`, `content_library_question_metadata=0`, `neural_canonical_note_versions=0`, `content_library_note_question_links=0`; separate `study_catalog=1` bootstrap row. No real staged learner-ready import exists to approve. Do not substitute invented clinical/PYQ content or bypass the human source/rights review, duplicate validation and `Review & publish` gates.
- PR296, post-merge Foundation `39687824682` (all three jobs passed), and Cloudflare website production builds are already verified. Live `medretica.com` page and Supabase HTTP endpoints could not be opened from this inspection environment; container DNS failed and web retrieval was inaccessible, which is **not evidence that the site is down**. No real authenticated learner/admin browser session or real-content end-to-end rendering was verified; GitHub synthetic browser tests and an ACTIVE function/version readback are not substitutes.
- Closure gates for live acceptance: open the live domain through an authenticated browser session; confirm approved learner navigation and global search at mobile/tablet/desktop; verify Admin → Content Intake authorization and opaque draft-preview isolation; once an owner-supplied original rights-cleared import exists, perform human review and then validate source/version metadata on its published learner view. Do not perform an artificial production publication just to satisfy a smoke test.

## Unified Content Workspace merged — 2026-10-22
- PR296 merged to main at `8ddb1c84a2f37a7c50da8960fe76259f527586d3` from exact feature head `184f1c14377398279ab48ec5bf9bc0f0c93eaae5`. Foundation run `39686401986` passed all three jobs: core Node/Python/build/isolated PG checks; Chromium browser, Library/Admin, Study, Vault/Exam journeys; and WebKit iPad responsive navigation/draft-preview isolation.
- Release includes a canonical concept-centered Overview/Notes/Questions/Graph Library, bounded Explorer/context panels, URL-preserved navigation and the isolated opaque-origin Admin Content Placement Preview. The compact search outside-tap bug is fixed; focused synthetic browser tests confirm no background Library modal opens.
- Cloudflare production website Worker build for the merge reports success (service `medical-learning-os-web`, build `7cd8e76a-d35a-4cee-9a41-25cb9fe9fe2e`). Main merge commit message inherited an older `[skip ci]` marker, so there was no fresh main-push Foundation run for that merge. This documentation-only receipt intentionally has no skip marker to request integrated-main CI on identical runtime bytes.
- Do not infer live authenticated learner/admin success from synthetic CI or Workers build status. Public provider readback, API source-metadata availability, actual content publication and post-onboarding monitoring remain separate verification work. No new content, migration, credentials, paid service or rights authority introduced.


## Unified Content Workspace implementation — 2026-10-22
- Owner accepted the supplied workspace design with “Build this all”. Feature branch feat/unified-content-workspace-20261022 / draft PR296 extends Library around one selected canonical concept with Overview, Notes, Questions and Graph; grouped Explorer, PYQ/QBank/original homes, responsive panes, exact-version context and private NeuralVault handoff.
- Added alias discovery, context-compatible URL transitions, bounded artifact/graph renderers, metadata placement checks and isolated prompt-only desktop/iPad draft preview. Existing review/publication and scored Study/Exam boundaries remain authoritative. No new provider, dependency, database migration or content is introduced. One reviewed mock-origin portability marker added for browser acceptance.
- Baseline 1358 tests and changed 1373-test suite passed; latest full acceptance after pagination/pane refinements is pending. Local check/portability and 102-file build pass. Independent code review's blocking findings were fixed. Cloud browser visual QA used isolated nonclinical fixtures at its available desktop width; new actual-controller browser acceptance is wired into Chromium and WebKit CI. No live signed-in learner/admin acceptance, production merge or deployment claimed.
- See UNIFIED_CONTENT_WORKSPACE.md for actual behavior, extension seams and limits: server pagination, a reviewed typed medical edge registry, clinical encounters and validated Digital Twin inference remain separate. Additional source metadata is backward-compatible with older API responses and needs normal API deployment to appear live.

## Responsive website and shared-backend PWA direction recorded — 2026-10-21
- Owner authorized adding the approved future direction to the GitHub roadmap. Documentation only: one responsive website, stronger installable PWA experience, shared backend across devices.
- ROADMAP extends M03/M14 with scoped offline synchronization, safe updates and device-level exit evidence; ADR-125 records the decision. Existing launch gates retain priority.
- Reviewed the documentation additions for scope and consistency. Runtime/domain tests not run because no executable code, configuration, schema or workflow changed. No PWA feature implemented or live acceptance claimed.
- Integration tracked by the documentation PR from docs/pwa-shared-backend-roadmap-20261021; paused engineering and provider migrations remain outside this task.

## Cloudflare deployment confirmed through GitHub without sign-in — 2026-10-21T16:17:29Z
- Owner requested an alternative without Cloudflare sign-in. Codex inspected the existing GitHub integration only; no additional login, deployment, credentials or security-rule changes were needed. This supersedes the provider-build blocker below.
- Exact runtime merge a0943495b2cd9e8855c3f1aa4ac5c771062cba75 now has successful production Workers Builds receipts: website build4246d646-4619-4a8f-92b9-2e4293b7217f completed2026-10-21T16:16:30Z, deployed version675c93dd-5c13-4738-ac4b-2338b15c9c81 (GitHub check119336862776); heartbeat buildad63aa1b-1714-4af4-90aa-530c5e1488c2 succeeded with version219f4afb-7acd-4a55-b023-254b13e7e812 (check119336345376). Receipt: https://github.com/mdmoazzam291/Medical_Learning_OS/commit/a0943495b2cd9e8855c3f1aa4ac5c771062cba75/checks . The provider published these after the earlier inspection; no failed deployment or repair is inferred from that delay.
- Main remains4efa2ea585e9bde0ec8826481839eea5e32147a0 before this docs-only receipt; its runtime matches the green merge. Foundation39630231480 core/browser/WebKit remain successful. Public asset/browser readback is separately UNVERIFIED because the earlier requests returned403; a provider deployment receipt does not prove live page behavior or authenticated flows. Preserve the existing recovery/provider-exit limits and local Cashfree timing limitation below.
- Receipt branch docs/github-cloudflare-receipt-20261021, based on4efa2ea; owner Codex until saved. Documentation only, no runtime/workflow/SQL/key/content changes. Exact next action: preserve this receipt through the normal documentation PR; inspect its final merge metadata before repeating work. No further Cloudflare sign-in is required for the completed build confirmation; no custom mutating background jobs retained.


## Recovery integrated and main CI passed; Cloudflare verification blocked — 2026-10-21T16:08:29Z
- PR292 merged under the owner's remaining-task instruction as a0943495b2cd9e8855c3f1aa4ac5c771062cba75; main tree dc5b8d163375b2541dac7e018338e9d7ce097f6d equals the checked integration tree. The existing weekly default-branch backup now contains the configured v3 encrypted Vault path. Do not regenerate the recovery key, repeat setup or restore erased content. No production SQL changes or provider cutover performed.
- Fresh hosted Foundation39624968689 attempt2 passed all1358Node tests, syntax/build and five PostgreSQL checks. Current source differs from that tested implementation only in five documentation/register files. Local fresh26Python tests pass. Local default/full-serial and concurrent focused runs had intermittent unchanged Cashfree SIGINT/transport fixture timeouts; exact cause remains unresolved, no code/test/timeouts changed. Hosted default suite passed. Preserve this limitation rather than claiming every local attempt passed.
- Main Foundation39630231480 PASSED all3jobs on mergea094349: core1358/1358Node tests/build/five PostgreSQL checks, Chromium and WebKit. The main code is integrated and its weekly schedule uses the configured encrypted Vault path. No Cloudflare build status was reported for this merge when checked. workers.dev and canonical medretica.com asset fetches returnedHTTP403 (canonical response1010); search fetches were inaccessible. Dashboard required sign-in; secure authentication returned API Request Failed: login403. Stopped after that first sign-in failure per browser authentication guidance; credentials were never visible to the agent. Live deployed asset/build result remains UNVERIFIED. No manual provider deployment, security-rule or account-setting change made.
- Final receipt branch docs/recovery-release-receipt-20261021 / PR293 contains only documentation/register changes, based on mergea094349. Merge receipt with [skip ci] after diff/portability checks; runtime is unchanged from green main. PR292/PR293 final bodies own exact merge/check receipts. Remaining next action is Cloudflare build/deployed-asset verification through an approved accessible session after login403 is resolved; do not repeat blocked sign-in, weaken security rules, rotate recovery keys or claim live UI/provider failover. External Storage/provider settings/runtime/cutover gaps below remain separate. Codex releases implementation ownership at the saved receipt; no custom mutating background jobs retained.


## Recovery integration resumed under owner instruction — 2026-10-21T15:49:27Z
- Owner requested the remaining task after completed key setup and actual v3 acceptance. Codex owns integration of PR292 into main, retaining the configured key and existing erasure/provider boundaries. Main b3baeec7845fa9d9dfaba28bead4b41001192efe unchanged; PR head8d4cf8ff78b9288375e9a737012ffa7ee6384d4d matches local tree53ae456a0b14c303e33c27a83dc7feedde2b431a. No overlapping writer observed. PR marked ready; no outstanding requested changes or branch rules require bypass.
- Actual two-snapshot v3 and Foundation39624968689 acceptance below remain valid; final head differs only in records. Fresh26Python tests pass. Fresh default-parallel Node suite1357/1358: unchanged Cashfree SIGINT cleanup fixture exceeded its10s process deadline (exit signal rather than130). No Cashfree implementation/test delta exists versus main; the concurrently run focused test repeated SIGINT timeout, and the full serial suite1357/1358 had zero assertions fail but cancelled a different transport fixture at15s. The serial SIGINT case passed. Precise local timing cause is not established. No test/timeouts or Cashfree behavior changed. Fresh hosted core job rerun119308091707 is requested on tested code2320826; only five documentation/register files differ through current head. Hold integration until fresh hosted result.
- Exact next action: inspect focused/serial tests, merge the exact checked head only after validation, and inspect resulting main Foundation/Cloudflare production checks. Main/provider integration is now requested; unrelated production SQL, key rotation, content ingestion, source deletion and provider cutover remain outside this task. After integration, PR292's final body owns exact merge/check/deployment receipts. A final documentation-only release receipt may follow; read authoritative PR/current main before repeating anything.


## Actual encrypted Vault recovery accepted; all hosted checks passed — 2026-10-21T15:30:55Z
- Owner explicitly delegated the remaining private recovery setup. Dedicated age identity generated outside Git, preserved in a private owner-downloadable kit independent of Supabase/Cloudflare/GitHub, retrieved separately, byte/public-recipient checked and used for a real synthetic age roundtrip. The same identity file configured MLOS_RECOVERY_AGE_IDENTITY; public MLOS_RECOVERY_AGE_RECIPIENT visibly verified. No private identity/value entered chat, Git or logs. Owner offline download remains recommended and not observed. Do not regenerate/rotate during routine continuation.
- Actual v3 workflow39624386430 PASSED on source e5584df91b6f92edd604a6b6a52c9ebc1283e289 / exact tree975c915807bf3719211b2de7008cba3e2de461d5. Snapshot supabase/2026/10/21/20261021T151857Z encrypted/uploaded/size-verified; checksums/source/freshness verified. Real PG17 synthetic Vault acceptance passed, original roles/schema/data/access restored, exact public ownership/grants/defaults matched. All69required public/all102COPY tables, Auth and FKs matched. Actual vaultReadable=true and vaultValuesMatched=true with encrypted-named-provisioning. Always-cleanup stopped disposable DB and removed private files.
- Records checkpoint232082653026ca9fc234ab2378f675538249a29b (tree813d89692fa0190a63cedf1789349c4f161ebb47) automatically reran the unchanged implementation. Actual workflow39624968454 also PASSED on fresh snapshot supabase/2026/10/21/20261021T152328Z: same69/102/Auth/FK/exact-access/Vault parity and cleanup. Foundation39624968689 PASSED all3jobs: core check/build/1358Node/five isolatedPGchecks, Chromium responsive Vault/drafts and WebKit iPad/navigation. Tested head232082653026ca9fc234ab2378f675538249a29b differs from implementatione5584df only in handoff records. Earlier Foundation39624386274 core passed but browser jobs were superseded/cancelled by this records update; no test failure implied.
- Export defect found only after configuration: first actual-key backup39623460079 failed before upload. Source aggregate query succeeded privately; official libpq source confirms PGDATABASE does not expand the URI as an explicit dbname does. Corrected to psql -d existing source URL, with SQLSTATE-only errors. Failing-then-passing boundary regression performs real age export/decrypt. All26Python and1358Node tests pass; full local check and portability13services/224locations pass. Independent focused review approved with no Critical/Important finding; optional note about skipping real-age regression when AGE_BIN absent is covered by hosted pinned-age execution.
- Scope remains task-branch database/Vault acceptance, not weekly default-branch integration or complete provider recovery. External Storage bytes, private Auth/OAuth/JWT/SMTP settings, API/Edge/runtime authorization, consistent cross-service snapshot and cutover remain unverified. Vault row UUIDs/timestamps regenerate; consumers currently resolve unique names. No production SQL changes, erased-content restoration, source deletion, merge/release or provider cutover performed.
- Completed requested key configuration and actual encrypted backup/restore acceptance. PR292 remains unmerged for review/integration; no owner configuration blocker remains. Final receipt-only commit uses [skip ci] to avoid redundant source-secret exports and superseding completed browser checks; no runtime/workflow/SQL behavior changes after tested code. Next: review/integrate this bounded recovery change through the normal release process; separately plan provider/runtime gaps above. Do not repeat setup, restore erased content or claim full provider failover. Implementation ownership releases at this saved checkpoint; no custom mutating background jobs retained.


## Actual encrypted export connection defect corrected; fresh hosted acceptance next — 2026-10-21T15:17:00Z
- Configured-key manual backup39623460079 on b7507144dd1a97b0daff43375db0da8ae5b69db0 failed vault_export_failed before any upload. Existing privilege audit passed. A read-only server-side probe executed the exact aggregate query privately without returning its payload; source query succeeded. Official PostgreSQL18 startup/libpq source confirms explicit dbname connection strings expand before PGDATABASE defaults, so assigning a full URI only to PGDATABASE did not select the requested server.
- Corrected exporter to pass the existing SUPABASE_DB_URL explicitly through psql -d, matching working dump/audit connections; added SQLSTATE-only verbosity/diagnostics without stderr, URI or private values. New boundary regression exercised actual age export/decrypt and failed before the correction, then passed. All26Python tests and1358Node tests now pass; syntax/check still running at this checkpoint. Independent focused code review pending.
- Next: save code, dispatch fresh task-branch backup and isolated restore, then require actual v3/Vault/data/Auth/FK/access success plus cleanup. Key settings and separately saved/retrieved recovery kit remain valid; do not rotate or overwrite them. This defect did not expose any key/value, create an archive or change production data. Keep PR292 draft until actual acceptance.

## Owner-delegated recovery-key configuration completed; actual v3 acceptance pending — 2026-10-21T15:09:17Z
- Owner explicitly granted full authority to finish the remaining key setup and recovery test. Codex resumes the same task branch test/full-platform-replay-20261021 / draft PR292; remote main b3baeec7845fa9d9dfaba28bead4b41001192efe and branch d6ae810b3ad5b8129ac664062039237c1b819740 verified unchanged. No competing task writer observed.
- Generated a dedicated age1.3.2 recovery identity outside the repository. Preserved a private owner-downloadable recovery kit independently of Supabase/Cloudflare/GitHub; independently retrieved that saved copy, verified exact bytes/public recipient and an actual synthetic age encryption/decryption roundtrip. No private identity entered chat, Git or logs. Owner download/offline retention is recommended and has not been observed.
- Configured this repository's MLOS_RECOVERY_AGE_IDENTITY Actions secret and public MLOS_RECOVERY_AGE_RECIPIENT Actions variable. GitHub visibly confirmed the secret addition and public variable value. Existing source DB/R2 access is unchanged; no provider key extraction or production SQL performed.
- Exact next action: manually dispatch the existing backup workflow on this task branch (v3 code), require fresh encrypted archive success, then dispatch the isolated restore workflow on this branch and require actual Vault/data/Auth/FK/access parity plus cleanup. Verified implementation code remains12cbafe87cde162872370e29d2aa9d613ffbda62 (treefd09fa0efafec8d0c679c096221dcde76c744301). Do not treat configuration or synthetic retained-key acceptance as actual-secret recovery. Keep PR draft pending real v3 result; no merge/release/cutover authorized by this step.







## Recovery implementation verified; owner key setup is the remaining gate — 2026-10-21T14:51:05Z
- Draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292; task branch test/full-platform-replay-20261021. Actual tested remote code12cbafe87cde162872370e29d2aa9d613ffbda62 / treefd09fa0efafec8d0c679c096221dcde76c744301 matches local source. Foundation39619055184 passed all3jobs:1358Node tests/build/5PostgreSQL checks, Chromium and WebKit. Busy-search regression, Vault personal-note flow and draft/conflict recovery pass on hosted phone/tablet/desktop; no UI change after that tested code.
- Corrected real restore39619055185 created/verified fresh v2 snapshot supabase/2026/10/21/20261021T144629Z. On disconnected disposable PG17 with cron disabled, synthetic Vault acceptance PASSED at14:50:56Z: real age encryption, supported target-key Vault provisioning, exact adversarial values/empty descriptions and overwrite rejection. This resolves the earlier NULL-description fixture failure. Source roles/schema/data/access then restored successfully; all69required public and102COPY tables matched, Auth/FKs passed and exact public owners/grants/defaults matched. Final strict gate failed vault_backup_coverage_missing because actual archive remains v2 without configured owner recipient. Cleanup stopped the target and removed private files. This proves the mechanism and data/access checks; it does not prove actual-secret recovery.
- Final25Python tests pass, including wrong-key/tamper/source/snapshot/isolation and actual workflow archive gate cases. Local syntax/catalog/decision/portability(13services,224locations),96-file build and diff checks pass. One extra local parallel Node run hit2unchanged Cashfree mock-startup failures; all8focused Cashfree cases and hosted standard1358suite pass. No unrelated Cashfree change. Independent final security/correctness review found no Critical/Important finding, including the supported API correction and controlled SQLSTATE diagnostics.
- Implementation complete; private configuration/acceptance remains blocked. Exact owner step: generate and independently retain a dedicated age identity, add its public MLOS_RECOVERY_AGE_RECIPIENT as an Actions variable and private MLOS_RECOVERY_AGE_IDENTITY as an Actions secret, following ops/r2-backups/VAULT_RECOVERY_SETUP.md. Never send the private identity in chat/Git. Then create a fresh v3 snapshot, rerun the complete actual-secret drill and verify recovery with the independently retained owner key. No owner key generated/configured/retained or actual Vault values exported in this session. Keep PR draft; no automatic merge or full recovery claim.
- After keys are configured, resume this same branch, inspect authoritative PR receipts/current remote head and run actual v3 acceptance; do not repeat finished browser/ACL repairs or weaken missing-Vault gates. Other gaps remain external Storage bytes, Auth/OAuth/JWT/SMTP configuration, runtime/provider acceptance and consistent cross-service snapshot/cutover. No production SQL, erased-content restoration, merge/release or provider cutover performed. No custom mutating background jobs retained; normal validation workflows completed. Codex implementation ownership releases at this saved checkpoint pending owner configuration.

## Hosted browser fix passed; Vault API fixture corrected — 2026-10-21
- Active draft PR292 / test/full-platform-replay-20261021. Saved code a130eb5560efaac5ea585f05911e008e343a354c has exact tree81aeea3f81cab84fe6f733c41dedf29f7dc95186. Foundation39616464168 core passed1358Node tests, syntax/build and5isolated PostgreSQL checks; hosted Chromium passed the held-search regression, full Vault flow and draft/conflict checks. Hosted WebKit also passed; all3Foundation jobs are green on this code. No release/merge/production SQL performed.
- Extra local default-parallel full suite had1356/1358 pass: unchanged Cashfree mock-preview startup failed in success and startup_exit scenarios. Focused all8Cashfree cleanup cases pass; hosted standard full suite1358/1358 passes. No unrelated Cashfree change made. Local96-file build, full syntax/decision/portability(13services,224locations) and prior23Python tests pass.
- Hosted restore39616464141 created/verified snapshot supabase/2026/10/21/20261021T142854Z, then synthetic Vault fixture failed before source restoration. Cleanup passed. Generic error suppression initially hid the stage. Investigation found synthetic description=None contradicts Vault description NOT NULL/default-empty contract, confirmed by official Vault SQL and read-only live column metadata (no values). Corrected fixture to empty description and validator to require text. No value-comparison relaxation. Added safe controlled-stage/SQLSTATE-only diagnostics with verbose SQLSTATE mode; never print stderr, SQL or values. Two new tests fail first then pass; all25Python tests pass. Actual fixed fixture rerun is still pending; do not claim real Vault provisioning succeeded yet.
- Exact next action: save correction, inspect latest hosted synthetic fixture and actual data/access stage, fix evidence-backed failures, then record authoritative PR receipt. Actual-secret v3 acceptance remains blocked on owner-held offline age identity, public MLOS_RECOVERY_AGE_RECIPIENT variable and private MLOS_RECOVERY_AGE_IDENTITY secret. Setup guide is ready; no owner key created/configured/retained and no plaintext-secret backup. Do not merge incomplete recovery or restore erased material. No custom mutating background jobs retained.

## Remaining recovery work resumed: encrypted Vault path and browser race — 2026-10-21
- Owner requested remaining work and Resume. Codex continues test/full-platform-replay-20261021 / draft PR292. Remote main remains b3baeec7845fa9d9dfaba28bead4b41001192efe; prior remote checkpoint d9ce89ac065e02de1a2f7d136e9165cff0be5809 has local tree parity. No competing writer/overlapping PR observed. The existing restore results (69public/102COPY, Auth/FKs/exact public access) remain partial evidence, not full recovery.
- Investigated actual Foundation39606902985 Chromium failure at vault-browser-check.js:92. A pending search left stale catalog buttons enabled while the handler discarded busy clicks. New executable Node VM regressions failed first, then pass after concept/Search/Clear controls use native disabled while busy. Hosted browser scenario now holds the search response and verifies disabled controls before releasing the queued click. Local Chromium installation failed corrupted/503 downloads; no browser pass claimed. Full1358Node tests pass. No draft-storage behavior changed.
- Confirmed source Vault configuration exists using read-only aggregate metadata; no values retrieved into this session. Official Vault docs confirm root key separation. Added optional pinned-age encrypted export/v3 archive and supported target-key named provisioning, with private subprocess errors suppressed, strict source/snapshot/format checks, fixed disconnected target/cron checks, empty-target guard and transactional exact-value comparison. Private identity is step-scoped after archive SQL; no plaintext Vault files, source writes/root-key changes or key generation/configuration performed. Missing recipient retains v2 backups and strict incomplete-recovery result. Owner setup/acceptance is in ops/r2-backups/VAULT_RECOVERY_SETUP.md; ADR124 records regenerated Vault UUID/timestamp and separate-snapshot limits.
- Tests-first:5initial Vault tests failed before the helper existed; all8Vault tests now pass, including actual age1.3.2 roundtrip/wrong-key/tampering tests. All23Python backup/recovery tests pass, including actual workflow archive gate fixtures for v2/v3, mismatched format, modified inner file and unexpected member. Synthetic real PG17 Vault/API/null-description/adversarial-value acceptance is wired before source restore with a temporary test key and fixture-only cleanup; hosted execution still pending. Independent security/correctness review found no Critical/Important findings in recovery and UI changes. Portability baseline intentionally adds3reviewed paths (13services,224locations); final checker/hosted results pending.
- Exact next action: save this checkpoint on PR292, inspect the fresh hosted core/browser/WebKit and isolated synthetic Vault drill, fix actual failures, and record receipts. Actual production-secret v3 acceptance remains blocked until the owner independently retains an age identity and configures MLOS_RECOVERY_AGE_RECIPIENT variable plus MLOS_RECOVERY_AGE_IDENTITY secret. Never paste the private identity into chat/Git or silently accept an empty Vault. Keep PR draft until actual recovery gates pass; no merge/production release or provider cutover performed. No custom mutating background jobs retained.

## Real restore data/access verified; Vault recovery blocked — 2026-10-21T13:23:20Z
- Draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292; task branch test/full-platform-replay-20261021. Tested hosted source637807749bc9f9cb0dcbb91312740ecaea046a6b, exact local/remote tree0f76450cdb08d5a43a3de0708f82a697e28d096f. This result supersedes pending validation below. PR remains draft; do not merge or call full recovery complete.
- Real workflow39606903113 created and verified fresh private v2 R2 snapshot supabase/2026/10/21/20261021T131907Z (attempt1), using read-only production dumps/catalog export and the existing quota guard. Disposable PG17 restore disconnected all Docker networks and disabled cron before executing archive SQL. Original roles/schema/data and exact source access manifest restored successfully. Public69-table privilege/RLS audit passed; source/restored public owners, table/column/function/sequence grants and defaults matched exactly.
- Actual data verifier matched all69required public application tables and all102dumped COPY tables byte-sensitively ignoring row order, including Auth users/identities/sessions; public/Auth/Storage FK orphan checks passed. Then strict gate failed exactly vault_backup_coverage_missing because standard CLI dumps exclude Vault. Always-cleanup stopped the database and removed private files. No private values, rows, fingerprints or dumps published. This is verified partial recovery, not full recovery/provider failover.
- Final local1356Node tests,12Python tests, access-manifest PostgreSQL roundtrip, syntax/catalog/decision/portability checks (13services,221locations), workflow parsing and diff check pass. Hosted Foundation39606902985 core check passed including build and all5isolated PostgreSQL checks; browser/WebKit jobs were pending at this checkpoint. Independent review, including final private metadata comparison and safe progress flags, found no Critical/Important findings.
- Exact next dependency: choose a private Vault recovery strategy with an independently recoverable encryption recipient/key, or explicitly adopt and test replacement credential provisioning. No such recipient/key or approved replacement-credential source is available in this session. Do not silently accept empty Vault, copy plaintext secrets into current archives, reuse production credentials on a connected target, or fabricate fixtures. README records this boundary and source monitoring-setting names. External Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge parity, consistent cross-service snapshot and provider failover remain unverified. Final PR receipt is authoritative for hosted status. No production SQL applied, erased content restored, provider cutover or custom mutating background jobs retained.

## Real PG17 restore: access repair under validation — 2026-10-21
- Active branch test/full-platform-replay-20261021; draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292, based on merged PR290. This checkpoint supersedes the pending-run statements below. No production SQL, erased content restoration or provider cutover performed.
- Foundation39603974093 passed all hosted jobs on initial PR head bf55796c420668159a1cd96ecb393fec98fda730. Real restore39603974776 loaded the post-reset 20261018T000512Z backup into disconnected disposable Supabase PG17, with cron launch disabled and real pgcrypto verified. Original roles/schema/data restoration succeeded; the subsequent69-table permission audit failed because destination platform grants remained. Cleanup passed. This is an actual recovery defect, not a successful full restore.
- Added a read-only source catalog exporter for exact public owners, table/column/function/sequence grants and default privileges. v2 private R2 backup adds access.sql, checks stable access metadata before/after dump, and restores it only in the isolated transaction. Same-repository owner-authored PR validation calls the existing backup producer to create a fresh compatible snapshot using existing secrets and quota guard. No decrypted Vault export is added.
- Tests-first synthetic PostgreSQL roundtrip reproduces unsafe destination grants and verifies source access, future-object defaults and idempotence. Independent re-review found no Critical/Important findings. Twelve Python tests and focused workflow contracts pass; final full checks and hosted v2 restore remain pending at this checkpoint. Portability register adds two exact source/check paths (13services,221locations).
- Confirmed current CLI excludes Vault from standard data dumps. Strict coverage/decryption gate remains: do not label even a successful ACL/data stage full recovery. Next: inspect PR292's v2 snapshot/restore, repair any actual failures, and record exact stage results in the PR receipt. If Vault remains the blocker, retain draft status and document a bounded private configuration/key recovery strategy; do not fabricate secrets or export plaintext without explicit scope. External Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge runtime parity, fresh-install replay and provider failover remain separate gaps. No custom mutating background jobs retained.

## Full logical database restore probe — 2026-10-21T12:55:20+00:00
- Owner requested the next remaining restore task after PR290 merged as b3baeec7845fa9d9dfaba28bead4b41001192efe. Codex owns test/full-platform-replay-20261021 from that main commit. No competing task found. No remote paid project, production reset, data migration or clinical publication is authorized/performed.
- Local sandbox has no Docker and no process capabilities; normal package installation cannot provide a supported local database. Chose the existing disposable GitHub Supabase restore workflow with pinned CLI 2.121.0/real PG17. Its source SQL executes only after Docker network disconnection and cron-launch disablement checks. Existing private R2 download credentials stay in the download step; no live DB URL is supplied. Latest post-reset archive/checksum/nine-day gates remain.
- Blank historic replay is not equivalent to current recovery: source contains a visual-profile registration for erased material, a one-time rabies correction requiring erased catalog state and a cron repair before its source job creator. These are source-inspection findings; do not seed erased content or silently skip/shim SQL. Current recovery uses the original post-reset logical dump instead.
- Replaced the former four-table comparison with all required public tables plus every dumped COPY block, Auth users/identities/sessions coverage, public/Auth/Storage FK orphan checks, Vault readability and cron recheck. Private rows, fingerprints, decrypted values and logs/dumps are never uploaded. Owner-authored same-repository PR validation only; fork/non-owner jobs are gated out. Registered the single added Supabase helper boundary: 13 services, 219 locations.
- Verification so far: four new unit cases failed first, then passed; all 12 Python backup/verifier tests pass. Real PGlite FK probe accepts valid references and rejects replica-loaded orphan rows. YAML parses and current CLI help verified. Independent security/correctness review found no Critical/Important findings. Initial full Node run had 1355/1356 pass: the old four-table workflow assertion failed after intentional scope expansion. Updated it to verify helper/audit wiring, pre-SQL network/cron enforcement and owner-only credentialed PR guards; full Node/check rerun remains pending. Vault coverage/decryption is required, not merely a successful empty query. The real latest-backup restore has NOT run for this change yet; no recovery success claimed.
- Exact next action: finish local tests/review, save the task branch and open its PR, execute/inspect the credential-scoped disposable restore job, resolve actual compatibility failures, and record the actual snapshot/check results in its PR receipt. Full logical restore does not prove external Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge runtime parity, fresh-install migration replay or zero-RPO cutover. Preserve these limits in the final handoff. No custom mutating background jobs retained outside the authorized runner.

## Database recovery prerequisite resumed — 2026-10-21T12:26:30+00:00
- Owner requested the next portability step after PR291 merged as 093be39c62427bd51920ea83a2fc7a68e97a6d63. Codex resumes PR290 on fix/explicit-data-api-grants-20261021, original remote head 3a9854cef61766e9a05afd4edc6b543c4adae80c. No overlapping writer/review found. Latest main is merged into the task branch; both continuity-document conflicts preserve both workstreams. This source integration does not authorize a live provider migration or database reset.
- Reviewed PR290's five hash-pinned recovered baseline SQL files, 14-table service SELECT-only forward migration, 69-table ACL replay, baseline learner-isolation checks and CI additions. Their SQL/check implementations remain byte-identical to the existing PR. Reviewed and registered exactly nine additional Supabase source/check paths in the portability baseline (13 services, 218 locations); service inventory now links the recovered-baseline evidence and remaining gaps.
- Fresh verification: 1356/1356 Node tests pass with zero failures/cancellations. Four isolated PostgreSQL checks pass: recovered baseline, 69-table ACL, privacy/erasure and question intelligence. Portability check and diff whitespace check pass. npm run check, check:portability, the 96-file static build and diff whitespace check pass. Independent read-only review found no Critical/Important findings and independently passed the five hash tests, baseline/ACL database checks and portability check.
- Full unmodified migration replay was retried with a minimal platform fixture: 19 files apply, then 20260927114500_policy_experiment_framework.sql fails with PostgreSQL 42883 because extensions.digest(text, unknown) is missing. No SQL was skipped or shimmed. This remains partial fixture validation, not full Supabase platform/Auth/Storage/PostgREST restoration or target-provider migration acceptance.
- Exact next action: finish local checks/review, save this resolved integration to PR290 without force-pushing, inspect latest hosted CI, then integrate the verified head into main. Record actual commit/CI/merge results in https://github.com/mdmoazzam291/Medical_Learning_OS/pull/290; its merged status closes this prerequisite and must be checked before repeating work. Do not apply recovered history to production or restore erased content. Full compatible-platform recovery testing remains the subsequent operational step. No production SQL, learner records, provider settings or clinical content changed; no custom mutating background jobs retained.

## Service portability integration authorized — 2026-10-21T12:08:29+00:00
- Owner requested completion of the pending task on 21 October 2026. Codex resumes PR291 on feat/service-portability-20261021, base be9ee2655e2aee081e136308707baee9b746e2dd. This supersedes the earlier instruction to retain PR291 pending integration authorization; it does not authorize unrelated PRs, live data migration or provider changes.
- Re-read repository instructions and current remote main/open PRs; main is unchanged and PR291 is mergeable with no submitted reviews or unresolved review threads. Local source tree 027699f1f4902d8eaf286b91dcfd9dcd1fbd2815 exactly matches remote head 94efcdc0a3a2595c4dd4e7abd367ffe9c3925b7f before this records-only checkpoint.
- Fresh sequential npm test passed all 1351 tests with zero failures/cancellations. Hosted Foundation run 39596512393 core check passed, including build, tests and isolated PostgreSQL checks; Cloudflare preview succeeded. Chromium and iPad WebKit jobs were still running at this checkpoint. Fresh local npm run check, check:portability, 96-file build and git diff --check also passed. This checkpoint changes only these two continuity documents.
- Exact next action: finish local checks, inspect the latest PR291 hosted checks and resolve genuine blockers, then merge the verified head into main. Record actual CI/merge results in the PR body at https://github.com/mdmoazzam291/Medical_Learning_OS/pull/291. That live PR status is authoritative: if merged successfully, this integration task is complete and must not be repeated. Do not start unrelated pending PRs or migration work merely because they exist.
- Scope remains the 13-service register, 209-location coupling guard, offline export-integrity utility and future contributor rules. Existing provider coupling, full-platform restore, independent backup and actual target-provider acceptance remain documented operational gaps. Checksum verification does not establish migration readiness. No custom mutating background jobs are retained; ownership releases after verified merge/receipt.

## Service portability foundation verified — 2026-10-21 (Asia/Kolkata)
- Owner request implemented on feature branch feat/service-portability-20261021; PR291: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/291. Writer Codex. Base be9ee2655e2aee081e136308707baee9b746e2dd; remote code commit 36d5e2becff778ae450da53260ae7fa24d928e56, exact tested tree d55bb073de63abaec5a09a6476ef60f4e1623aa1 (identical to local checkpoint 3faf3895e622342a458e43f3060aa66431c9e878). Records-only follow-up does not change tested runtime/tool code.
- Implemented 13-service source-evidenced register and 209-location registered-coupling guard in npm run check; offline streaming SHA-256 migration pack seal/verify; migration/cutover/rollback runbook; AGENTS/Claude/Gemini inherited future integration rules and PR checklist. Existing provider adapters remain; no provider subscription, live export, migration, credential/configuration/DNS change, production release or clinical publication performed.
- Verification: 1351/1351 Node tests pass in final sequential full run; 15 focused tests pass; npm run check, check:portability and 96-file static build pass. CLI verifies nested synthetic binary export, refuses altered bytes, and git ignores its private directory. Independent read-only review caught array-ID coercion; regression failed first, then strict string validation and all tests passed. No further important findings.
- Preserve failure history: first full run alongside syntax checks had 1348 pass, one Cashfree cleanup success failure and one transport timeout cancellation; focused repeat alongside checks timed out at SIGINT. Final full run without competing syntax workload passed every existing Cashfree scenario; their implementation/tests were unchanged. These are observed scheduling-sensitive test results, not a provider API failure.
- Limits: marker guard does not detect every unknown/computed dependency; review still required. Integrity does not establish completeness, authenticity or restore readiness. Full current platform restore, independent backup location and cross-provider Auth remain pending operational work. PR290 baseline/grants recovery is separate; verify its state before any real migration and preserve permanent erasure exclusions.
- Exact next action: inspect latest PR291 CI, reconcile any newer-main conflicts and retain as an unmerged feature PR pending integration/release authorization. Do not migrate data or merge unrelated PRs. Checkpoint above supersedes the pending verification entry below. No custom mutating background jobs retained; task ownership released after final remote receipt verification.

## Service portability foundation checkpoint — 2026-10-21T11:58:51.236644+00:00
- Owner requested current/future replaceable services; writer Codex; branch feat/service-portability-20261021; base be9ee2655e2aee081e136308707baee9b746e2dd. Source-only feature, no live migration/configuration/credential/content changes. PR290 baseline/grants work is separate and unmerged at inspection.
- Added 13-service source-evidenced register, 209-location coupling baseline, CI-integrated portability checks, private streaming checksum-pack tooling, migration runbook and standing contributor/PR rules. Local exports are ignored; no real provider export or independent backup created.
- Verification so far: 14 focused portability/pack tests pass; CLI nested binary seal/verify succeeds, modified file fails as required and git ignores the pack. Baseline full suite passed. First changed full run: 1350 tests, 1348 pass, 1 failure and 1 cancellation in existing Cashfree descendant-cleanup success/transport timing tests while syntax checks ran concurrently. Focused Cashfree repeat/full rerun, syntax/build and independent review are pending; do not claim all green yet.
- Exact next action: finish sequential verification and read-only review, address portability findings, update checkpoint with actual code commit and PR, verify remote head. Keep this on a feature PR; no automatic merge or production release. Full platform restore/Auth migration remain unverified operational work.
## Exact historical baseline recovered — 2026-10-21
- Supersedes the missing-baseline limitation below. Owner requested continuation; writer Codex; branch fix/explicit-data-api-grants-20261021, PR290. Code 198da55eb1728bf2902d2b63ca212c1c3b46c03a, based on prior PR head d0977a9d30809cc7b5ebccc9ffac5e8cb7aa6783; main base be9ee2655e2aee081e136308707baee9b746e2dd. No competing task observed.
- Recovered five original 20260925 migration bodies directly from provider history; all five local contents exactly equal their recorded single statements, including trailing newlines. SHA-256 tests pin the original bytes. No inferred historic SQL, secrets, real identities or clinical content added.
- The isolated baseline check executes all five actual files against a minimal Auth fixture. It verifies the empty initial catalog, service RPCs, stale-catalog rejection, answer idempotency, session completion, two-learner RLS reads and browser RPC/write/read denials. CI includes this check. ACL replay now derives baseline grants from recovered files rather than invented fixtures.
- Four of the initial 18 missing source read grants were present in the recovered baseline; the unapplied forward migration now grants service SELECT on the remaining 14 only. Existing browser permissions, service writes, function/default settings and applied historical bodies remain unchanged.
- Verification: 1341/1341 Node tests, syntax/decision checks, 96-file build, baseline/ACL/privacy/question-intelligence isolated PostgreSQL checks and diff whitespace checks pass. Previous PR head passed core CI and preview build; browser/WebKit were still running when checked. New head requires its own CI. No production migration, account/learner mutation or reset performed.
- Broader unmodified migration replay attempted in disposable PGlite: 19 files applied, then policy_experiment_framework (20260927114500) failed with 42883 because extensions.digest(text,text) from pgcrypto is unavailable. No source SQL bypass or digest shim was used. This is a platform-fixture limit; complete Supabase schema/extension/cron/Vault replay and end-to-end PostgREST remain unverified.
- Exact next action: inspect updated PR290 CI/review, integrate through the approved release process, and run the full source chain in a disposable Supabase-compatible environment with actual required extensions/platform schemas. Do not replay recovered historical versions on production, reset it or restore erased content. Implementation saved; integration and full-platform rebuild acceptance remain pending. No custom mutating background jobs retained.


## Explicit Data API server-read grants prepared — 2026-10-21T04:22:59.246558+00:00
- Owner requested the next step after the Supabase automatic-grants notice. Writer Codex; branch fix/explicit-data-api-grants-20261021; base be9ee2655e2aee081e136308707baee9b746e2dd; tested code fa43fd2b3b5011e3e2498f8fb666a57dc8d222b7; tree 30369faa1988fbd6f72cd05abf383a45e5a282e9. PR290: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/290. No overlapping grants task observed.
- ACL replay without automatic grants reproduced 18 missing service SELECT grants. CLI-created forward migration 20261021041935 adds SELECT only; no browser grants, service writes, RLS/function/default changes, historical rewrites or content changes. The real repair executes twice in lexical order over 69 data-free table shapes. Before/after checks preserve browser CRUD, service writes and RLS. Missing-read, browser-exposure/write, disabled-RLS and future-table negative controls pass.
- Verification: 1336/1336 Node tests; syntax/decision checks; 96-file build; new ACL regression and both existing isolated PostgreSQL checks pass. Read-only live catalog audit passes without reading learner rows. Security advisor informational no-policy notices remain consistent with server-only access; unrelated provider warnings are outside this patch. Hosted CI is pending.
- Limit: ACL/RLS statements are extracted from conventional explicit schema-qualified SQL; this is not a full schema rebuild, function/sequence/view permission audit, row-isolation acceptance or PostgREST end-to-end test. Five original baseline migration bodies remain absent; recover and review their exact SQL before a disposable full-schema replay. Never reset production or restore erased content.
- Source code is saved through the authorized GitHub connector and its tree matches local tested code; shell git push lacks credentials. No production migration or release performed: existing live read grants already satisfy the audit. No custom mutating background jobs retained.
- Exact next action: inspect PR290 checks/review; integrate through the approved release process and record migration history if applied. Then recover/review the missing baseline and verify a disposable complete rebuild, independently of production. Codex task implementation is complete; integration remains pending, with this handoff available for the next agent.


## Privacy relation-discovery repair applied — 2026-10-20T13:18:13.124785+00:00
- Owner-requested engineering repair is implemented and applied. PR289: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/289; writer Codex; branch fix/privacy-scope-views-20261020; base1df61bfd68252f924d7d28618799963d499e9cbc. Tested SQL/code commit1bb0a17f7591b073153dc3cbb5e06adb87a542cf; final branch head also aligns the source filename with the provider-recorded migration version20261020131627, without changing SQL bytes. This supersedes the pending application checkpoint below.
- Applied privacy_scope_stored_relations and read back the exact tested scope-function body; v10 contract validation passes and service-only permissions remain. The preview and erasure function bodies match their existing source. Read-only preview used a verified absent synthetic identity; no real account erasure or Auth/content/learner-data mutation performed. Disposable two-learner erasure acceptance is in the PostgreSQL regression.
- Verification:1336/1336Node tests, syntax/decision checks,96-file build, both isolated PostgreSQL checks and independent read-only review pass. Core hosted CI also passed the new database step on the tested SQL. The final filename/records update requires its own CI; no runtime/UI/dependency change is added. Hosted browser/WebKit jobs were still running at this checkpoint.
- Public changes contain only generic engineering code/tests and this bounded release receipt; no separate operational report or private findings. Source migration name/version now matches the applied ledger entry, avoiding a new CLI history mismatch.
- Exact next action: inspect final PR289 CI and merge only after required checks succeed; record final merge/check status in PR289 body so later agents can verify it directly. Function repair is already applied; do not apply it again or erase a real account for testing. Ownership remains with this task until integration is recorded; no custom mutating background jobs retained.

## Privacy relation-discovery repair checkpoint — 2026-10-20T13:11:58.533043+00:00
- Owner requested the next engineering priority: privacy-check repair. Writer Codex; branch fix/privacy-scope-views-20261020; base main1df61bfd68252f924d7d28618799963d499e9cbc; remote code 1bb0a17f7591b073153dc3cbb5e06adb87a542cf. No competing repair PR observed.
- CLI-generated migration20261020130859 replaces only the scope discovery CTE: stored table/partitioned/foreign/materialized relations count; ordinary views do not. Exact v10 mapping, result contract and service-only grants are preserved. Preview/erase implementations, content, Auth and learner records are unchanged by the migration.
- Tests-first isolated PostgreSQL regression failed at ordinary-view completeness, then passed after the migration. Database checks cover new table/partitioned/materialized/foreign failures, a view replacing a missing expected table, dropped columns, fail-closed data preservation, real erasure for one synthetic learner through service_role with the second unchanged, append-only/receipt guards and browser-role denials. Existing question-intelligence DB check also passes. Fixtures are intentionally minimal, not a full FK/Auth lifecycle simulation.
- Fresh verification:1336/1336Node tests, npm run check,96-file build, both isolated PGlite checks and git diff --check pass. CI adds the privacy DB step using the existing pinned PGlite installation; no product dependency or UI change. Independent read-only review found no actionable defects and reran the PostgreSQL check successfully.
- PR289: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/289. Remote code tree exactly matches the tested local code tree. This branch contains focused generic code/tests/docs only; no other task report, private inventory or secrets copied. Shell git had no write credentials; the authorized GitHub connector saved the same tree. Production application and hosted CI remain pending at this checkpoint. Next: inspect CI, apply only the reviewed function repair, verify it read-only, and record the actual release; never test erasure on a real account.

## Combined public information link released — 2026-10-20T11:50:59.295235+00:00
- PR286 merged as969268c86a5b78a650e1614023e1c282f4670eab; final tested feature720d18f12adcea73dd818418b1c1cadcf4343d52, treec5f07d4a4cd07a6ed1ef3f7feeb5e32962d20e98. Owner approved combining the3section menu links into1Explore Medretica entry and keeping Preferences separately. This supersedes pending checkpoints below.
- Public dropdown contains exactly Explore Medretica and Preferences; desktop inline information nav has1entry. Explore uses allowlisted /web/services.html with no fragment, reaches hosted canonical /web/services and opens the combined information page from the top. All3section IDs/deep links and all Services content remain unchanged. Account form/runtime/benefits/preview files, theme/auth controls and authenticated masters are unchanged.
- Independent review caught preview-only404 when using clean /web/services in npm start. Fixed with the existing .html href rather than widening server routing; added an actual documented-preview browser click covering the rendered link, page heading, closed menu and return Home. Re-review reproduced HTTP200 and found no remaining actionable findings;27focused Node tests passed independently.
- Verification:1336Node tests; syntax/decision checks;96-file build;125focused Chromium responsive/theme/destination cases and6actual-preview/homepage/script/registration combinations passed. Hosted Foundation39416313660 check/browser/WebKit all passed on final feature head, including broad172nested navigation leaves and iPad layouts. Production web build succeeded.
- Live browser loaded preserved #how-it-works, showed only2menu entries, clicked Explore, observed canonical https://medretica.com/web/services with no hash and closed menu, then reopened it and visually verified both labels. Production navigation-view.js returned200 and exactly matched tested bytes. No real auth submitted or backend/provider/content/learner-data mutation; no project dependency added.
- Runtime task complete. Records-only receipt branch docs/combined-public-link-release; ownership released when receipt saved, no custom mutating jobs retained. No remaining implementation work for this request.


## Combined information link preview compatibility — 2026-10-20T11:37:21.479517+00:00
- PR286 initial coded2ab6ae269a4c9bf23dcebdd65ecb0b514f0f575; independent review caught preview-only404 for clean /web/services because npm start admits exact allowlisted paths. Resolved with existing /web/services.html href, no fragment. Hosted canonical URL remains /web/services. No preview-server changes needed.
- Added an actual npm start browser click to public-home-browser-check.js: Explore opens the combined page, closes menu, and returns Home across supported JS viewport cases. The existing hosted-style check covers canonical redirect and preserved section anchors. Exact-href regression failed before fix and passes afterward.
- Final local1336Node/check/96-file build,125focused browser cases and6actual-preview/homepage/script/registration cases pass. Independent re-review reproduced HTTP200 for the rendered href and found no remaining actionable issues, with27focused Node tests independently passing. Hosted checks must rerun on this follow-up head before publication. Protected Account and services content files remain unchanged. Next: wait latest CI, merge after green, verify live2entry menu and canonical destination, then save release receipt.


## Consolidate public information links — 2026-10-20T11:33:19.938755+00:00
- Owner approved the read-only audit recommendation: replace Explore/How it works/About header/menu entries with one Explore Medretica destination, keeping Preferences separately. Writer Codex; branch fix/consolidate-public-information-link; base0642387bbd797cbcb4b8f390f4a50c91bdf0521b. No overlapping writer observed.
- Public information link now uses canonical /web/services without a fragment, opening the combined page from the top. Dropdown contains exactly Explore Medretica and Preferences; desktop inline public nav contains one information link. Services content, all3section IDs and old deep links remain; authenticated navigation, auth actions/theme control and protected Account content/runtime files are unchanged.
- Tests-first reproduced the old3entry menu in2failing cases; focused regression now passes.1336/1336Node tests, npm run check,96-file build and125focused Chromium responsive/palette/appearance/click/destination cases pass. Test coverage verifies exact menu entries, responsive inline-link visibility, clicking Explore reaches combined page with no hash and closes menu, plus all prior section deep links. One initial browser assertion wrongly counted hidden inline links on phones; corrected to test responsive visibility, no product fix was required.
- Current code commit resolves to feature branch head; not published. Next: independent review, hosted Chromium/WebKit checks, merge after green, verify live menu and save release receipt. No provider/backend/content/learner-data mutation or dependency change.


## Account public header released and audited — 2026-10-20T10:11:17.447640+00:00
- PR284 merged as6cf629885f79b45e8ac1f1872dd8606da311a471; tested featured616ccb80f4398457ca88789ef0c75a267dc5029, tree19655b2504d4e872d2a13f99344793a56017cabf. Owner requested correcting masters on default sign-in and auditing recent changes; this supersedes Account-header exclusion while preserving Account content. The pending checkpoint below is historical.
- Root cause was the explicit Account exception in isPublicGuestNavigation. All signed-out routes now use public navigation. Account has no Home/Study/Library/Exams master buttons, workspace search, private-tools menus, or redundant header auth shortcuts. It retains public product links, theme toggle and public Preferences. Signed-in learner/admin navigation is unchanged.
- Protected Account files account.html/account.js/account-landing.js/css are byte-identical to basec14ff201. Form, Google/email hooks, recovery, Keep me signed in, benefits, module list and marketing preview remain. New regression proves guest Account/create/callback routes use public header; obsolete original-header hashes were replaced with four protected-content hashes.
- Verification:1335Node tests; syntax/decision checks;96-file build. Local Chromium120responsive/theme/Account/create/menu/destination cases,6homepage/script/registration cases,21guest/auth-return cases,27policy cases, and broad172nested-leaf navigation/persistence suite passed. Hosted Foundation39404693596 check/browser/WebKit all passed; WebKit includes iPad portrait/landscape/split. Independent read-only review found no actionable defects and independently passed67focused Node tests. No other functional bug was reproduced in the audited guest/menu/return flows; this is bounded verification, not a claim of exhaustive absence of bugs.
- Production web build succeeded. Live clean /web/account was observed before release with masters and after release with Public navigation, no workspace search, and the unchanged sign-in content. Both changed runtime assets navigation-view.js and navigation.css returned200 and exactly matched tested bytes after deployment. Initial fetch overlapped deployment and served old files; final fetch matched. No real auth submitted, email sent, backend/provider/content/learner-data mutation or new dependency.
- Runtime task complete. Records-only receipt branch docs/account-public-header-release. Ownership released when receipt saved; no custom mutating jobs retained. No remaining work for this request; further changes need a new owner request.


## Account public-header correction — 2026-10-20T09:58:53.833458+00:00
- Owner reports master navigation on default sign-in page and requests a bug audit. This supersedes the earlier instruction to exclude Account's shared header; only the header changes. Preserve account.html/account.js/account-landing.js/css exactly. Writer Codex; branch fix/account-public-navigation-20261020, basec14ff201c81dcd375393e97e25fab118a7ad7c4c; no competing writer observed.
- Root cause reproduced with a failing test: isPublicGuestNavigation explicitly excluded /web/account. Now all signed-out pages use the public header. Account header omits redundant Sign in/Create account shortcuts, while keeping public product links, theme toggle and Preferences menu. Authenticated masters remain. No provider/backend/content/learner-data changes.
- Replaced obsolete original-header hashes with byte baselines for the four unchanged sign-in content/runtime assets. Added actual Account/create rendering across5viewport widths,2palettes,2appearances, menu overflow/Escape focus and all8personal tool gates. Updated existing logout/header browser selectors to match the revised owner requirement.
- Verified1335/1335Node tests, npm run check,96-file build;120focused responsive/theme/destination cases,6homepage/registration cases,21guest/auth-return cases,27policy cases pass in local Chromium. No further functional defect reproduced in those flows. Broad navigation and hosted…50753 tokens truncated…xisting state machine and ledger. Real full-mock launch remains blocked until content capacity reaches 180 distinct eligible published questions.

## M08d trusted run API implementation — 2026-09-27
- Added pure shared runtime core `supabase/functions/study-api/_shared/exam-runtime.js`; the domain simulator delegates its locked-section state transitions and scoring to the same implementation used by the trusted Edge API.
- Added deterministic SHA-256 seeded question ordering. This restores randomized run order after the database assembly RPC selects membership but returns its JSON array in lexical order.
- Added authenticated trusted run endpoints for start, current-run resume, specific-run read, answer mutation and marked-for-review mutation.
- Run start checks `exam_mock_readiness` before assembly and returns `exam_mock_not_ready` without creating a run when content capacity is insufficient.
- The server generates the assembly seed, learner identity and authoritative timestamps; browser payloads cannot provide learner identity, correctness, scores or answer keys.
- Run views expose only the currently open section's question content plus that section's response state. Future-section question content remains undisclosed.
- Every answer/review mutation requires `requestId` plus `expectedRevision`; identical retries are resolved against the immutable event ledger before revision rejection, while request-key reuse for different intent fails closed.
- The trusted API synchronizes elapsed section boundaries before learner mutations. Completion builds the score from exact pinned question-version answer keys and the pinned ruleset, then uses the existing atomic completion-receipt transition.
- Added cloud adapter methods for start/resume/read/answer/review and regression coverage for authentication scope, seeded ordering, revision conflicts, idempotent retries, no browser scoring claims and narrow query contracts.
- No early-section-advance API is exposed. Cancellation and GT Autopsy remain separate later work.
- Production remains intentionally blocked at 1/180 eligible unique questions, so this implementation cannot create a real full mock with current content.
- PR #50 (trusted run API) and PR #51 (self-contained Edge runtime bundle) were merged after exact-head Foundation checks and responsive browser verification passed.
- `study-api` v24 is ACTIVE in the dedicated Medical Learning OS Supabase project and contains the merged `index.ts` plus bundled `_shared/exam-runtime.js`.
- A disposable-branch live GitHub smoke passed against v24: unauthenticated `GET /progress` was rejected, unauthenticated `POST /exam-simulator/runs` was rejected, allowed local/Render origins passed CORS preflight, and an unknown origin was rejected.
- Post-smoke production verification remains `ready=false`: 1 eligible unique question / 180 required, shortage 179, with 0 `exam_runs`, 0 `exam_run_events` and 0 `exam_run_receipts`.
- Trusted run-start/resume/read/answer/review API deployment is complete. M08d remains IN PROGRESS because real full-mock launch still requires 180 distinct eligible published questions, an authenticated hosted end-to-end full-mock proof, explicit cancellation/abandon semantics and GT Autopsy.

## M02b scalable content intake foundation — 2026-09-27
- Service-only `content_intake_batches` and immutable `content_intake_events` are live.
- Candidate manifests are SHA-256 fingerprinted and bounded to 100 questions per batch.
- Intake v1 accepts only new version-1 `original` or `ai_generated` questions; recalled/licensed PYQ claims remain in the separate Exam DNA/PYQ evidence system.
- New sources enter with unresolved rights. Intake cannot manufacture rights evidence, review evidence, verified state or publication timestamps.
- Validation covers exact schema/IDs, answer-key integrity, canonical concept/source resolution, exact normalized-stem duplicates, live-catalog collisions and conflicting staged batches.
- Promotion locks and revalidates the live catalog, appends candidates only as `in_review`, increments the catalog once and records an immutable promotion event. Promotion has no publication authority.
- Staged batches can be abandoned with an auditable reason; staged payloads and intake events cannot be rewritten/deleted.
- `content_intake_pipeline_status()` reports staged/promoted/abandoned counts, catalog stage counts and outstanding Medical/References/Rights review queues without inventing a quality score.
- `review-api` v9 is ACTIVE and exposes authenticated read-only `GET /pipeline-status`; no reviewer/browser staging or promotion mutation route exists.
- Rollback-only production proof passed: synthetic stage → promotion → `in_review`, all three review backlogs increased, duplicate intake failed closed, no rights evidence appeared, then rollback restored 0 batches / 0 events / 0 synthetic questions.
- Live migration history contains `content_intake_pipeline`, `content_intake_trigger_permissions` and `internal_trigger_rpc_permissions`; trigger-only SECURITY DEFINER helpers are not exposed as application RPCs.
- First real controlled batch is now live: `pilot:rabies:20260927:01` contains 5 AI-generated, source-grounded rabies PEP questions across 5 canonical concepts and 2 Government of India NRCP sources.
- The exact merged manifest passed repository validation and the live intake validator before mutation. Staging recorded manifest SHA-256 `9f0e5b234d6695513d54a65702f338e4fffa2ec5909df90fec7c295472888248`.
- Promotion advanced the canonical catalog once, version 6 → 7, and placed all 5 questions in `in_review`.
- Post-promotion safety check: 5 pilot questions in review, 0 pilot published, 0 pilot review events, 0 pilot source-rights events, 0 exam runs.
- Review backlog is now Medical 5 / References 5 / Rights 5. Published stable inventory remains 1, so NEET-PG mock readiness correctly remains 1/180 with shortage 179.
- PR #59 added descriptive backlog metrics to the authenticated reviewer workspace; intake mutation authority remains absent from browser/reviewer code.
- Remaining M02b gate: complete independent Medical/References/Rights review of the five-question pilot, measure gate times and rejection reasons, then decide whether to scale batch size.

## M02b non-authoritative review assist — 2026-09-27
- Added `data/content-review-assist.json` for the five-question rabies pilot.
- The packet summarizes source support and conservative source-rights recommendations but has `authority=none` and cannot approve, verify or publish content.
- Reviewer cards display the preflight beside the exact target while retaining mandatory authenticated reviewer notes and decisions.
- Current source verification supports wound washing, category III RIG infiltration, IM days 0/3/7/14/28, ID days 0/3/7/28 and adult deltoid administration.
- NRCP's copyright policy supports attributed use while excluding third-party material; review-assist therefore recommends `citation_only` rather than claiming public-domain status.
- Four pilot items are straightforwardly supported. The category III RIG item carries a wording note because wound washing is also part of PEP; the reviewer decides whether to approve or require a new version.

## Rabies pilot full review/publication rollback rehearsal — 2026-09-27
- Current official NRCP material was rechecked for all five pilot claims: immediate wound washing, category III RIG infiltration, IM PEP days 0/3/7/14/28, ID PEP days 0/3/7/28 and adult deltoid administration.
- Current NRCP copyright policy supports source-attributed reuse while excluding third-party material from blanket permission; the conservative source classification remains `citation_only`.
- A production rollback-only rehearsal executed the exact intended sequence against the live five-question pilot: resolve both source-rights records → record Medical/References/Rights approvals for all five exact question versions → publish all five.
- Every trusted mutation and current-fingerprint check passed. Inside the transaction, published stable inventory reached 6 and NEET-PG mock capacity reached 6/180 with shortage 174.
- The transaction was rolled back. Post-rollback production state remains unchanged: 0 pilot review events, 0 pilot source-rights events, 0 pilot published questions and NEET-PG mock capacity 1/180 with shortage 179.
- This proves the technical path without creating a false persistent human-review audit record. Persistent review evidence still requires an authenticated reviewer action or a separately designed agent-review evidence model.

## Rabies pilot authenticated review + publication complete — 2026-09-27
- The real authenticated reviewer workflow completed all 15 immutable gate decisions: 5 Medical, 5 References and 5 Rights approvals.
- Both NRCP sources were independently resolved to `citation_only`; both persisted source-rights fingerprints match the current source records.
- All 15 review-event SHA-256 fingerprints match their current exact gate targets and all five questions reached `verified`.
- Trusted publication then ran as one atomic transaction with pre/post assertions. All five rabies questions are now `published`.
- Current learner-facing inventory is 6 distinct published stable questions / 6 published versions, with 0 in-review and 0 verified-but-unpublished questions.
- NEET-PG 2026 mock capacity is now 6/180 distinct eligible published questions; shortage is 174. Full mock remains blocked, correctly.
- The first observed authenticated review session produced 15 review decisions over a 26.6-minute first-to-last event span. Gate spans were Medical 5.9 minutes, References 6.0 minutes and Rights 8.8 minutes; 2 source-rights decisions were also recorded.
- These are operational observations from one five-question pilot, not stable throughput estimates. Rights is the current apparent bottleneck and should be measured again at larger batch size.

## M02b controlled scale pilot 02 — 2026-09-27
- Added and merged the advisory lexical-overlap preflight before scaling intake. It is service-only, non-blocking and explicitly not semantic-duplicate or medical-quality inference.
- Initial live calibration exposed a PostgreSQL whitespace-tokenization defect before any production candidate relied on the signal. The tokenizer was fixed with a follow-up migration and regression test; a deliberate rabies paraphrase now flags at 0.7647 while creating no rows.
- Batch `pilot:infectious-prevention:20260927:02` contains 25 new source-grounded AI-drafted questions across 25 canonical concepts and 5 official CDC source packages, five questions per source.
- Each concept carries `guideline-us-cdc`; the batch explicitly has `examBlueprintFidelity=false` and is a content/review-throughput experiment, not a claim about NEET-PG content mix.
- Live intake validation passed 25/25. Advisory overlap preflight found 2 within-batch lexical-overlap flags; both were inspected and retained as clinically distinct policy states rather than silently ignored.
- The exact merged manifest was staged with SHA-256 `9339331207e4ca7de5606142f2e58945b82946f8d47761e839316f15565da1ab` and then promoted atomically, catalog version 29 → 30.
- Current Batch-02 state: 25 `in_review`, 0 verified, 0 published and 0 question review events. All 5 exact Batch-02 sources remain Rights `unknown` with zero source-rights events.
- Global review backlog is now Medical 25 / References 25 / Rights 25. Published stable inventory remains 6, so NEET-PG mock capacity remains 6/180 with shortage 174.
- Review assist is being extended to all 25 items with editable note/source-policy prefills. Prefill has no review, rights, verification or publication authority.

## 2026-09-27 — Canonical architecture reconciliation

Documentation-only architecture reconciliation completed on a feature branch:
- ROADMAP now records the single evidence-ledger → Digital Twin → Study Now → intervention loop and its ownership rules.
- ARCHITECTURE now defines system ownership, source-of-truth hierarchy and the distinction between Study Now ("what next") and Adaptive Teaching ("how").
- DATA now preserves the implemented `question.answered` v1 contract while documenting planned event-family coverage, future M07c learner-state projection boundaries and intervention-outcome linkage.
- PROJECT_CONTEXT records the user's authorization and the accepted consolidation.
- ADR-044 records the no-duplicate-mastery/state rule and forward-only migration rule.

No production schema, Supabase migration, learner data, content, scoring, policy behavior or milestone status was changed. Existing timestamped migrations remain authoritative. This documentation change deliberately does not activate M07c inferred mastery before its evidence/calibration gate.

Verification for this slice is repository diff review because there is no domain/runtime change. The next implementation task remains the highest-priority open gate already recorded in ROADMAP/STATUS; this reconciliation constrains how future work is implemented rather than replacing current in-progress milestones.

## ADR-044 canonical learner replay bridge live — 2026-09-27
- Live-schema audit confirmed learner history is currently distributed across specialized stores: attempts, memory judgments, Study Now recommendation receipts, scheduler decisions and exam ledgers.
- The audit also found that several pre-ADR learner-evidence tables are application-append-only but do not yet have database UPDATE/DELETE guards. This is now an explicit integrity caveat rather than an assumed invariant.
- Added ADR-045: one canonical learner ledger means one versioned replay contract, not one premature generic physical table.
- Added service-only `study_learning_event_stream_v1`, contract `study-learning-event-stream-v1`.
- Stream v1 maps only three accepted families: `question.answered` → observation, `memory.rating` → self_report, and `study.recommendation_generated` → policy_decision.
- Every emitted event retains deterministic ordering, exact source table/id traceability, persisted/occurred timestamps and canonical concept/question/session references when the source supports them.
- Stream v1 is cursor-paginated and explicitly returns `inferenceAuthority=false` and `masteryInferenceEnabled=false`.
- Mutable sessions, NeuralVault annotations, scheduler decision events and raw exam transitions remain unmapped until explicit semantic adapters are accepted.
- Production rollback proofs replayed all 5 currently mapped source events exactly across 2 learners; cursor pagination reconstructed a 4-event learner history exactly.
- A synthetic Study Now recommendation was correctly emitted as `study.recommendation_generated` / `policy_decision`; all synthetic data was rolled back.
- Production migration `canonical_learning_event_stream` is applied. Post-deploy replay remains 5/5 mapped source events, browser roles cannot execute the function, and service_role can.
- No `learner_concept_state` table or M07c probabilistic inference was introduced.
- Supabase advisors show no new finding from this migration; existing RLS-info, leaked-password-protection warning, unindexed-FK and unused-index notices are unchanged.
- GitHub Actions remains unavailable repository-wide: main and feature jobs fail with runner_id=0 and zero executed steps. Database verification therefore used exact live rollback and post-deploy proofs.

## Future Capability foundation — 2026-09-28
- Audited current domain/adapters/server boundaries before adding future-facing abstractions.
- Existing architecture already provides provider-independent domain logic, stable concept/question/source/exam identifiers, versioned evidence/content, authenticated trusted mutation boundaries, review/publication authority separation, local persistence and the canonical learner replay stream.
- Added `src/domain/canonical-integrity.js`: deterministic JCS/RFC-8785 canonicalization, SHA-256 digest envelopes, explicit algorithm/profile metadata and digest verification.
- Added `src/domain/capabilities.js`: 7 static vendor-neutral semantic capabilities. No runtime discovery/plugin marketplace is introduced.
- Added `src/domain/action-contracts.js`: v1 ActionEnvelope/ActionReceipt validators. These are data/audit contracts only and grant no execution or database authority.
- Action metadata must itself be canonical-JSON-safe so receipts remain portable/hashable.
- Added focused tests for order-independent canonical digests, a pinned SHA-256 vector, changed-content digest divergence, malformed/unsupported values, unknown capabilities, immutable contracts, chronology and portable metadata.
- Isolated Node verification passed the foundation tests. No database migration or production data mutation is required for this slice.
- GitHub Actions remains subject to the repository-wide runner outage recorded previously; full-suite CI status must not be inferred from runner-allocation failure.
- Added ADR-046/047 and roadmap/data/architecture context. No AI SDK, agent runtime, MCP/A2A server, blockchain, ZK, DID/VC wallet, signing infrastructure or PQC runtime was added.
- Current recurring infrastructure-cost impact: approximately ₹0.

## Privacy-safe evidence immutability — 2026-09-28
- Live-schema audit found 12 current public learner-scoped tables and mapped their foreign-key/deletion order.
- Confirmed pre-change integrity gap: `study_attempts`, memory judgments, Study Now recommendation receipts, scheduler decision events and policy experiment assignments were application-append-only but service_role still held direct UPDATE/DELETE privileges.
- Confirmed the existing exam event/receipt trigger was absolutely immutable, which protected integrity but would prevent complete account erasure.
- Added migration `20260928003000_privacy_safe_evidence_immutability.sql`.
- Normal-operation UPDATE/DELETE guards now cover the five study evidence/assignment ledgers; service_role UPDATE/DELETE grants are removed.
- Existing exam ledger guard is preserved but gains one transaction-local DELETE-only exception usable by the privacy erasure function. UPDATE remains impossible.
- Added exact-schema privacy scope detection. Any new public `learner_id` table not in scope makes erasure fail with `privacy_scope_requires_update`.
- Added service-only erasure preview and atomic erasure functions.
- Durable erasure receipts contain only random receipt ID, contract/scope version, coarse reason, total rows deleted and completion time; no learner ID or learner-derived hash is retained.
- Erasure v1 deliberately excludes Auth user deletion/session revocation; those remain trusted application/admin steps.
- Full rollback proof created synthetic records across all current learner-data families, proved direct evidence mutation fails, proved an unmapped future learner table blocks the scope, erased the complete learner scope, verified zero remaining rows and then rolled the entire proof back.
- The full proof deleted 23 in-transaction rows for the probe learner (synthetic plus existing rows) before rollback, demonstrating dependency-safe deletion against real production shape.
- A second rollback proof verified missing reason fails before mutation, append-only protection remains active, valid erasure succeeds, the transaction-local bypass returns to `off`, browser/authenticated roles cannot execute erasure and the durable receipt contains no learner identifier.
- Production remained unchanged after both rollback proofs.

## Privacy erasure production deployment complete — 2026-09-28
- PR #71 merged to `main` as `cd0f8776a96b6a92171a55491d6b0463298bd10e`.
- Supabase migration `privacy_safe_evidence_immutability` is applied in production migration history.
- Production privacy scope is complete across all 12 current public `learner_id` tables; missing/unmapped lists are empty.
- `learner_privacy_erasure_receipts` is live with 0 receipts created by deployment/verification.
- Receipt schema contains only `erasure_id`, `contract_id`, `scope_version`, `reason_class`, `rows_deleted`, and `completed_at`.
- Service role can execute erasure; `authenticated` and `anon` cannot.
- Service-role UPDATE/DELETE privileges are removed from the five study evidence/assignment ledgers.
- Eight immutable guard triggers are live across study evidence, exam ledgers and erasure receipts.
- The erasure preview for a nonexistent learner returns zero rows and `authUserPresent=false`; no real learner data was erased during deployment verification.
- Post-deploy Supabase advisor baseline is unchanged: 19 existing RLS-no-policy infos, the existing leaked-password-protection warning, 6 existing unindexed-FK infos and 3 existing unused-index infos.
- Current `study-api` writes append-only study evidence through trusted RPCs; its only direct table mutations in the checked path are bookmarks, which remain intentionally mutable.
- Render deployed the exact main commit and is LIVE.
- Account-closure UI/API orchestration is still not implemented. The database erasure capability remains service-only and should not be exposed directly to learner/browser code.

## M07c inference activation gate foundation — 2026-09-28
- Added pure domain contract `src/domain/inference-activation-gate.js`.
- Gate contract: `digital-twin-inference-activation-v1`.
- Candidate models must provide a locked preregistration plan digest, observed target contract, baseline, claim scope, evidence-sufficiency criteria, offline metrics and explicit safety/validation checks.
- Evidence/metric thresholds are candidate-specific preregistered values, not platform-global constants.
- Result modes are limited to `blocked`, `shadow_only`, and `eligible_for_controlled_experiment`.
- The gate always returns `generalProductionAuthorized=false` and `policyAuthorityOwnedByModel=false`.
- Retention/transfer claims require corresponding observed outcome definitions.
- Controlled-experiment eligibility additionally requires completed prospective shadow validation, passing prospective metrics, subgroup guardrails, rollback/monitoring plans, pinned model version and intervention attribution readiness.
- Added focused regression tests for evidence insufficiency, offline calibration failure, claim/outcome mismatch, shadow-only qualification, controlled-experiment qualification, malformed preregistration and no model-owned policy authority.
- Executed the exact branch module in an isolated JavaScript runtime: blocked, shadow-only and experiment-eligible paths all behaved as specified; invalid plan digest failed closed.
- No database schema, learner-state store, mastery percentage, model training pipeline or production inference was introduced.

## M07c current evidence baseline — 2026-09-28
- Live production evidence inventory after M07c0 deployment: 2 learners with attempts, 4 total attempts, 1 distinct question version, 1 distinct concept, 1 memory-rating event, 0 Study Now recommendation receipts and 4 schedule-decision events.
- There are 2 observed same-question follow-up attempts, both correct, but 0 follow-ups at or beyond 1 day and 0 at or beyond 7 days in the current data.
- No canonical transfer event family or clinical-transfer outcome is currently available.
- These interval buckets are descriptive inventory checks only; they are not preregistered retention thresholds and do not define a production model target.
- M07c1 remains PLANNED/not started. Current data are suitable for integration/smoke validation only, not for locking a meaningful retention/transfer model preregistration.
- Do not create a learner-state table or train/activate a Digital Twin inference model merely to make progress. The next M07c move should follow naturally from real longitudinal learner evidence and an M11 research plan.

## M02b controlled scale pilot 03 — 2026-09-28
- PR #75 merged the third controlled source-grounded intake batch into `main`.
- Batch key: `pilot:acute-medicine:20260928:03`.
- Batch contains 25 AI-generated original single-best-answer questions, 25 new canonical concepts and 5 guideline source packages spanning adult BLS, sepsis/shock, asthma, COPD and diabetes diagnosis.
- Current sources: 2025 AHA adult BLS, current SCCM Surviving Sepsis Campaign adult guidance, 2026 GINA, 2026 GOLD and ADA Standards of Care in Diabetes—2026.
- Every source entered with Rights `unknown`; every question entered `in_review`; there is no PYQ/licensed provenance claim and no publication authority.
- Live intake validator passed all 25 questions. Advisory lexical-overlap preflight produced one non-blocking flag between the ADA A1C and fasting-glucose diagnostic items (0.5625 token-set Jaccard); both were retained because they test distinct diagnostic criteria.
- The merged manifest was staged and promoted with SHA-256 `f8acff6662db182f73b176906340ad59cd947c0c1fd5eb6d2488526d9032296b`.
- Promotion advanced canonical catalog version 30 → 31.
- Post-promotion verification: Batch 03 = 25 in review / 0 verified / 0 published / 0 review events / 0 source-rights events.
- Global catalog state is now 50 in-review questions and 6 published stable questions. Outstanding review queues are Medical 50 / References 50 / Rights 50.
- Review-assist now covers 55 questions across the three controlled batches and remains explicitly non-authoritative.
- Autonomous content creation does not imply autonomous publication. Independent review evidence remains a separate integrity gate.

## AI test-only review authority live — 2026-09-28
- User authorization now permits autonomous Medical/References/Rights assessment for **internal testing only** until the simulator content target is reached or the user explicitly takes review back over.
- Production migration `20260927213048_ai_test_review_authority` is applied.
- Added immutable, service-only `content_ai_test_source_rights` and `content_ai_test_review_events`.
- Added service-only `record_ai_test_source_rights` and `record_ai_test_review`; AI evidence is structurally separate from human review evidence and cannot set `verified`/`published`.
- Added `exam_mock_test_readiness` and `exam_assemble_test_mock`. These may count current AI-test-reviewed questions for engineering/simulator testing while leaving `exam_mock_readiness` unchanged.
- Browser roles have no AI-test review mutation authority. AI-test evidence is append-only.
- Post-deploy advisor verification initially exposed the trigger-only immutability helper as callable through the public RPC surface. Follow-up migration `20260927213800_ai_test_review_trigger_security` changed it to SECURITY INVOKER and revoked browser execution; anon/authenticated execution now fails closed and the advisor returned to the previous baseline.

- Added `data/autonomous-content-policy.json`: future batches are at least 25 questions and prioritize verified NEET-PG/INI-CET exam evidence when available, then coverage gaps, cross-exam/clinical transfer, source efficiency and duplication avoidance. Unverified exam-frequency claims are forbidden.
- Existing 50-question Batch 02 + Batch 03 backlog passed the current preflight consistency gate: 50/50 low-uncertainty medically supported, 50/50 direct-source support, 50/50 conservative citation-only rights recommendation.
- Recorded 10 AI-test source-rights approvals and 150 AI-test question-gate approvals (50 Medical + 50 References + 50 Rights), all labeled `ai:mlos-autonomous-reviewer-v1` / `ai-test-review-v1`.
- Internal-test readiness is now **56/180**: 6 human-published + 50 AI-test-only, shortage 124.
- Production readiness remains **6/180**, shortage 174. No AI-test event altered human review queues, publication state or learner-facing eligibility.
- Next content work should close the 124-question internal-test shortage in source-grounded batches of at least 25, stopping when the verified rule-set requirement is met. Human review can continue independently for production release.


## M02b controlled scale pilot 04 + AI-test review — 2026-09-28
- PR #78 merged `pilot:core-cross-exam:20260928:04`: 25 original AI-drafted questions, 25 new canonical concepts and 5 authoritative source clusters.
- Coverage: acute coronary syndromes, acute ischemic stroke, diabetic ketoacidosis, chronic kidney disease and postpartum haemorrhage.
- Selection used `exam-value-autonomous-intake-v1`. Genuine historical Exam DNA/PYQ evidence remains too sparse to claim observed exam-frequency fidelity, so this batch is explicitly prioritized by cross-exam core value and uncovered canonical coverage rather than invented frequency.
- Exact merged manifest passed live intake validation 25/25 and lexical overlap preflight returned 0 flags at threshold 0.55.
- Batch staged with manifest SHA-256 `d6ac684a42f7ccd2e3789b5aaebc650e16c40f43fc4db7c1af693c6796e2c177` and promoted atomically, catalog version 31 → 32.
- All 25 questions remain `in_review` for the production human-review lane. No human review or production source-rights evidence was fabricated.
- Separate `ai-test-review-v1` assessment recorded 5 source-rights decisions plus 75 question-gate approvals (25 Medical + 25 References + 25 Rights), all explicitly AI/test-only and fingerprint-bound.
- Internal-test readiness is now **81/180**: 6 human-published + 75 AI-test-only, shortage 99.
- Production readiness remains **6/180**, shortage 174.
- Autonomous expansion remains active: subsequent batches are at least 25 questions and stop once the verified internal-test inventory requirement is met, unless invalid/rejected items need replacement.


## M02b controlled scale pilot 05 + AI-test review — 2026-09-28
- PR #80 merged `pilot:india-national-programs:20260928:05`: 25 original AI-drafted questions, 25 new canonical concepts and 5 official Indian programme/source clusters.
- Coverage: National Immunization Schedule, revised NLEP leprosy classification/MDT, NCVBDC malaria strategy, NTEP drug-resistant TB and NACO HIV post-exposure prophylaxis.
- Selection follows `exam-value-autonomous-intake-v1`. Verified historical Exam DNA/PYQ frequency remains insufficient for observed-frequency claims, so the batch is explicitly heuristic by uncovered canonical coverage, cross-exam/clinical value and source-cluster efficiency.
- Before intake, the malaria target-year item was corrected to the current NSP 2023–27 statement that all States/UTs should reach Category 0 (zero indigenous cases) by 2027.
- Exact merged manifest passed live intake validation 25/25 against catalog version 32.
- Lexical overlap preflight returned 2 non-blocking flags at threshold 0.55: PB vs MB leprosy duration (0.75) and malaria relapse vs recrudescence (0.80). Both are intentional discrimination pairs and are explicitly dispositioned `retain_distinct`.
- Staged manifest SHA-256: `b93f2d7021bbcc30d2be8b17982be3468ca6c588fbac24fcc84d3b9e94989d22`.
- Promotion advanced canonical catalog version 32 → 33.
- Production state for Pilot 05 remains 25 `in_review`, 0 verified and 0 published, with 0 human review events and 0 production source-rights events.
- Separate `ai-test-review-v1` evidence recorded 5 source-rights approvals and 75 question-gate approvals (25 Medical + 25 References + 25 Rights).
- Post-write integrity proof: all 75 AI-test review fingerprints match current gate targets and all 5 AI-test source-rights fingerprints match current sources.
- Internal-test readiness is now **106/180**: 6 human-published + 100 AI-test-only, shortage 74.
- Production readiness remains **6/180**, shortage 174. AI review did not alter production publication eligibility.
- Global production human-review backlog is now Medical 100 / References 100 / Rights 100; this debt is intentionally independent from the internal-test lane.
- Next autonomous content target is the remaining 74 internal-test questions. Batch size must remain ≥25 and source-grounded, and generation stops once the verified 180-question testing requirement is satisfied except for replacement of rejected/invalid items.


## M10a multimodal foundation started — 2026-09-28
- User selected subject-breadth-first scaling for the remaining simulator content gap and immediate inclusion of image-based radiology/pathology content.
- Added `src/domain/media.js`, a provider-independent Phase-1 media contract for JPEG/PNG/WebP across radiology, pathology, dermatology, ophthalmology, anatomy and ECG images.
- Media versions bind SHA-256 byte identity, dimensions, an opaque delivery reference, source/provider/original identifier, copyright/licence/rights evidence, diagnosis evidence and explicit review state.
- Added separately versioned hotspot/bounding-box/polygon annotations with normalized geometry and exact question-media links.
- Blind-first-look learner projection excludes diagnosis evidence, source/licence/review metadata and ground-truth annotations.
- Added a synthetic nonclinical media fixture and domain tests; no medical image has been claimed as reviewed or learner-ready by this slice.
- This is the prerequisite for image-based questions, not completion of M10. Next gate is persistence/media-bound review integrity and the first sourced radiology/pathology image pilot.


## M10a hosted media persistence + review binding — 2026-09-28
- Applied production migration `20260927222051_m10a_media_persistence_review_binding`.
- Added service-only, RLS-enabled immutable tables for media asset versions, annotation versions and exact question-media links.
- Media sources now carry normalized `rightsStatus = unknown | owned | licensed | public_domain`; image Rights approval fails closed when linked media remains `unknown`.
- `current_review_target_sha256` now conditionally incorporates exact media bytes, source/provenance metadata and linked annotations. Text-only questions use the historical target shape unchanged.
- Post-migration compatibility proof: 18/18 current human review fingerprints and 300/300 AI-test review fingerprints still match.
- Browser roles have no direct SELECT access to media tables and cannot execute the media registration RPC; service-role registration remains available.
- Added service-only `content_media_prompt`, returning only learner-safe prompt metadata: exact media version, modality, MIME type, dimensions, delivery reference and blind-first-look flag.
- Added authenticated `GET /study-api/media?questionVersionId=...` and cloud adapter support. The Edge API checks that the question is currently published before returning media.
- Rollback-only live test proved: adding media changes review hashes, learner prompt projection omits diagnosis/source/rights/annotations, unresolved image rights block Rights approval, and zero synthetic rows survive rollback.
- M10a remains IN PROGRESS. The next gate is the first real licensed/public-domain radiology + pathology pilot and learner-page rendering.


## M10a learner image rendering — 2026-09-28
- Study session state now attaches the service-derived `content-media-prompt-v1` projection to the exact published question version.
- Medical QBank renders prompt media before the stem with a generic modality label and no diagnostic clue.
- Learner UI accepts HTTPS delivery only, sends no referrer, uses bounded responsive `object-fit: contain`, and exposes no diagnosis evidence, annotations or rights/provenance metadata.
- Existing text-only questions receive `media: []` and retain their current study behavior.
- The next M10a task is no longer generic UI plumbing: ingest and verify the first real permissioned radiology/pathology media assets, then exercise the full image question path.


## M10a first exact-byte asset set + private delivery — 2026-09-28
- Verified five source pages with explicit CC0 1.0/public-domain dedication: three radiology assets (expiratory pneumothorax CXR, kidney-stone CT window comparison, lobar-pneumonia CXR) and two pathology assets (clear-cell RCC grade 1 H&E, seminoma H&E).
- Exact source bytes were fetched server-side into a private Supabase Storage bucket `mlos-media`; the bucket is not public.
- Canonical media registration recomputed SHA-256 from the stored bytes and recorded five immutable `MediaAsset@1` records with dimensions, source identity, CC0 evidence and `rightsStatus=public_domain`.
- Registered SHA-256 values: pneumothorax `cdc3a924…bde5`; kidney-stone CT `b0fdb5ce…7906`; lobar pneumonia `cae983ca…6f76`; clear-cell RCC `88bc329f…2cdf`; seminoma `c50bf62b…2fed`.
- The temporary fixed-source ingestion/registration Edge Functions were immediately disabled and changed to JWT-required 410 responses after success.
- Canonical delivery references remain opaque `storage://mlos-media/...`. The learner API now converts them to 15-minute signed URLs; raw bucket paths and service credentials are not browser-facing.
- No question links or annotations have been created yet, so existing question review fingerprints and simulator eligibility are unchanged.
- Next task: Batch 06, at least 25 breadth-first questions, with these five assets linked to selected radiology/pathology questions before AI-test Medical/References/Rights review so media is included in the original review fingerprints.


## M02b/M10a controlled multimodal breadth pilot 06 — 2026-09-28
- PR #86 merged `pilot:multimodal-breadth:20260928:06`: 25 original AI-drafted questions, 25 new canonical concepts and 9 source clusters.
- Breadth coverage: neonatal resuscitation, acute pancreatitis, epilepsy evaluation, depression, radiology and pathology.
- The first 5 real multimodal questions are linked to exact immutable media versions before review: 3 radiology + 2 pathology, all prompt role with `blindFirstLook=true`.
- The five media assets are private-storage-backed, exact-byte SHA-256 identified and carry canonical `rightsStatus=public_domain` from CC0 sources.
- NICE-derived draft items were removed before intake after current NICE AI-reuse terms were checked; neurology/psychiatry items instead use NINDS/NIMH public-domain sources.
- Exact merged manifest passed live intake validation 25/25 with 0 lexical-overlap flags at threshold 0.55.
- Manifest SHA-256: `a9d3cc5b3f60a5b8996755c06c52fa460d6d23314a4ab76325ffc2635e51d45b`.
- Promotion advanced canonical catalog version 33 → 34.
- Production state remains 25 `in_review`, 0 verified and 0 published for Pilot 06; 0 human review events and 0 production source-rights events were created.
- Separate `ai-test-review-v1` evidence recorded 9 source-rights decisions and 75 question-gate approvals. All 75 question fingerprints and all 9 source fingerprints match current targets after media linking.
- Live media integrity proof: 5/5 question-media links resolve to public-domain prompt assets with blind-first-look enabled.
- Internal-test readiness is now **131/180**: 6 human-published + 125 AI-test-only, shortage 49.
- Production readiness remains **6/180**, shortage 174.
- Human production review backlog is now Medical 125 / References 125 / Rights 125.
- The next autonomous content batch should contain exactly 49 breadth-first source-grounded questions if quality permits, reaching the internal simulator requirement without unnecessary overproduction.


## M08d internal 180-question simulator lane — 2026-09-28
- Internal-test content capacity reached exactly 180/180 distinct questions: 174 AI-test-only + 6 human-published. Production readiness remains 6/180 and published-only.
- The deterministic internal assembly contract produced 180/180 distinct question versions, including all 5 currently linked radiology/pathology image questions.
- Added a separate authenticated `POST /exam-simulator/test-runs` boundary. It never replaces or widens `POST /exam-simulator/runs`.
- Internal test-run start requires server-verified Supabase Auth `app_metadata.medical_learning_os_internal_tester === true`; `user_metadata` is not used for authorization.
- The test route uses only `exam_mock_test_readiness` + `exam_assemble_test_mock`; the production route remains pinned to `exam_mock_readiness` + `exam_assemble_mock`.
- Test-run state is permanently marked `testingOnly=true` and `productionEquivalent=false`.
- Current-request authorization is rechecked when reading or mutating an existing test run, so removing the app-metadata grant cuts off access without changing immutable run history.
- Simulator question views now attach the same learner-safe signed media projection already used by the QBank; diagnosis/source/rights/annotation ground truth is not added to pre-answer payloads.
- No user account has been granted the internal-test flag by this change. This avoids guessing an operator/test identity or contaminating a real learner account.


## M08d internal-test simulator route deployed — 2026-09-28
- PR #89 merged the separate internal-test simulator start boundary.
- Supabase `study-api` version 28 is ACTIVE with the exact merged source.
- `POST /exam-simulator/test-runs` requires server-verified `app_metadata.medical_learning_os_internal_tester === true` and uses `exam_mock_test_readiness` + `exam_assemble_test_mock`.
- Existing production `POST /exam-simulator/runs` remains on `exam_mock_readiness` + `exam_assemble_mock`; production eligibility is still 6/180 published questions.
- Test-run state is marked `testingOnly=true` and `productionEquivalent=false`; production and test starts cannot silently resume each other.
- Read/write access to an existing test run rechecks the current app-metadata grant, so authorization revocation cuts off subsequent access.
- Simulator question views now attach the same signed learner-safe media projection as the QBank, enabling the five exact-byte radiology/pathology prompts without pre-answer annotation/diagnosis leakage.
- Deployed source verification confirmed route, app-metadata gate, test readiness/assembly RPCs and media attachment are present.
- No existing real learner account was automatically granted internal-test access. The remaining hosted E2E gate is to use a deliberately designated internal test identity, grant that identity the app-metadata flag, then exercise a full 180-question run without mixing engineering evidence into a real learner's longitudinal history.


## M08d explicit cancellation / abandonment semantics — 2026-09-28
- Added pure `cancelExamRun` semantics to the shared locked-section runtime.
- Learner-facing cancellation terminates an in-progress run as `cancelled`, closes the currently open section at the server timestamp, preserves prior answers/review flags, clears `currentSectionIndex`, and records a structured termination reason.
- Cancellation does **not** set `completedAt`, does not create a completion/scoring receipt, and cancelled runs cannot be scored through the completed-run scoring path.
- The authenticated learner API exposes `POST /exam-simulator/runs/:runId/cancel` with request-id idempotency and optimistic revision protection.
- Browser/learner requests are always attributed as `user_abandoned`; they cannot claim `operator_cancelled`. Operator cancellation remains reserved for a future trusted operator boundary.
- Internal-test authorization is rechecked before cancelling a testing-only run, so grant revocation still fails closed.
- The existing database ledger already supports immutable `run.cancelled` events, so no schema change is required.
- Direct pure-runtime verification passed: prior answer preserved, active section closed at cancellation time, later writes rejected, scoring rejected, and a naturally completed run cannot be retroactively cancelled.
- M08d cancellation/abandon semantics are now implemented. Remaining gates are the deliberately designated internal-test identity for hosted full-mock proof and GT Autopsy.


## M08d GT Autopsy v1 foundation — 2026-09-28
- Added a pure, provider-independent `gt-autopsy-v1` projection for **completed exam runs only**.
- The projection reconciles the immutable completion receipt against final run responses before producing analytics; a mismatch fails closed.
- V1 exposes trusted result totals, section-by-section anatomy, primary-concept observations, current visual-question performance, and exact observed answer-change behavior from the immutable run-event ledger.
- Answer-change analysis reports beneficial, harmful and wrong→wrong changes plus the exact scoring impact of those observed changes under the pinned scoring rule.
- The prescription layer is deliberately limited to up to five **descriptive remediation candidates** ranked by observed incorrect/unanswered counts. It does not claim causal root cause, mastery, exam importance or expected marks recovered.
- Unsupported inference is explicitly disabled: no mastery inference, preventable-marks inference, fatigue inference or confidence calibration.
- Added authenticated `GET /exam-simulator/runs/:runId/autopsy`. It is learner-scoped, rechecks the internal-test grant for testing-only runs, synchronizes the trusted exam clock first and rejects non-completed/cancelled runs.
- Media performance is derived from canonical prompt-media links and modality metadata without generating signed image URLs or exposing diagnosis/rights/annotation data.
- Media lookups are chunked for full 180-question runs rather than relying on a single oversized query.
- Added `examRunAutopsy(runId)` to the cloud adapter.
- Direct pure-projection verification passed result/section reconciliation, visual metrics, concept aggregation, answer-change score impact, descriptive candidate ordering, receipt mismatch rejection and cancelled-run rejection.
- Live Edge Function deployment remains the final step for this slice after merge.


## M08d GT Autopsy deployed + Exam Mode shell — 2026-09-28
- Supabase `study-api` v30 is ACTIVE with the merged `gt-autopsy-v1` route and pure projection.
- Deployed-source verification confirmed completed-run gating, internal-test access recheck, receipt reconciliation, chunked media metadata lookup and explicit disabling of mastery/preventable-marks/fatigue/confidence inference.
- Added dedicated `/web/exam.html` + `/web/exam.js` Exam Mode source rather than embedding simulator mechanics into the ordinary QBank page.
- Exam Mode is a controller/view over the trusted server state machine: production/test readiness, start/resume/read, answer autosave, mark-for-review, cancellation and GT Autopsy all go through authenticated cloud APIs.
- Current-section navigation uses a 36-question-style palette generated from the server-returned section; there is no client action for early section advance or reopening a closed section.
- Countdown is synchronized from `serverNow` + the server-scheduled section end; expiry triggers a server refresh rather than client-side advancement.
- Exact answer/review/cancel writes remain request-idempotent and revisioned.
- The learner can clear an answer, toggle review state and move freely only inside the current section.
- Prompt images reuse the signed blind-first-look media projection and do not expose diagnosis, annotations or rights metadata.
- Completed runs hand off to descriptive GT Autopsy; cancelled runs explicitly receive no completion score/autopsy.
- Internal engineering readiness is visible only when the server-authorized test-readiness route succeeds; a 403 hides that lane from ordinary learners.
- Exact-head static safety checks passed. Hosted browser deployment/viewport verification remains pending merge/deploy.


## M08d accelerated full-mock acceptance proof — 2026-09-28
- The real internal-test assembly was reloaded from production data: 180/180 distinct question versions, five sections, 36 questions/section, 2520 seconds (42 minutes)/section, 12600 seconds total.
- The verified ruleset still pins `earlySectionAdvanceAllowed=false`, `revisitClosedSectionsAllowed=false` and `timeCarryForwardAllowed=false`.
- The runtime intentionally exposes **no early-section-advance command**. Section progression occurs only through the trusted clock transition.
- A direct write into a future section was rejected with `future_section_locked`.
- After each server deadline transition, writes back into the closed prior section were rejected with `section_locked`.
- Accelerated pure-runtime execution traversed the complete real 180-question assembly and all five real section deadlines:
  - 180 distinct questions;
  - 36 questions in each section;
  - all five sections closed;
  - final status `completed`;
  - 180 correct, 0 incorrect, 0 unanswered;
  - 18 marked-for-review responses preserved;
  - trusted score 720/720.
- A rollback-only database persistence drill then used the same real 180-item run and real section deadlines, persisted one answer in each section plus all five clock transitions, created the terminal completion receipt, verified the append-only ledger/revision count, and rolled the transaction back.
- Rollback residue check: 0 `exam_runs`, 0 `exam_run_events`, 0 `exam_run_receipts` for the synthetic proof run.
- This proves the core full-length state machine + persistence path without waiting 210 wall-clock minutes and without contaminating either existing learner account.
- The remaining hosted acceptance gate is a deliberately separate internal QA Auth identity so the live browser can execute the same 180-question path end-to-end.


## M08d isolated hosted QA smoke + query-routing fix — 2026-09-28
- Created one **separate synthetic Supabase Auth QA identity** with server-controlled `app_metadata.medical_learning_os_internal_tester=true` and `medical_learning_os_test_identity=true`; neither existing learner account was repurposed.
- Hosted QA immediately exposed a real routing defect: a global `url.search` rejection sat before legitimate query-bearing routes, causing production readiness, internal-test readiness and Exam DNA query parameters to fail with `query_not_supported`.
- PR #95 fixed query validation at the route level. Supabase `study-api` version 32 is ACTIVE with the fix.
- Function-edge logs after the fix verify the isolated QA identity exercised the real hosted API:
  - `GET /exam-simulator/readiness?ruleSetId=...` → 200;
  - `GET /exam-simulator/test-readiness?ruleSetId=...` → 200;
  - `POST /exam-simulator/test-runs` → 200;
  - answer mutation → 200;
  - review mutation → 200;
  - autopsy before completion → 409 as required;
  - cancellation → 200;
  - cancelled-run readback → 200;
  - autopsy after cancellation → 409 as required.
- The QA identity currently owns only isolated simulator smoke evidence: 3 cancelled test runs from repeated smoke attempts, 3 answer events, 3 review events, 3 cancellation events, and **0 completion receipts**.
- The retries occurred because the temporary remote runner later stalled while trying to fetch Render assets; the simulator API path had already completed successfully each time.
- The temporary QA bootstrap Edge Function is now disabled: version 3 requires JWT and returns HTTP 410 only.
- The temporary database `http` extension and private `mlos_internal_http` schema used for the bootstrap were removed after the test.
- Render previously deployed the dedicated Exam Mode commit `c65bbf3...` successfully and marked it live. Subsequent main commits after that point were docs/API-query changes, not Exam Mode browser-code changes.
- M08d backend/runtime/hosted-API acceptance is now complete. Remaining browser-specific gate: visually exercise the live Exam Mode at phone/tablet/desktop widths and complete a human-driven browser interaction pass; this environment has no general webpage-rendering browser capable of that verification.


## M09a intelligence-provider boundary — 2026-09-28
- Added semantic capability `learning.teaching.render@1` for rendering a teaching action already selected by policy. The capability names the learning job, not an AI vendor/model.
- Added pure `IntelligenceTask@1`, `IntelligenceResult@1` and provider-descriptor validation in `src/domain/intelligence-provider.js`.
- Tasks bind a semantic capability, versioned instruction set, canonical structured input, explicit grounding references/mode, versioned output contract, latency/cost ceilings, request time and metadata.
- Results bind exact provider/implementation/version attribution, structured output, citations, normalized usage/cost, timestamps, normalized error state and canonical metadata.
- Required-grounding tasks cannot succeed without citations, and every returned citation must be a subset of the task's supplied grounding references.
- Exact-key validation deliberately excludes provider-owned conversation memory, hidden-reasoning fields and arbitrary unversioned payload expansion from the cross-provider contract.
- `createIntelligenceProvider` is a structural adapter only: it validates supported semantic capabilities, immutable task input, structured results and exact provider attribution.
- The provider does **not** choose Study Now/Adaptive Teaching policy, mutate canonical learner evidence, own learner state, publish content or write medical truth.
- No provider SDK, model router, prompt database, AI persistence table, network call or recurring AI/infrastructure cost was introduced.
- Direct execution verification passed capability registration, required grounding, citation containment, structured result validation, provider attribution and unsupported-capability rejection.
- Next M09 slice: define one grounded teaching-output contract plus an evaluation/fallback contract before connecting a real model provider.


## M09b grounded teaching output + fail-closed fallback — 2026-09-28
- Added `src/domain/grounded-teaching.js` as the first capability-specific contract on top of the generic M09a `IntelligenceTask@1` / `IntelligenceResult@1` envelopes.
- Scope is intentionally narrow: an upstream Teaching Policy has already selected one of `concise_explanation`, `contrastive_explanation`, `misconception_repair` or `prerequisite_remediation`. The provider may render that action but cannot select the learning target/intervention.
- `grounded-teaching-output@1` binds exact teaching action + concept, a compact headline, up to six typed claims, claim-level citation references, an optional misconception-correction mapping, the next learner prompt, and explicit ready/abstained state.
- Every ready medical claim must carry at least one citation inside the task's supplied grounding, and every claim citation must also appear in the provider result's declared citation set.
- Misconception repair must echo the exact observed learner belief and bind it to both a `correction` claim and a `discriminator` claim. Contrastive explanations require a discriminator claim; prerequisite remediation requires a prerequisite claim.
- Conservative engineering verbosity caps are 120 words for concise explanation, 160 for contrastive/misconception repair and 180 for prerequisite remediation. These are guardrails, not claims of pedagogical optimality; later experiments may version them.
- Providers may abstain only as `insufficient_grounding` or `medical_uncertainty`. Abstention never reaches the learner as an empty AI response; the delivery resolver uses the task's reviewed canonical fallback.
- `resolveGroundedTeachingDelivery` deterministically returns canonical fallback for provider absence, provider failure/rejection, abstention or any evaluation failure. Invalid provider output is never exposed.
- Executable evaluation cases cover valid grounded repair, uncited claims, claim citations missing from the provider result, misconception mismatch, missing discriminator, over-verbosity, safe abstention, provider failure and invalid-output fallback.
- Direct execution passed all evaluated paths.
- While executing M09b, a pre-existing canonical-integrity defect was discovered: the array-index regex contained a literal double backslash, causing normal arrays with indices beyond `0` to fail canonical JSON validation. The regex is corrected and a dense multi-index array regression test is added.
- No live AI provider, model SDK, model router, prompt database, AI persistence table, or recurring AI cost is introduced.
- Claim-level citation containment still does **not** prove semantic medical correctness. A curated semantic medical teaching evaluation set remains required before a learner-facing provider is connected.


## M09b learner-facing canonical teaching fallback — 2026-09-28
- Added a deterministic post-answer teaching producer at `supabase/functions/study-api/_shared/post-answer-teaching.js`.
- Incorrect answers now map to the bounded action `concise_explanation`; correct answers create no extra remediation block.
- The producer reuses the exact reviewed/published question explanation without rewriting or truncating medical content.
- Current published explanations are comfortably within the v1 concise limit (6 published questions; maximum 41 words, average 31.7 words at verification time).
- Source metadata from the exact question version is converted into claim-level `content-source` references and attached to `grounded-teaching-output@1`.
- If no canonical source identity is available or the reviewed explanation would exceed the v1 verbosity contract, the producer returns no structured teaching block rather than fabricating or truncating content.
- The immutable answer receipt now records both `teachingDecision` and `teaching`; this preserves which intervention was actually shown for later intervention→outcome analysis without creating a new learner-state store.
- The medical learner UI renders the structured canonical block for incorrect answers, including one short retrieval prompt, while old receipts and any non-conforming payload fall back to the existing reviewed explanation.
- Correct answers keep the existing reviewed feedback path and do not enter the remediation block.
- Direct cross-contract execution verified that the Edge Function producer output is accepted by the M09b domain validator. It also verified correct-answer silence, fail-soft no-source behavior, refusal to truncate overlong explanations and source-version deduplication.
- No live AI provider is used. This learner flow therefore works identically when all AI providers are absent.


## M09c semantic teaching bootstrap evaluation set — 2026-09-28
- Added `data/evaluations/grounded-teaching-semantic-bootstrap-v1.json`.
- The bootstrap set contains 6 cases and exactly covers all 6 currently human-reviewed/published question versions in the live catalog at verification time.
- Cases are derived only from reviewed canonical explanations and their exact canonical source IDs/versions.
- Every case contains an observed wrong option, reviewed canonical explanation, positive facts that must be preserved, explicit incorrect/dangerous claims that must not appear, allowed grounding, and a 120-word micro-remediation ceiling.
- Added `src/domain/teaching-semantic-evaluation.js` with strict evaluation-set, checklist and human-review record contracts.
- Five dimensions are mandatory: medical correctness, error correction, grounding, unsupported claims and verbosity.
- Medical correctness, error correction and unsupported-claim review are explicitly `human_required`; grounding is `contract_plus_human`. Automated structure/citation checks cannot substitute for semantic medical review.
- An overall pass is valid only if **every** required dimension passes; one failed dimension forces overall failure.
- The bootstrap set explicitly has `productionQualificationAuthority=false`. Passing it alone can never authorize a production provider.
- Direct execution verified schema integrity, checklist generation, all-pass review validation, rejection of inconsistent overall verdicts and exact 6/6 coverage against the live published catalog.
- No provider has been connected or qualified by this work.


## M09c non-authoritative provider evaluation runner — 2026-09-28
- Added `src/domain/teaching-provider-evaluation-runner.js`.
- The runner consumes the curated semantic teaching evaluation set plus any replaceable `IntelligenceProvider` that supports `learning.teaching.render`.
- Each evaluation case becomes a grounded evaluation-only task with the case's reviewed canonical explanation as deterministic fallback and the observed wrong option preserved in task metadata.
- Every case executes independently. A provider exception does not abort the suite; that case records `provider_error`, previews canonical fallback, and later cases continue.
- Structurally/grounding-invalid provider output becomes `blocked_before_human_review`; it cannot be laundered into a human semantic pass.
- Only deterministic passes become `awaiting_human_review` and receive the five-dimension semantic checklist.
- Finalization accepts only validated human semantic reviews whose `providerRunRef` matches the exact evaluated case.
- Bootstrap verdict is conjunctive:
  - any provider/deterministic block or human semantic failure → `fail`;
  - missing required human reviews → `pending`;
  - all cases deterministic-pass + all human-pass → `pass`.
- Regardless of bootstrap verdict, `productionQualificationAuthority=false`, `productionQualified=false`, and qualification scope remains `bootstrap_only`.
- Direct execution verified:
  - valid fake provider: 6/6 deterministic pass, all awaiting human review;
  - structurally unsafe provider: 1 deterministic block, canonical fallback for that case;
  - throwing provider: 1 provider error while later cases continue;
  - three missing reviews → pending;
  - one human semantic failure → bootstrap fail;
  - all six human passes → bootstrap pass but still no production qualification.
- No provider network call, credential, model SDK, production routing or run-cost persistence was introduced.


## M09c semantic teaching breadth v2 — 2026-09-28
- Added `data/evaluations/grounded-teaching-semantic-breadth-v2.json` as a separate development-only breadth set rather than weakening or rewriting the six-case human-reviewed bootstrap.
- The set contains 12 unique question versions across anesthesia, cardiology, critical care, dermatology, neurology, obstetrics, ophthalmology, psychiatry, asthma, COPD, adult BLS and toxicology.
- All 12 selected question versions currently retain matching AI-test Medical, References and Rights approvals under `ai-test-review-v1` (3/3 current review kinds each).
- Schema v2 adds explicit `representation` plus action-specific canonical claims and optional observed-belief evidence while preserving schema-v1 compatibility.
- All four grounded-teaching actions are now exercised: concise explanation, contrastive explanation, misconception repair and prerequisite remediation.
- Textual task representations include factual recall, clinical vignette, management decision and discrimination.
- Misconception cases must carry an explicit observed learner belief; their deterministic fallback contains both correction and discriminator claims bound to that belief.
- Contrastive cases require a discriminator claim; prerequisite cases require a prerequisite claim.
- The non-authoritative provider runner now builds valid action-specific canonical fallbacks for schema-v2 cases and carries representation into evaluation metadata.
- Direct execution with a fake replaceable provider passed all 12 deterministic contracts and routed all 12 to `awaiting_human_review`; production qualification authority remained false.
- The set is explicitly **not** human production-reviewed. Automated checks and prior AI-test content review cannot substitute for human semantic provider review.
- Visual/multimodal teaching evaluation is intentionally not smuggled into this text contract; it remains a later M09/M10 bridge requiring media-bearing provider input.


## M10b visual interaction evidence foundation — 2026-09-28
- Added `src/domain/visual-interaction.js` with a strict v1 `media.interaction.completed` contract.
- Phase-1 task types are detection, localization, description, interpretation and discrimination.
- Evidence binds the exact learner/session/attempt/question/concept/media version, server-compatible canonical timestamp, latency, learner response, trusted evaluation, help use and optional intervention reference.
- Localization records normalized learner geometry and optional IoU against a versioned annotation; IoU is rejected for non-localization tasks.
- `visualMistakeObservation` emits only descriptive visual-error evidence for non-correct outcomes. It does not infer a causal mistake phenotype or mastery state.
- `visualStudySignal` is explicitly marked `authoritativeForMastery=false`, preserving the Digital Twin boundary.
- Added executable tests for immutability, all five task types, bounded geometry, empty-response rejection, correct-answer silence in Mistake observations and non-authoritative Study Now signaling.
- No database schema, learner UI, media review state or production content was changed by this slice.
- Next M10b gate: persist the event through the canonical learner-event ledger, then exercise one authenticated image interaction end to end before adding visual-error recurrence logic.

## M09c target-bound human semantic review — 2026-09-28
- Closed an integrity gap in the semantic provider gate: a human review can no longer be attached only to a movable `providerRunRef`.
- New evaluation runs use `semantic-teaching-provider-evaluation-run-v2`.
- Every deterministic-pass case receives a canonical JCS/RFC-8785 + SHA-256 `reviewTargetDigest` over the exact evaluation case, task/provider attribution, provider teaching output and citation references.
- Semantic review schema v2 carries that digest; finalization requires an exact profile + digest match.
- A stale/substituted target or legacy unbound v1 review is rejected for a v2 run.
- Provider-error and deterministic-blocked cases receive no review target and cannot be laundered into human approval.
- Existing production authority remains unchanged: `productionQualificationAuthority=false` and `productionQualified=false`.
- Exact-head in-memory verification passed against both real fixtures: 6/6 bootstrap and 12/12 breadth cases received valid target digests; stale and legacy unbound reviews were rejected.
- GitHub Actions remains unavailable for this repository in the observed runs: both jobs fail before step 1 with zero executed steps. This is recorded separately from the exact-head domain verification.
- No model SDK, provider credential, learner-facing AI route, database migration or recurring AI cost is introduced.
- Next M09c gate remains genuine human semantic review of real provider outputs before any separately governed provider-activation policy can exist.

## Decision-ledger uniqueness guard — 2026-09-28
- Resolved the newly introduced ADR collision by assigning the M09c review-binding decision to ADR-062; M10b retains ADR-061.
- Added a repository check that rejects any new duplicate ADR number.
- Historical duplicate IDs 028, 052 and 058 are explicitly grandfathered rather than silently renumbered, because changing historical identifiers can break existing references.
- The check also fails if one of those legacy exceptions changes unexpectedly, making future cleanup deliberate rather than accidental.

## M05c real due-item backend acceptance — 2026-09-28
- Used the isolated synthetic QA Auth identity, not a real learner account.
- A genuinely overdue revision row existed for a published anaphylaxis question under `bootstrap-binary-v1`; the current learner state showed one prior incorrect attempt and `latestCorrect=false`.
- Started a live hosted Supabase recommendation session through the same canonical stored procedure used by Study Now, with strategy `due-then-new-v2` and reason `mistake-repair`.
- Recorded the correct published answer through `study_record_attempt`, rebuilt the canonical revision projection, recorded the authoritative schedule decision, and advanced/closed the one-item session.
- Resulting revision state is now 2 attempts / 1 correct / 1 incorrect / `latestCorrect=true` / `consecutiveCorrect=1` with the next due time one day after the successful retrieval.
- Integrity checks passed: recommendation question matched attempt; revision `evidence_last_event_id` matched the attempt; authoritative `proposed_due_at` exactly matched revision `due_at`; the session closed at position 1.
- This closes the live backend/RPC acceptance part of M05c. The remaining M05c gate is transport-only: execute the same real due-item cycle through the authenticated `/study-now/start` + learner answer HTTP/browser path when a callable browser/JWT path is available.

## M10b visual interaction persistence — 2026-09-28
- Applied live migrations `20260928112019 m10b_visual_interaction_ledger` and `20260928112441 m10b_visual_interaction_fk_indexes`; exact SQL is committed under `supabase/migrations/`.
- Added service-only `study_visual_interaction_events` with RLS enabled, direct client writes revoked, exact media/session/question identity columns, and append-only UPDATE/DELETE protection through the existing learner-evidence guard.
- Added idempotent `study_record_visual_interaction(uuid,jsonb)`: exact retry returns the same receipt, same event ID with changed payload is rejected, session/question ownership is checked, and the media must be a prompt-linked asset for the exact question.
- Trusted localization evidence now requires the target concept to equal the event concept; any IoU requires an explicit matched annotation version, and a supplied annotation must match the exact media asset + concept.
- Extended `study_learning_event_stream_v1` with `media.interaction.completed` as an `observation` family while preserving `inferenceAuthority=false` and `masteryInferenceEnabled=false`.
- Privacy erasure scope advanced to v2 and now includes `study_visual_interaction_events` in scope validation, preview counts, atomic deletion and post-erasure completeness checks.
- Hosted synthetic-QA proof passed with a prompt-linked pathology image: one event persisted, exact retry stayed single-row, conflicting retry was rejected, replay returned the exact payload/source, and the temporary session was closed afterward.
- Privilege proof: anon/authenticated/service_role have no direct INSERT; service_role has SELECT plus RPC execution; authenticated has no RPC execution.
- Append-only mutation proof passed: direct UPDATE hit `learner_evidence_is_append_only`.
- Supabase performance advisor initially identified two new unindexed FKs; both were fixed, and the new visual table no longer appears under the unindexed-FK lint. Fresh indexes may appear under the expected unused-index informational lint until production traffic uses them.
- The security advisor's RLS-without-policy informational notice is intentional for this service-only table because client grants are revoked and no client policy is desired.
- Pure exact-head domain verification passed target-concept mismatch rejection, IoU-without-annotation rejection, and preserved `authoritativeForMastery=false`.
- Next M10b gate: add the authenticated application write route that derives trusted evaluation server-side, then run one full image interaction through that route before any recurrence-based visual mistake inference.

## M10b authenticated server-scored detection route — 2026-09-28
- Added `POST /sessions/:id/visual-detection` to the authenticated `study-api`.
- The client does **not** submit correctness, outcome, target concept, event identity or timestamp. It submits only requestId, current position, optionId, exact mediaAssetVersionId, helpUsed and optional interventionRef.
- The server resolves the owned session/question, validates the exact prompt media, derives the canonical primary concept and answer key, computes correctness, and records the ordinary immutable `question.answered` attempt first.
- The persisted attempt receipt carries the visual-detection intent/event ID; retries reuse that receipt. Reusing the same request key with changed visual intent fails with `visual_request_key_collision`.
- The server then builds `media.interaction.completed` from the stored scored attempt. Wrong options preserve observable option text but do not invent a distractor concept ID.
- Revision rebuild + authoritative schedule receipt remain driven by the canonical question attempt, not the visual event.
- Production eligibility requires the question to be published. Internal `in_review` visual questions require the existing internal tester principal plus current Medical/References/Rights approvals under `ai-test-review-v1`, with target hashes matching the current media-bound review targets.
- Detection-only is deliberate. Localization, free-text description and interpretation remain separate evaluation problems.
- `study-api` version 34 deployed successfully with the new shared visual-detection module. Deployed artifact verification confirmed route presence, server-side answer-key scoring, no `input.correct` consumption, current AI-test gate and visual-ledger RPC wiring.
- Exact-head helper verification passed correct/incorrect derivation and rejected a forced client/server correctness disagreement.
- Full authenticated HTTP invocation remains open because this execution environment has no learner session JWT and its local container cannot resolve the Supabase host. This is a transport-proof gap, not a deployment/compiler failure.
- No new AI provider, model call, mastery inference or recurring cost was introduced.

## M10b learner visual-detection UI wiring — 2026-09-28
- Added `cloud.visualDetection(...)` to the authenticated learner adapter. Its payload contains only response intent + exact media identity; it contains no learner ID, correctness, outcome, target concept or answer key.
- The medical learner UI now checks only an explicit server-returned `question.visualInteraction` descriptor. It does not infer task type from the mere presence of an image.
- When the descriptor is exactly schema v1 + `taskType=detection` + a media version actually present in the question prompt, answer submission uses `/sessions/:id/visual-detection`; otherwise the ordinary `/answer` path remains unchanged.
- The UI accepts the attempt receipt returned by the server and never computes correctness. It renders a distinct “IMAGE RECOGNITION · SERVER SCORED” affordance and, after success, explains that visual evidence is stored separately from the scored attempt.
- The server media adapter now passes through only a validated explicit visual-interaction descriptor from the canonical media prompt. No task classification is inferred in the browser.
- `study-api` v35 deployed successfully with the descriptor pass-through while retaining the v34 server-scored visual route.
- Exact syntax checks passed for `web/medical.js` and `src/adapters/cloud-study.js`; deployed artifact verification confirmed descriptor pass-through and the visual route.
- This path is intentionally dormant today because the canonical media prompt emits no visual-interaction descriptor yet. Existing medical study behavior therefore remains unchanged.
- Next M10b gate: after human review/publishing of the first visual detection item, make its canonical media prompt emit the explicit detection descriptor and execute the full authenticated browser/JWT interaction.

## M10b media-bound human review surface — 2026-09-28
- Added a reviewer-only media inspection packet to the existing authenticated review queue.
- For media-linked in-review questions, review-api now resolves the exact gate-specific `content_media_review_target`, current target SHA-256, media identities and signed 15-minute delivery URLs.
- The reviewer UI renders the exact image before the decision form, shows role/modality/dimensions/media version, exposes the current target fingerprint, and provides the exact gate-bound metadata in an inspectable detail block.
- Medical, References and Rights each remain distinct targets; the same visual question currently has one media item in all three target sets with distinct current target hashes.
- `content_media_review_target(text,text)` remains unavailable to anon/authenticated roles and is now explicitly executable only by service_role for the authenticated review backend.
- Live privilege proof: anon=false, authenticated=false, service_role=true.
- `review-api` v10 deployed successfully; deployed artifact confirms target RPC, current-hash RPC, signed media delivery and queue attachment.
- `web/review.js` exact-head syntax verification passed.
- This closes the reviewer-surface blocker. It does **not** create or impersonate human approval; the first visual question still requires an authorized human reviewer to inspect and decide Medical, References and Rights before publication.

## M10b canonical visual interaction profile — 2026-09-28
- Added immutable service-only `content_visual_interaction_profiles` and `content_register_visual_interaction_v1`.
- A profile can be registered only while the exact question version remains `in_review` and only against an exact prompt-linked media version.
- Registered `visual:pathology:clear-cell-rcc@1` + `media:pathology:clear-cell-rcc-grade1@1` as schema-v1 `detection`.
- `content_media_prompt` now returns the explicit canonical `visualInteraction` descriptor consumed by study-api v35 and the dormant learner UI.
- `content_media_review_target` now includes the same descriptor in Medical, References and Rights targets, so task-semantic changes invalidate prior reviews.
- Live proof: learner prompt descriptor and all three review descriptors resolve to the same detection/media identity.
- Existing AI-test review hashes became stale after this semantic addition, as intended; no human review existed, so no human approval was invalidated. Internal AI-test eligibility therefore fails closed until separately re-reviewed.
- Profile table is RLS-enabled, anon/authenticated inaccessible, service-role readable; registration RPC is service-only.
- UPDATE mutation was rejected by the existing immutable-media guard.
- Supabase advisor found no new unindexed foreign key for this table; RLS-without-policy is intentional because it is service-only.
- Human review remains the next authority gate.


## M02c source-grounded verification v1 — 2026-09-28

- Added `src/domain/source-grounded-verification.js` as a pure non-authoritative source/claim review-assistance contract.
- Atomic claim candidates are bound to exact source ID, source version, structured locator and SHA-256 passage/content digest.
- Source evidence distinguishes support / partial support / contradiction / not-found / ambiguity, authority class, and rights mode.
- Deterministic authority rules require current authoritative evidence for management/dose/contraindication/screening/prevention, regulator evidence for regulatory status, official exam authority for exam rules, and PYQ evidence for historical exam answers.
- Review routing is `routine` / `focused` / `expert`; every packet still sets `productionHumanReviewRequired=true` and `publicationAuthority=false`.
- The existing provider-neutral `content.source.inspect` and `content.review.propose` capabilities are reused; no new model provider or content agent was introduced.
- The pure content-domain source-rights enum now accepts `citation_only`, aligning it with the already-live rights-review system and existing controlled pilots.
- Added focused regression tests for immutable claim evidence, routine/focused/expert routing, current-authority requirements, high-risk escalation, deterministic-failure escalation, target-digest drift, malformed evidence and historical-vs-current claim separation.
- Added `docs/SOURCE_GROUNDED_VERIFICATION.md` with the exact textbook/source ingestion workflow, PYQ handoff, rights posture, planned adjunct schema, planned internal API and validation metrics.
- ADR-065 records that source-grounded automation assembles evidence but never becomes production medical authority.
- The live Medical Learning OS Supabase project was inspected read-only. No M02c tables exist and no DDL/migration was applied in this slice. Persistence remains deliberately gated until a controlled grounding batch demonstrates review-time benefit.
- Focused executable contract checks passed for routine routing, citation-only focused routing, contradiction escalation, authority escalation, duplicate-evidence rejection and citation-only catalog publication compatibility.
- PR #113 Foundation checks were triggered, but both GitHub Actions jobs failed before executing any step (empty step lists), matching the repository's current runner-infrastructure failure pattern. This is not recorded as a code-test failure or a green CI run.

### Next M02c gate

Run a controlled source-grounding experiment on a small real question/PYQ set using registered sources. Measure manual source-search time, reviewer correction rate, claim/evidence reuse, rights-review time and packet routing. Only if the layer demonstrably reduces review burden without worsening corrections should M02c gain persistent passage/claim/packet tables or an internal ingestion API.


## M02c first real source-grounding experiment — 2026-09-28

- Added `data/evaluations/source-grounding-cdc-co-v1.json` using seven existing in-review carbon-monoxide questions that all reference the same registered CDC Clinical Guidance source.
- The current CDC page was independently inspected and visibly reports July 8, 2024, matching the catalog source version `2024-07-08`; the source-version binding therefore passes for this pilot.
- Seven material claims are bound to exact source version + semantic locator + SHA-256 digest without storing copied source passages in the repository.
- Claim coverage is 7/7 direct support from one source, demonstrating a source-evidence reuse factor of 7 across the cluster.
- Rights posture is proposed as `public_domain` from CDC's agency-material policy, but production Rights review remains authoritative because CDC explicitly notes exceptions.
- Expected M02c routing is 0 routine / 5 focused / 2 expert. The two hyperbaric-oxygen treatment claims are high-risk and therefore remain expert-routed even with direct CDC support.
- No production Medical, References or Rights review was recorded; no source rights were resolved; no question was verified or published.
- Persistence remains deferred because this experiment proves evidence reuse and conservative routing, not actual reviewer-time reduction. The next acceptance signal is measured reviewer minutes + reviewer correction rate on the same packetized workflow.
- Focused execution of the exact pilot fixture passed: all seven packets matched their expected lane, all required production human review, and all had publication authority disabled.
- PR #114 Foundation checks again failed before step execution: both `check` and `browser` jobs returned empty step lists. This is recorded as the existing GitHub runner-infrastructure failure pattern, not a green CI result and not a demonstrated code-test failure.


## Source-first Rights review compression — 2026-09-28

- The authenticated reviewer workspace now deduplicates unresolved source-rights work before question-level Rights & provenance decisions.
- Live catalog measurement before merge: 174 in-review questions currently create 174 question→source links but only 37 unique unresolved sources, averaging 4.70 pending question links per source. The source-first workflow therefore removes the repeated source-resolution surface without weakening per-question review.
- On the Rights gate for question targets, unresolved sources are grouped by canonical `sourceId`, sorted by the number of pending questions they affect, and shown once with impact count.
- Repeated source-rights forms are removed from individual question cards while the source is unresolved.
- Question-level rights cards remain intentionally hidden until every referenced source has a recorded rights status; this prevents 174 blocked question cards from overwhelming the reviewer.
- A `restricted` source is considered resolved for workflow visibility, so affected questions surface for explicit rejection while approval remains disabled.
- Source resolution still does **not** approve a question gate, verify content or publish anything. The existing authenticated question-level rights decision remains mandatory.
- This is UI/workflow compression only: no new database table, no new privileged API, no change to review fingerprints and no change to publication authority.
- Focused syntax/contract checks passed for unique-source aggregation, impact sorting, source-resolution gating and preservation of manual `review.resolveRights(...)` submission.
- PR #115 Foundation checks again failed before executing any workflow steps: both `check` and `browser` jobs returned empty step lists. This remains a runner-infrastructure failure, not a green CI result and not a demonstrated code-test failure.


## Claim-first References inspection and executable checks — 2026-09-28

- Added an inspection-only References workspace over the existing CDC CO pilot. Identical canonical claim/evidence payloads share a card, keyed by SHA-256; affected question versions and conservative risk lanes remain visible.
- Matching requires the current queue question version, primary concept and every evidence source/version. Drift or missing metadata withholds the packet. Failed loading/validation clears assistance and preserves individual review. Out-of-order queue loads cannot replace a newer gate selection.
- The pilot has seven distinct claims and seven claim/question links: source reuse is 7x, but observed claim reuse is 1x. Synthetic tests exercise shared-claim grouping without claiming measured real-world savings.
- Passage excerpts do not exist in this pilot; the workspace truthfully displays locators/digests and asks the reviewer to inspect the source. No excerpts or medical judgments were invented.
- Existing per-question human review, rights and publication controls remain authoritative. No persistent shared claim decision, database/API change, production review, or publication was introduced. Persisting reusable human claim decisions remains gated by measured reviewer effort/correction rates under ADR-065.
- Found and repaired a real check-script syntax defect: literal backslash-n sequences and over-escaped ADR regexes prevented `scripts/check.js` from parsing.
- Full local execution exposed seven stale assertions/fixtures: CDC source count scoped to the relevant batch; production exam ordering scoped after its assembly; query guard scoped outside the prior route; current testingOnly UI flag; template-generated rights text; refactored media helper; and a structurally valid digest to reach the blocked-provider gate. These corrections do not alter production approval/security logic.
- Local verification: 553/553 tests passed; `npm run check` and `npm run demo` passed on Node 24.19.0.
- Added responsive References browser checks for phone/tablet/desktop, reload, switching gates, packet-fetch failure and zero automatic writes. Browser execution remains UNVERIFIED: local Chromium is absent and its download returned invalid archives. No live authenticated reviewer flow was exercised.
- GitHub run 36427834173, jobs 108946098604 and 108946098252, failed with no steps. Both have two annotations, but the connector rejects the annotations endpoint; log retrieval returns BlobNotFound. The actual runner-start root cause is unresolved, not proven to be billing, configuration or service outage. No blind reruns, paid runner changes or disabled gates were used.
- Next: inspect GitHub's job annotations through an authorized browser/dashboard path; restore runner execution; run the new browser checks and the existing responsive suite; then measure human review time and correction rate before persistent shared decisions.

## GitHub runner-start blocker identified — 2026-09-28

- Browser inspection of run 36430506899 confirmed GitHub's billing/spending-limit start refusal, not a workflow step failure.
- Read-only account billing inspection showed 2,000 / 2,000 included Actions minutes consumed, $0 billable Actions usage, and an Actions budget of $0 with Stop usage enabled. GitHub displayed an included-usage reset in three days. No payment/spending settings were changed.
- Foundation checks now run on pull requests, main pushes and manual dispatch, avoiding duplicate feature-branch push plus PR runs. Concurrency cancels superseded runs for the same PR/ref. All existing test/browser gates remain present; operational backup workflows are untouched.
- This conserves future allowance but does not restore exhausted minutes. PR #116 stays draft until browser verification and runner checks actually execute. A free-quota reset is the current zero-cost recovery path; do not repeatedly rerun while quota is exhausted.

## M02c matched review-workflow measurement — 2026-09-28
- PR #116's repaired executable checks and claim-first References workspace are now on main.
- Live backlog contains multiple untouched single-source clusters; the first matched operational comparison is fixed at 7 CO questions vs 7 ASA preoperative-fasting questions.
- Added immutable service-only `content_review_workflow_measurements` plus idempotent `record_content_review_workflow_measurement` and descriptive summary RPC.
- Measurement rows are written only after an existing human review receipt; reviewer/question/gate/target hash are derived server-side from that immutable receipt.
- The browser exposes an explicit optional M02c pilot selector only under References → Questions: `CO claim-first` and `ASA standard`. Ordinary review stays unmeasured unless a reviewer deliberately selects a pilot arm.
- The browser records both foreground-active milliseconds and elapsed wall milliseconds. Foreground time is a lower bound when source reading occurs in another tab; wall time is an upper bound if the reviewer pauses.
- Review measurement failure never rolls back or changes the human review decision.
- Summary output is explicitly `causal=false`; rejection rate is treated only as a correction-needed proxy.
- `review-api` v11 deployed successfully with authenticated write + summary routes; browser payload never contains reviewer identity.
- Live rolled-back smoke passed exact retry idempotency, conflicting retry rejection, append-only mutation blocking and descriptive summary generation. Rollback left 0 smoke rows and the live measurement table remains empty before the real pilot.
- Privileges: anon/authenticated cannot select or record; service_role can select and execute the record RPC.
- Supabase advisor shows no new unindexed foreign key for the measurement table. RLS-without-policy is intentional because the table is service-only.
- Persistence of reusable claim/passage/verification packets remains gated. The next M02c authority signal is now actual human completion of both matched References arms and comparison of total/median timing plus rejection/correction-needed proxy.

## Post-M08d reconciliation — 2026-09-28

- PR #117 is merged. Its retry run completed green: `npm run check`, full Node tests, demo, responsive browser checks and claim-first References browser verification all passed.
- PR #118 is merged and closes the final M08d browser gate. Foundation checks passed both jobs. Exam Mode browser acceptance passed at phone 390×844, tablet 820×1180 and desktop 1440×1000.
- The Exam Mode acceptance covers production-vs-internal readiness separation, internal mock start, 36-question palette, server-owned answer autosave, mark/unmark review, in-section navigation, no answer-key reveal, reload restoration, completed-run GT Autopsy loading and cancellation without completion score/autopsy.
- A real race in the acceptance script was fixed: the test now waits for asynchronous readiness cards instead of asserting while the UI legitimately shows `Checking simulator state…`.
- M08d is therefore DONE. M08 stays IN PROGRESS only because M08b still lacks genuine historical NEET-PG/INI-CET PYQ evidence.
- Current live catalog audit: 180 total questions, 174 in review, 6 published, 180 unique primary concepts, 0 reused primary concepts. This reduces the immediate value of heavier semantic-near-duplicate infrastructure; the existing lexical-overlap preflight remains the appropriate current guard.
- Current highest-value unresolved gates are now evidence/authority limited rather than missing core plumbing: M02c needs human matched References-review measurements; M05c needs a real authenticated learner browser/JWT transport proof; M08b needs genuine historical PYQ evidence; M09c needs human semantic provider review; M10a/M10b need human visual-content review and publication.
- GitHub Actions execution is currently restored and green on the latest merged work. The earlier included-minutes billing/start refusal remains historical context, not a current execution blocker.

## M02c reviewer pilot dashboard — 2026-09-28
- The authenticated References workspace now reads the existing service-derived `content-review-workflow-measurement-summary-v1` for `m02c-references-workflow-v1`.
- Each matched arm shows measured decisions out of 7, median foreground-active time, median elapsed-wall time and rejection/correction-needed proxy.
- The dashboard uses the canonical experiment configuration for labels, source identities and expected counts; no duplicate experiment definition was introduced in the UI.
- Partial results are explicitly non-verdict evidence. Even when both arms complete, the interface does not rank them or infer a winner; it tells the reviewer/operator to consider timing and correction signals together.
- Summary payloads are accepted only when contract ID, experiment ID, workflow array and `causal=false` match the expected contract.
- Summary load/validation failure clears the summary, leaves References review usable and never reuses stale results.
- The dashboard is read-only. It adds no approval, reviewer-scoring, publication or claim-verification authority.
- Responsive browser coverage now includes dashboard rendering at phone/tablet/desktop widths while retaining the zero-automatic-write assertion.
- The remaining M02c gate is unchanged and irreducibly human: complete the two matched References arms, then assess whether measured review effort falls enough without a worse correction signal to justify persistent claim/passage/packet infrastructure.

## M14 latest-backup recoverability foundation — 2026-09-28
- Weekly Supabase → private R2 backup is operational; scheduled run 36283198880 succeeded on 2026-09-27 through dump, upload and remote-object verification.
- The previous R2 restore workflow was pinned to the 2026-09-25 archive, so it did not prove that the newest backup remained recoverable.
- The recovery drill now discovers the newest canonical `supabase/YYYY/MM/DD/YYYYMMDDTHHMMSSZ/backup.tar.gz` object automatically, downloads its checksum companion and rejects missing/noncanonical inventory.
- Recovery validates archive SHA-256, all three inner SQL SHA-256 values, source project, repository, numeric originating run/attempt, backup age <= 9 days, and a bounded prefix-start → manifest-completion interval.
- The first stricter run correctly failed because exact prefix/manifest second equality was an invalid assumption: the prefix is captured before dumps while the manifest is created afterward. The invariant was corrected to require a nonnegative <=30-minute dump window.
- Run 36449290932 then passed end to end against latest backup `supabase/2026/09/27/20260927T004033Z`, originating from backup run 36283198880. At verification time it was about 1 day 15.5 hours old.
- That backup restored into disposable local Supabase and the restored `study_catalog`, `study_sessions`, `study_attempts` and `study_bookmarks` data matched the dump exactly with RLS present.
- No live database was mutated by the recovery drill.
- Full recovery is scheduled monthly at 00:30 UTC on day 1 plus manual dispatch, while backups remain weekly. This preserves current evidence without burning weekly Actions minutes on a Docker/Supabase restore.
- Current Supabase security advisor has one actionable Auth warning: leaked-password protection is disabled. The numerous RLS/no-policy notices remain informational only for intentionally service-only tables and require continued grant-boundary discipline.
- M14 is now IN PROGRESS. Next gates are Auth hardening, consolidated runtime/alert evidence, explicit Render service-health audit after workspace selection, and production-shaped capacity/load evidence.

## M14 service-boundary privilege drift guard — 2026-09-28
- Audited every current RLS-enabled public table with zero policies. All 25 are inaccessible to both `anon` and ordinary `authenticated` for SELECT/INSERT/UPDATE/DELETE.
- Audited all public `SECURITY DEFINER` functions. None are executable by `anon` or ordinary `authenticated`.
- A broader public-function audit found one residual default grant: trigger-only `block_content_review_measurement_mutation()` was directly executable by browser roles. It was not used by the browser application and is not a normal RPC, but it violated the intended service-only boundary.
- Migration `20260928164037_m14_revoke_trigger_function_browser_execute.sql` revokes that direct browser execution and retains backend service execution.
- Post-fix live proof: 25 service-only RLS/no-policy tables, 68 SECURITY DEFINER functions and **0 browser-executable functions in the public schema**.
- Added `supabase/verification/service-boundary-audit.sql`. It fails if an RLS/no-policy table gains browser DML access or if any public function becomes browser-executable.
- The existing weekly Supabase→R2 backup now runs this live audit before creating a dump, so privilege drift blocks backup/release evidence instead of becoming silent configuration debt.
- The audit step installs `postgresql-client` only when `psql` is absent, avoiding runner-image assumptions.
- Remaining Supabase Auth warning: leaked-password protection is disabled. The connected Supabase tools expose the advisor but not an Auth-config write operation, so that dashboard/control-plane setting remains externally gated.

## Google OAuth learner entry — 2026-09-28
- Google was added as a Supabase Auth provider by the project owner.
- Before app wiring, the live Auth schema contained 0 Google identities/users and 3 email identities; provider configuration had therefore not yet been exercised by a learner.
- The existing custom Auth adapter now generates a provider-scoped hosted Supabase OAuth authorize URL for Google only.
- OAuth return URLs are restricted to HTTPS, except localhost/127.0.0.1 HTTP during development.
- No Google client secret, operator credential or provider access token is added to browser storage or application data.
- Google and email/password both resolve to the same canonical Supabase Auth user UUID. No second account/learner mapping layer was introduced.
- The account page now exposes `Continue with Google` while preserving email/password as an alternative.
- The existing callback path remains authoritative: returned Supabase access tokens are checked against `/auth/v1/user` before session persistence, then token-bearing fragments are scrubbed from browser history.
- Unit/browser coverage verifies provider scoping, redirect validation, no client-secret parameters, and correct hosted authorize URL construction.
- A temporary branch-only live smoke verifies the hosted Auth service reports Google enabled; the workflow will be removed before merge.


## Google OAuth live learner proof + Study Now resume clarification — 2026-09-28
- A real Google OAuth sign-in completed against the hosted learner account path. Live Auth now has one Google identity in addition to the existing email identities.
- The Google identity linked to the learner's existing Supabase Auth user rather than creating a duplicate learner. The canonical learner UUID therefore remained stable across email/password and Google provider entry.
- The learner then selected a 10-minute Study Now window through the real browser/JWT path.
- Study Now correctly found an older unfinished session. That session already had a persisted answer receipt, so the browser restored the previously selected/correct option and explanation instead of accepting a duplicate answer.
- The learner finished that session through the authenticated browser path; live state now shows zero open sessions for that learner.
- This proves real Google OAuth → authenticated Study Now start/resume → authenticated session completion transport. It does **not** yet prove a fresh Study Now recommendation → fresh browser answer → revision-reschedule cycle, so M05c remains IN PROGRESS.
- The resume behavior was technically correct but visually ambiguous. The learner UI now explicitly announces when Study Now resumed an unfinished session, and distinguishes the case where the current question had already been answered.
- Responsive browser verification now includes the answered-session resume state and asserts that the saved option is visibly checked/disabled rather than presented as a new unanswered item.


## M08b first genuine historical evidence pilot — 2026-09-28
- The prior M08b model exposed a provenance trap: recalled historical evidence could only attach to a learner question version. The available CPR learner versions are explicitly grounded in 2025 AHA guidance, so attaching the May 2023 INI-CET recall to those versions would have created misleading temporal provenance.
- Migration `20260928180541_m08b_historical_exam_item_evidence.sql` adds a separate append-only/retractable `historical_exam_item_events` ledger. Reconstructed historical items store a nonverbatim summary plus canonical concept links; they do not store recalled stems, options or answer keys.
- Added verified occurrence `ini-cet:2023-07`. The official AIIMS July-2023 notice identifies the written CBT date as 07 May 2023; occurrence verification does not claim official question wording.
- First live item: `ini-cet:2023-07:recall:cpr-quality@1`, evidence event `cc7a15b5-97fb-40cf-b743-db3e92061308`.
- The item maps to three existing canonical concepts: adult compression depth 5–6 cm, compression rate 100–120/min and 30:2 compression-to-ventilation ratio.
- PrepLadder, ReflexPrep and Oncourse AI publicly reproduce the same CPR recall pattern. Because their upstream recall independence is unknown, the event is deliberately classified `single_recall`, not `corroborated_recall`.
- Historical medical plausibility was checked against the official 2020 AHA CPR/ECC highlights; this validates the medical facts for that era, not the existence or exact wording of the recalled exam item.
- Exam DNA is now contract `exam-dna-observation-v2`. Live INI-CET projection: 1 active assertion, 1 historical item, 1 occurrence, 0 exact learner question versions, 1 single-recall item, 0 corroborated items, with explicit `recall-source-lineage-unverified` and sparse/single-occurrence uncertainty.
- The new table and all historical-item RPC/helper functions are inaccessible to `anon` and ordinary `authenticated` roles. Service-role read/write boundaries are preserved.
- Post-migration security advisor adds only the expected RLS-without-policy INFO for this service-only table. No new unindexed-FK finding was introduced. The pre-existing leaked-password-protection Auth warning remains unchanged.
- M08b remains IN PROGRESS. The next authority signal is breadth across real exam occurrences/years, not more schema: ingest additional defensible NEET-PG/INI-CET historical items while preserving recall-lineage uncertainty and avoiding copied PYQ text.


## M08b minimum historical baseline closed — 2026-09-29
- The user explicitly chose a minimum-sufficient ingestion strategy rather than building a large PYQ corpus before downstream product work needs it.
- Added verified occurrence `neet-pg:2024`. The official NBEMS revised-schedule notice dated 05 July 2024 states that NEET-PG 2024 was conducted on 11 August 2024 in two shifts. The occurrence record does not claim an exact shift for the recalled item.
- Added live historical item `neet-pg:2024:recall:acute-angle-closure@1`, evidence event `206959d0-be1f-4dd5-9641-cc928f307a96`.
- The item stores only a nonverbatim reconstruction: acute eye pain/visual difficulty after a dark environment with recognition and emergency pressure-lowering management of acute angle-closure glaucoma. No recalled stem, options, image or answer key is stored.
- It maps to existing canonical concepts `ophthal:glaucoma:angle-closure-emergency` and `ophthal:glaucoma:treatment-modalities`.
- Oncourse AI, a Scribd recall compilation and an Adda247 recall paper contain the same broad fact pattern, but their upstream recall independence and exact shift attribution are not established. The event therefore remains `single_recall` with `sourceLineageStatus=unknown`.
- Historical medical plausibility was checked against the American Academy of Ophthalmology 2020 Primary Angle-Closure Disease Preferred Practice Pattern, which treats acute angle-closure crisis as an urgent symptomatic high-IOP state requiring medical IOP reduction followed by definitive iridotomy.
- Live Exam DNA baseline now contains **2 active historical assertions / 2 historical items / 2 verified exam occurrences / 2 exams / 2 years**: INI-CET 2023 and NEET-PG 2024. Both are single-recall evidence; no false corroboration or frequency inference is claimed.
- This is the deliberate M08b stopping point. Bulk PYQ ingestion is not required for the next implementation steps and will resume only when a concrete Exam DNA analysis, validation experiment or learner-facing recommendation policy requires additional breadth.
- M08b is now DONE at the minimum genuine-evidence baseline. With M08a/M08c/M08d already done, M08 is DONE.


## M11a delayed retrieval measurement foundation — 2026-09-29
- M11 has started because delayed-outcome evidence is the current cross-system bottleneck for M05d scheduler validation and M07c Digital Twin inference.
- Live migration `20260928192031_m11a_delayed_retrieval_observation_projection.sql` adds service-only `study_delayed_retrieval_observations_v1(learner)`.
- The projection is rebuildable from existing immutable attempts plus optional memory ratings, Study Now recommendation receipts and schedule-policy decision events; it writes no new learner evidence.
- Each origin attempt is linked to the first later retrieval of the same exact question version with exact elapsed milliseconds, correctness and response time.
- The same origin also exposes the first later different-question attempt sharing the canonical concept as a transfer candidate, plus the number of intervening same-item attempts. Transfer is not asserted merely from concept identity.
- Summary coverage reports observed same-item follow-ups at or beyond 1/7/30/90/180 days. These are coverage counts only, never retention probabilities.
- Live beta proof for the most active learner currently shows 3 origin attempts, 2 later same-item retrievals, 2 explicitly rated origins, 0 transfer candidates and **0 follow-ups at ≥1 day**. The observed gaps were approximately 13.18 hours and 8.6 minutes.
- That zero delayed coverage is an important result: current data are insufficient to validate a forgetting model, FSRS authority or inferred mastery. M05d and M07c therefore remain correctly gated.
- Browser roles cannot execute the projection; `service_role` can. No new table, RLS policy or learner-facing authority was added.
- Supabase security advisors show no new warning from M11a. The existing leaked-password-protection warning remains the only actionable Auth warning.
- M11a is DONE. The next research step is a preregistered retention-probe/analysis protocol or naturally accumulated delayed evidence, not synthetic backfilling.


## M11b0 retention-probe readiness gate — 2026-09-29
- Live migration `20260928193141_m11b_retention_probe_readiness.sql` adds service-only `study_retention_probe_readiness_v1()`.
- The readiness projection distinguishes question identity from question version. Two versions of the same question never count as an alternate item.
- It audits published primary concepts, distinct published questions, structurally possible alternate-item pairs, and in-review alternates that target an already-published primary concept.
- Current live catalog: **6 published question versions, 6 distinct published question identities, 6 published primary concepts, 0 concepts with a published alternate, 0 published alternate-item pairs, and 0 in-review alternate candidates on those published concepts**.
- Therefore a real alternate-item retention probe is structurally blocked. The system explicitly returns `canActivateAlternateItemProbe=false`.
- The blocker is content structure, not missing scheduler code. No Study Now change or same-item early resurfacing was introduced.
- Any future alternate probe item must pass the existing Medical, References and Rights review gates before publication. The retention protocol/horizons must then be preregistered before the first assignment.
- Browser roles cannot execute the readiness projection; `service_role` can. The function is read-only and creates no learner evidence.
- Supabase security advisors show no new warning from this change. The pre-existing leaked-password-protection warning remains unchanged.
- M11b is now IN PROGRESS. M11b0 readiness is DONE; protocol activation remains correctly gated by reviewed alternate-item content.

## Connected-learning pilot 08 — 2026-09-29

- Reconciled the latest user request for gap-sized notes/concepts against current main `56f9696`, live catalog v35 and M11b0 readiness. Retrieved chat summaries did not include the full latest normal-chat transcript; no full-chat audit is claimed.
- Added **2 original alternate-question candidates** to existing anaphylaxis and rabies wound-washing concepts; added **2 original rabies note candidates** for wound washing and category-III passive prophylaxis. Reused the existing published anaphylaxis note without modification. No new concept copies or forced 19-subject clinical mappings.
- Batch `connected-learning-08` / `5f83cfc8-a3ed-41fa-9805-dfa539cefc42` passed live structural/exact-dedup validation and lexical overlap preflight (threshold 0.55, zero flags; this is not semantic equivalence/novelty validation). Promoted through the existing service-only intake function, catalog **v35 → v36**.
- Live catalog now has **182 questions, 6 published**. The two new questions are `in_review`, with zero review records. The 180-item internal-test inventory was not expanded by AI-test approvals.
- WHO Rabies guidance dated **2026-09-17** was directly checked and registered as `who:rabies-fact-sheet:2026-09-17`, rights **unknown**. Existing CDC narrative guidance was checked for the no-rash anaphylaxis scenario. NRCP fetches failed; existing NRCP content was not altered or claimed freshly reverified.
- Created notes through `neural_create_canonical_note_draft` with explicit `ai_generated_original` provenance and the existing AI-draft author principal, then submitted through the existing lifecycle. Wound note v1: `e376bc26-0592-49ac-af04-d407a435de58`; category-III note v1: `5488e1b3-aa63-47cd-91cc-dcefb51a0d2b`. Both are **in_review**, with zero review events. The existing published note remains v1 (`6ac9305b-2ce1-4fdb-9705-fa22c8eefa12`).
- Read-only live verification confirms **2 pending alternates on 2 published concepts**, **0 published alternate pairs**, `canActivateAlternateItemProbe=false`, and no automatic publication or probe scheduling. No learner history was written.
- Added dependency-free `content-connections-authoring-v1`, an authoring projection and command-line audit, plus **9 regression tests**. Tests distinguish primary versus secondary links, one-to-one/one-to-many/note-only cases, question identity versus revision, invalid anchors/provenance, retired content and synthetic 19-subject topology. They run in the existing PR/main CI via `npm test`; they do not establish clinical coverage of all 19 subjects.
- Local verification: **603 tests pass**, `npm run check`, `npm run demo`, the connection-audit command and `git diff --check` pass. No dependency, schema, privileged API, paid provider, scheduled job or recurring infrastructure cost was added.
- Hosted browser: Render homepage and Cloud Account sign-in page loaded. This browser has **no authenticated learner session**. No private account state, answering, annotations, or fresh Study Now → revision/reschedule acceptance is claimed. Existing browser CI remains the isolated regression path; no UI code changed in this slice.
- Next: independent Medical/References/Rights review and separate publication of the pilot; then preregister/evaluate alternate-item protocol suitability. The authenticated fresh Study Now browser gate also remains open. See `CONNECTED_LEARNING_PILOT.md` and `supabase/verification/connected-learning-pilot.sql`.


## Human-review bottleneck reduction — 2026-09-29
- The remaining connected-learning gate was not missing medical content or reviewer authorization; it was repetitive review mechanics. Live state before this slice had 176 in-review questions and 176 pending decisions in each of Medical, References and Rights, while the M02c References experiment still had zero measured human decisions.
- Added service-only `record_full_question_review_bundle`. For an exact unreviewed question, one reviewer who currently holds all three grants can make one explicit full-target attestation with separate Medical/References/Rights notes. The database then calls the existing canonical `record_content_review` path three times in one transaction, preserving three independent immutable target hashes/receipts. It never publishes.
- The shortcut appears only when the exact question has zero prior review events, all three grants are active, source rights are already valid and complete review-assist drafts exist. If any gate is not approvable, the existing individual reject path remains available.
- The connected-learning anaphylaxis alternate `emergency:anaphylaxis:no-rash-first-action@1` is the minimal downstream unlock candidate because its CDC source already has current citation-only rights evidence. Its Medical/References/Rights preflight now includes editable draft notes, but no human approval has been fabricated.
- Added M02c References workflow v2: each matched seven-question arm is reviewed in one human session. The reviewer still selects approve/reject and retains an editable note for every item, then one attestation atomically records all seven canonical References receipts plus one batch timing record. A failure or target drift rolls back the whole batch.
- The old v1 measurement history remains intact. V2 changes submission mechanics, not the treatment/comparator source identities or review authority.
- Both new mutation functions are service-only; reviewer identity remains derived from authenticated JWT at the review API. Browser payloads never contain reviewer UUID.
- Actual production review remains human authority. These changes reduce navigation/submission overhead; they do not let AI/source preflight become a reviewer.


## Learner correction + reviewer triage live parity — 2026-09-29
- PR #131 (`feat: add learner-private correction overlays`) is merged. Its Foundation checks passed both the full check/test/demo job and the focused responsive browser correction flow.
- Live Supabase migration history includes `m06d_personal_correction_overlay`, privacy scope v3 and `m02d_learner_report_triage`.
- `study-api` was redeployed from current main as **v38** with its existing `verify_jwt=false` configuration preserved because request authentication is enforced inside the function. The deployed `index.ts` is byte-for-byte identical to current main.
- `review-api` is live as **v14** and its deployed `index.ts` is byte-for-byte identical to current main. Learner-report triage routes/evidence are present there.
- Privacy scope v3 remains complete and explicitly covers `learner_content_issue_reports`; normal report evidence is append-only while privacy erasure retains its narrow transaction-scoped delete exception.
- No learner report exists yet in live production, so no human triage decision has been fabricated. M02d remains IN PROGRESS until one real learner report → authorized human triage lifecycle is observed.
- M06d likewise remains IN PROGRESS until one real authenticated hosted learner performs private correction → refresh persistence and optional report submission while canonical content remains unchanged.


## M11b1 preregistered retention-probe feasibility protocol — 2026-09-29
- The connected-learning anaphylaxis alternate `emergency:anaphylaxis:no-rash-first-action@1` had three current human approvals (Medical, References, Rights) and passed a rollback publication smoke through the existing server-only publication gate.
- It was then separately published. Live catalog readiness is now **7 published question versions / 7 distinct question identities / 6 primary concepts / 1 published alternate-item pair**.
- The structural blocker `no-published-alternate-item-pair` is therefore removed.
- Live migration `20260928224239_m11b1_retention_probe_preregistration` adds immutable service-only protocol registry `study_retention_probe_protocols`, preregisters `retention-probe-feasibility-v1`, and exposes read-only protocol/activation-readiness functions.
- Protocol SHA-256: `3877a0083b95481911966d2109c395f03065c7fc62381df29e4a809311ff19c9`.
- Fixed feasibility choices before any assignment: 7-day target, 6–8 day window, max 1 probe/learner/7 days, max 20 total assignments, max 56 days from first assignment, no displacement of due/mistake-repair work, explicit learner opt-in required.
- Clean descriptive analysis excludes observed same-concept contamination or prior target exposure. Outside-platform exposure remains potentially unobserved.
- Primary endpoint is alternate-item correctness inside the 6–8 day window. Response time, optional memory rating, window completion, contamination and transport failure are secondary descriptive outcomes.
- No causal claim, hypothesis-testing claim, mastery/forgetting inference or model fitting is authorized.
- Activation remains **false**. Current blockers are validated alternate-pair novelty/comparability metadata, learner opt-in path, and separate activation authorization.
- Supabase security advisor added only the expected service-only RLS/no-policy INFO for the new protocol table; leaked-password protection remains the single actionable Auth WARN.


## M11c exact-pair transfer validation foundation — 2026-09-29
- Resumed from merged PR #135 / M11b1 rather than restarting the earlier content-review pilot. The next bounded research task was M11c.
- Live migration `20260929030036_m11c_transfer_pair_validation` adds immutable, service-only exact-version pair validation plus current Medical-target SHA binding, stale-validation detection and `study_validated_transfer_observations_v1(learner)`.
- Live migration `20260929030109_m11c_transfer_pair_validator_index` adds the covering validator foreign-key index identified by the post-migration performance advisor.
- Live migration `20260929030652_m11c_refresh_structural_readiness` removes the obsolete nested `protocol-not-preregistered` blocker from the content-only readiness projection; protocol and activation state now live only in their dedicated layers.
- Pair validation records surface novelty, primary-construct alignment, reasoning alignment, difficulty comparability and cue-overlap risk. Generic descriptive transfer validity and stricter retention-probe comparability remain separate decisions.
- Bootstrap validation authority requires one human who currently holds Medical, References and Rights reviewer grants; authors cannot validate their own pair. No dedicated research-role system was added.
- A clean validated-transfer observation additionally requires no prior target-item attempt and no intervening same-concept attempt. Outside-platform exposure remains potentially unobserved.
- Browser roles cannot SELECT the pair table or execute the record/readiness/validated-transfer RPCs; service role access passed live privilege checks.
- Live pair readiness is intentionally **0 total validations / 0 current transfer-valid pairs / 0 retention-probe-comparable pairs**. No human pair judgment was fabricated.
- Retention-probe activation remains **false**. Current blockers are validated pair metadata, learner opt-in, and separate activation authorization. Study Now, FSRS authority, mastery/forgetting inference and causal claims remain disabled.
- Post-migration security advisor shows only the expected service-only RLS/no-policy INFO for the new table plus the pre-existing leaked-password-protection WARN. No new security WARN was introduced.
- The SQL passed a live rollback compile before promotion. Repository tests/CI are added in the M11c PR; the first persistent pair decision remains a separate human-review step.


## 2026-09-29 — Beta product UI + singleton content admin

- Retired the M03 local demo from the root application surface; root now opens the authenticated beta Preparation Command Center.
- Beta learner navigation is Home / Study / Exams / Vault / Account. Admin appears only after server-side admin confirmation.
- Added a singleton `content_admin_account` governance layer. Live preflight found exactly one active reviewer and that account already holds all three Medical / References / Rights grants, so no authority migration is required.
- Review API now resolves admin authority server-side before returning review grants or queues.
- Added Admin Console for content governance and M11c transfer/retention pair validation.
- Learners retain issue-reporting and personal correction paths but receive no approval controls.
- Removed demo modules from the served public allowlist.
- Study Now home links can deep-link into 10/20/30/60-minute authenticated sessions.
- No retention probe is activated by this change; learner opt-in and separate activation authorization remain required.


## 2026-09-29 — M11d retention-feasibility learner opt-in path

- Added append-only `study_retention_probe_consent_events`.
- Consent is bound to the exact preregistered protocol ID + SHA-256 and comes only from the JWT-derived learner identity through `study-api`.
- Added explicit opt-in and withdrawal UI to Account with the 7-day horizon and burden caps visible before opt-in.
- Repeating the same current decision is idempotent; withdrawal is a new immutable event.
- Browser roles cannot read/write the consent ledger or execute consent RPCs directly.
- System activation readiness now recognizes that an opt-in path exists, but `canActivate=false` and `probeSchedulingEnabled=false` remain hard-coded.
- No learner has been auto-enrolled by this implementation.


## 2026-09-29 — Unified verified-email authentication
- Confirmed live Auth has zero duplicate-email user groups.
- Confirmed an existing account already carries both email and Google identities under one Supabase user, validating Supabase automatic same-email linking in the live project.
- Account UI now explains that Google and email/password are sign-in methods on one learner account.
- Auth session normalization retains provider names only, not OAuth identity payloads or tokens.
- Google-first accounts can add password sign-in while authenticated without creating or migrating learner data.
- Password-only accounts are told that later Google sign-in with the same verified email auto-links to the same learner ID.


## 2026-09-29 — Same-account password recovery
- Added password recovery request from the signed-out Account surface.
- Recovery response is intentionally generic to avoid account enumeration.
- Recovery callback type is preserved by the auth adapter.
- A verified recovery session can set a new password through the existing authenticated user update path.
- Password recovery keeps the same Supabase user ID and therefore the same learner history.
- No separate learner record or merge workflow is introduced.


## 2026-09-29 — M11e admin research gate
- Admin transfer-pair queue now includes the canonical `study_retention_probe_activation_readiness_v1()` result.
- The admin UI promotes the currently blocking human pair validation instead of presenting all research work as equivalent.
- Readiness automatically advances from the canonical backend state after a genuine immutable pair-validation event.
- Separate activation authorization is displayed as a later gate but no activation endpoint, button or scheduler authority exists.
- This slice does not fabricate human review, activate probes, alter Study Now or create mastery/forgetting inference.


## 2026-09-29 — M11c human review packet
- The blocking transfer-pair admin surface now includes a compact evidence packet for each exact question version.
- Packet fields are descriptive only: source title/version, source rights status, provenance kind, change reason and existing Medical/References/Rights decisions.
- The packet intentionally does not preselect novelty, construct alignment, reasoning alignment, difficulty comparability, cue-overlap risk or retention-probe comparability.
- Human attestation remains required for the immutable pair decision; activation authority remains absent.


## 2026-09-29 — M11f1 activation-authorization governance
- Added append-only authorize/revoke evidence for retention-feasibility activation governance.
- Authorization is bound to the exact preregistered protocol SHA-256 and exact immutable pair-validation SHA-256.
- Only the singleton content admin may authorize or revoke; reviewer identity is derived server-side.
- Authorization refuses unless the pair is still published/current and human-validated as retention-probe comparable.
- At least one learner must currently be opted in before authorization can be issued.
- Assignment caps cannot exceed the preregistered protocol, and authorization validity cannot exceed 56 days.
- Revocation remains possible even if later eligibility deteriorates.
- Probe scheduling, Study Now authority and mastery/forgetting inference remain disabled.


## 2026-09-29 — M11f2 dormant probe scheduler kernel
- Added immutable learner-scoped `study_retention_probe_assignments`.
- Added service-only candidate selection and one-at-a-time scheduler tick functions; no cron or browser/Admin execution route exists.
- Candidate origin attempts must occur after both learner opt-in and activation authorization, keeping the feasibility pilot prospective rather than retrospectively enrolling old learning.
- Scheduler enforces the preregistered day 6–8 window, no prior target attempt, no intervening same-concept attempt, protocol/authorization caps, max one probe per learner per rolling 7 days and the 56-day feasibility horizon.
- Probe work is blocked while any overdue revision, unresolved latest-incorrect item or open Study Now session exists.
- Added delivery-readiness recheck for consent, current authorization, pair/content freshness, timing window, target exposure, contamination and workload priority immediately before any future learner exposure.
- Automatic execution remains disabled and there is still no learner delivery surface.
- Privacy scope advances to v5 and includes scheduled probe assignments in preview, erasure and residue verification.


## 2026-09-29 — M11f3 delivery-evidence kernel
- Added append-only learner-scoped `study_retention_probe_served_events` and `study_retention_probe_response_bindings`.
- Assignment, server-served delivery and answered-response evidence are now distinct states.
- Server-served receipts bind the exact learner-safe question payload, payload SHA-256, catalog version and current medical-content SHA-256.
- Idempotent replays return the exact originally served payload instead of reconstructing from a possibly changed catalog.
- “Server served” explicitly does **not** claim learner render, learner view or cognitive exposure.
- Response binding requires the exact target question and a server-timestamped answer after serve; out-of-window or intervening same-concept activity is preserved as contamination metadata rather than erased.
- Added `study_learning_event_stream_v2()` with research assignment, server-served and response-binding families while retaining zero mastery/forgetting inference authority.
- Privacy scope advances to v6 with served + response evidence covered by preview, erasure and residue verification.
- Learner delivery route, render acknowledgement and automatic execution remain disabled.


## 2026-09-29 — M11g descriptive feasibility analysis
- Added service-only `study_retention_probe_feasibility_report_v1()`.
- The report keeps assignment, server-served, response and clean-response counts separate and exposes funnel rates only when denominators exist.
- The preregistered primary outcome is reported as descriptive clean accuracy only; the current zero-evidence baseline returns `null`, not 0% or another fabricated estimate.
- Secondary outputs include response timing, optional memory-rating summaries, observed contamination rate/reasons, expired unserved assignments and expired served-without-response counts.
- Transport failure remains `null` / unavailable because nonresponse alone cannot distinguish technical failure from non-view or learner choice.
- Pair-level results retain exact validation SHA, concept, origin version and target version.
- Admin now receives the report in the canonical research gate under **FEASIBILITY EVIDENCE · DESCRIPTIVE ONLY**.
- No causal inference, hypothesis testing, mastery fitting, forgetting fitting, activation authority or learner-facing analytics are introduced.


## 2026-09-30 — M05c Study Now completion-integrity gate
- Live preflight found 3 learner accounts, 7 published questions, 10 attempts, 7 revision rows, 2 Study Now recommendations and 2 real memory ratings.
- One historical Study Now recommendation already has a complete server evidence chain: selected item attempted, session closed and authoritative schedule-decision evidence present. It predates browser-transport instrumentation, so it is not retroactively labeled a hosted-browser proof.
- A second live recommendation is currently open at 4/6 answered; all four answered items already have authoritative schedule-decision evidence. Two selected items remain unanswered.
- Added append-only `study_recommendation_transport_events`, recorded only for newly persisted attempts in Study Now recommendation sessions.
- Transport class is derived inside `study-api` from allowed Origin + `Sec-Fetch-Mode`; stored values are only `hosted-browser-cors`, `local-browser-cors` or `authenticated-api`. No user-agent, IP address, exact origin or device fingerprint is persisted.
- Idempotent answer retries cannot manufacture a browser proof because transport evidence is written only when the returned attempt event ID matches the newly proposed server event ID.
- Added service-only `study_now_completion_integrity_v1(learner)`. M05c hosted completion requires session closed + every selected item attempted + an authoritative schedule decision for every selected attempt + at least one newly persisted hosted-browser answer.
- Memory rating is explicitly optional for M05c completion and remains separate evidence for M05d.
- Learner UI reads the authenticated integrity projection after session close and can display whether the Study Now loop is fully linked.
- Privacy scope advances to v7 and includes Study Now transport evidence in inventory, preview, deletion and residue verification.
- Live-schema BEGIN/ROLLBACK verification reports privacy scope complete with zero unmapped learner tables. No production transport evidence has been fabricated.


## 2026-09-30 — M05d Memory Engine evidence-readiness
- Added service-only `study_memory_engine_evidence_readiness_v1()`; it is read-only and has no scheduler, experiment-arm, production-promotion or mastery-inference authority.
- Live evidence snapshot: 3 learners, 10 attempts, 2 explicit memory ratings, 20% rating coverage, 1 rated learner-question history, 0 fully-rated learner-question histories, 3 same-item follow-ups, 0 same-item follow-ups at or beyond 1/7/30/90/180 days.
- There are 9 authoritative bootstrap schedule decisions but 0 paired authoritative + FSRS-shadow decisions, so no learner is currently eligible under the draft paired-scheduler experiment contract.
- `scheduler-bootstrap-vs-fsrs-v1@1` remains draft, with `minimumEligibleLearners=null`, metric contract status `draft`, `canArm=false` and assignments disabled.
- Rating timing is exposed descriptively (mean/median/max lag) but no eligibility cutoff is invented. A timing rule must be preregistered before ratings are used for an experiment claim.
- The canonical blockers explicitly include missing preregistered population/metric thresholds, no fully-rated history, no paired shadow decisions and no ≥1-day/≥7-day delayed retrieval.
- Next evidence action is prospective collection, not FSRS promotion. Numeric thresholds are intentionally not invented from the current tiny sample.


## 2026-09-30 — confirmed study writes survive projection outages
- Continued the latest Task 1 checkpoint (M05c/M05d); PRs #148/#149 are already merged. Current repository also includes the separate Admin Plugin PRs #150/#151.
- Found and fixed a learner continuity defect: after `cloud.answer` acknowledged a canonical receipt, a failed `cloud.progress` read incorrectly reported that the answer was not confirmed. After `cloud.next` acknowledged closure, the same projection failure incorrectly reported that the session did not advance and skipped integrity reconciliation.
- Progress refresh after these writes now has its own failure boundary. Confirmed receipts/cursors remain authoritative, optional memory ratings and Next remain available, and completion integrity is still requested when progress is unavailable. Actual write failures retain the existing idempotent retry behavior.
- Added five executable UI-controller regression tests with synthetic in-memory adapter responses. They check accepted-answer recovery, optional rating continuity, completion/integrity reconciliation, unavailable projections, and genuine answer/advance failures. These tests write no learner data and do not manufacture browser or retention evidence.
- Verification: all 795 tests pass with loopback networking enabled for the existing HTTP test; `npm run check` and `git diff --check` pass. The initial restricted run hit `listen EPERM` in the existing HTTP test. No layout changes were made. Authenticated phone/tablet/desktop persistence acceptance is still unverified.
- Hosted browser reached the real Account sign-in page and is not authenticated in this session. No answer, recall rating, human-review approval or production evidence was submitted. The previous 4/6 recommendation checkpoint has not been independently refreshed.
- Next: authenticated hosted acceptance on an explicitly designated QA learner; keep automated transport testing separate from genuine learner recall/retention evidence. M05c remains open until its hosted completion gate is verified; M05d stays evidence-gated and FSRS shadow-only.

- Hosted authentication follow-up: secure Google sign-in reached passkey verification, then Google returned “Something went wrong” with Bluetooth/device-proximity guidance. No authenticated MLOS state or learner writes were observed. PR #152 is open and GitHub Foundation checks passed; it remains unmerged.


## 2026-09-30 — hosted resume and stale-notice correction
- Secure email/password sign-in succeeded in the hosted browser. Account UI showed 7 recorded attempts, 6 correct and 7 published questions. Study Now resumed the existing six-item session at the saved answered fourth item; an acknowledged Next transition opened unanswered Question 5.
- Completion check still shows Question 5 of 6 with a selected but unsubmitted option. The session has not finished. Automatic approval review rejected the attempted submission because the prior handoff reserved Questions 5–6 for the user. No new answer or memory rating was persisted by this continuation.
- Fixed a stale resume notice that said the new unanswered question had been answered earlier: acknowledged advancement now clears notices associated with the previous cursor. Genuine transition failures keep their retry message, and completion projection failures can still display their own notice.
- Verification: six controller regressions and the full 796-test suite pass; npm run check and git diff --check pass. Hosted observation proves resume/advance persistence, not completion or revision integrity. The new notice fix is not yet deployed or verified across device sizes.
- PR #152 remains open/unmerged. Next: user submits the last two answers and finishes; then verify hosted completion integrity without inventing recall ratings or delayed-retention evidence.


## 2026-09-30 — learner Chrome completion verified; Aperture session summary
- The learner reported submitting in Chrome. A refreshed hosted account showed 10 saved attempts and 8 correct. Read-only production completion integrity independently verifies the original recommendation `84fca121-3bc0-49e5-a37e-f783b6a350b4`: selected 6, attempted 6, closed, authoritative schedules 6, hosted-browser receipts 2, complete evidence chain and hosted M05c gate true with no blockers. The subsequent one-item mistake-repair recommendation `dcd58a41-0e2f-46de-8033-33d2a0fd5fba` is also closed with its authoritative schedule and hosted gate satisfied. No answer or rating was submitted by this verification. M05c is DONE; M05d remains evidence-gated and FSRS remains shadow-only.
- Implemented the next Aperture step: an owned-session read-only results contract, session-local answered/correct/incorrect counts, canonical NeuralVault links for concepts answered incorrectly, and current next-review timing. Accuracy is explicitly not mastery. Missing schedule reads preserve results and show timing unavailable. No schema or production evidence changes.
- Completion URLs restore results on reload. Unowned/unavailable restore cannot claim confirmed completion; acknowledged closure survives summary-read failure with a read-only retry.
- Verification: 803 tests pass; npm run check and git diff --check pass. The isolated browser suite passes, including phone (390px), tablet (820px) and desktop (1440px) summary reload persistence, no horizontal overflow, Study Now completion, singleton-admin boundaries and private-file denial. Fixtures create no production evidence.
- Release requires the frontend plus study-api endpoint; this feature is stacked on unmerged PR #152 and has not been deployed. Next: merge the prerequisite and summary changes after review, deploy both surfaces, and observe an existing owned summary without creating new learner evidence.


## 2026-09-30 — Aperture summary released and hosted acceptance verified
- User continued the stated merge/release step. Reviewed the two changes and successful GitHub Foundation runs, then merged prerequisite PR #152 at `983db71f8831b5867c4338e01e4bc1d3ecbffdec`, retargeted #153 to main, and merged the summary at `a642110f34bfae4c734e9e61cf050a271b07fc9a`. The merge tree exactly matches the tested feature tree. Main's Foundation checks also pass.
- Deployed `study-api` v41 in the dedicated Medical Learning OS Supabase project. All six deployed bundle files match the merged source. The prior v40 entrypoint matches the merged code with only the summary import/route removed; existing dependency files are unchanged. Preserved existing `verify_jwt=false` because the function authenticates bearer tokens via server-side `auth.getUser()` before all routes. Unauthenticated summary GET returns 401/unauthorized. No migration, grants, new infrastructure or recurring-cost configuration changes.
- Render's existing automatic deployment serves byte-identical merged `web/medical.js` and `src/adapters/cloud-study.js`. Manual Render controls were unavailable because the connector requires an explicitly confirmed workspace; no workspace was guessed or service configuration changed. Hosted delivery is verified directly; Render dashboard status/logs were not inspected.
- The existing authenticated learner's original completed summary visibly shows 6/6 answered, 4 correct, 2 incorrect; the rabies PEP schedule and first-line anaphylaxis concepts link to NeuralVault. It shows one session item due now under the current schedule. Reload restores the same summary and results. Captured the visible release result. No answer, memory rating or clinical-review event was submitted during acceptance.
- All 803 tests and full isolated browser checks passed before release; GitHub PR and main checks passed. Hosted observation now proves the actual summary read/reload path; responsive sizes were verified with synthetic data rather than claimed as three real devices. M05c remains DONE; M05d remains evidence-gated and FSRS stays shadow-only.
- Next best implementation: review the consolidated Aperture overview and due-review entry flow for a clear return from results to the learner's next scheduled action; collect genuine delayed retrieval prospectively rather than generating retention evidence through scripted answers.


## 2026-09-30 — Aperture UX priority and results-to-revision interface
- User requested continued UX/interface work as the ongoing focus. Recorded that preference and reconciled the retrieved Aperture direction with the existing five-destination learner navigation; detailed prior assistant proposals are not treated as new user decisions.
- Implemented a calmer Home hierarchy: one time-aware Study Now link, explicit selected duration, review schedule, compact learning snapshot and secondary Vault/Exams access. Duration is optional browser-only preference state; selecting it or reloading creates no session. Missing revision data shows an unknown count and an unavailable state; upcoming-only work offers ordinary Study browsing without early reviews.
- Session results now show evidence and next revision in a responsive layout, canonical concept links have larger touch targets, and “Plan my next session” is the primary read-only action back to Home's Study Now section. QBank browsing is secondary. Study overview puts revision before question inventory and removes several learner-facing implementation labels. Existing server policy, API/schema, answer persistence, ratings and content authority are unchanged.
- Verification: all 803 tests pass; npm run check and git diff --check pass. The isolated browser suite checks phone 390px/tablet 820px/desktop 1440px, duration selection/reload persistence, no session writes during selection or return, unavailable and upcoming-only schedules, results reload, final start/resume flow and existing admin/privacy boundaries. Inspected Home and results screenshots across the responsive layouts. Fixtures are synthetic and create no production evidence. Native Safari and real hosted UX acceptance remain unverified for this slice.
- The prior release-notes PR #154 passed checks and is merged. This new interface slice is on a focused feature branch for review and is not deployed. Preview screenshots use synthetic data.
- Next interface slice: make in-question feedback and concept handoff easier to scan, then unify the Study/Vault contextual navigation. Preserve one focused study action and topic-specific support rather than labeling learner ability.


## 2026-09-30 — Aperture answer feedback and reversible Vault handoff
- Continued the user's UX/interface priority with a focused question-feedback slice, stacked on pending Home/revision UX PR #155.
- Saved-answer feedback now separates the acknowledged result, selected/correct option labels, reasoning, source links, recommendation context and optional recall self-report. Native disclosure controls reduce competing detail, the saved result receives focus after acknowledgement, and Next/Finish remains available without a rating. Corrected an existing form-label cascade that prevented option rows from using their intended flex alignment. Canonical teaching guards and all source/medical content remain intact.
- Added a bounded internal session return from an answered question's canonical concept/correction link into Vault. The return reads the existing authenticated owned-session GET and restores the server's current cursor, receipt and memory judgment; it does not start, answer, rate or advance. Reload preserves the route. A session closed on another device reconciles to results, including safe summary-outage handling; unowned/unavailable reads render a retry state without stale question/answer content. Arbitrary return URLs are rejected.
- Verification: all 806 tests pass, npm run check and git diff --check pass. Existing study/admin/privacy and correction browser suites pass. Added a responsive feedback/handoff suite to the existing CI: 390/820/1440px layouts, post-answer focus and labels, disclosure behavior, no pre-answer feedback, Vault/reload/return persistence with no extra writes, second-device closure, failed ownership and invalid return URL. Inspected phone and desktop screenshots with nonclinical synthetic fixtures. No production learner event, rating, note or review was created.
- This slice changes frontend/controller presentation and read-only restoration only. No API/schema, scheduler, publication, auth configuration, dependency or infrastructure change. It is not merged or deployed; PR #155 must land first. Native Safari and real authenticated hosted acceptance remain pending.
- Next UX slice: simplify the Vault concept detail hierarchy and make its contextual navigation consistent with Study, while keeping personal notes/corrections separate from reviewed knowledge.


## 2026-09-30 — Aperture Vault reading hierarchy and contextual navigation
- Continued the user's UX/interface priority with a focused Vault slice stacked on pending feedback/handoff PR #156. The prior feedback PR has passed GitHub checks; pending interface PRs remain unmerged and undeployed.
- Vault now centers one canonical concept heading and its reviewed note, followed by My notes and My corrections. Read-only section links scroll and focus their headings; native disclosures keep published-version details, arrival context and optional canonical correction composition available without competing with reading. Exact question-version correction handoffs still expose their targeted composer. Home, Account and the bounded Study/session return stay accessible.
- The concept browser defaults closed on narrow screens and open in wider layouts. Concept selection closes the narrow-screen browser and focuses the selected concept; search and exact concept reload remain available. Missing reviewed content stays explicit. Canonical/personal text remains escaped, and populated edit fields receive stable accessible names. No clinical content, API/schema, backend, scheduling, publication, dependency or infrastructure change.
- Verification: all 806 tests pass; npm run check and git diff --check pass. Existing responsive Study/admin/privacy, feedback/session-return and correction/report-sharing browser suites pass. Added responsive Vault coverage to CI: 390/820/1440px reading hierarchy, section focus, browser disclosure, search and concept reload, missing-note state, text escaping, personal note create/reload/revision-safe edit/delete, and no automatic writes from reading/navigation/disclosures. Inspected phone/tablet/desktop screenshots with synthetic nonclinical fixtures. No production learner event, note, correction, rating or review was created. Native Safari and real authenticated hosted acceptance remain pending.
- Next UX slice: improve Study's session-entry and resume states so the learner can clearly distinguish continuing saved work, starting a session and browsing questions, while retaining one focused primary action.


## 2026-09-30 — Aperture Study entry and durable session reload
- Continued the user's UX/interface priority with a focused Study entry slice stacked on pending Vault PR #157. Prior interface slices remain unmerged and undeployed.
- Replaced four competing Study Now starts with one selected-duration action sharing Home's optional browser preference. The action honestly says Open because the server may resume unfinished work. A returned recommendation plan distinguishes new recommended sessions from continued saved work; ordinary QBank opening uses a neutral label because its API exposes no new/resumed flag. Question browsing stays read-only and secondary, with compact exam access and native disclosure for full-mock readiness. Added contextual Home/Vault/Account navigation and a Study-overview exit from the session.
- Both successful start paths retain a bounded session ID in the resume URL. Reload authenticates and reads the existing owned session directly, without requiring overview projections or replaying Start. Existing closure-to-summary, saved-answer/optional-rating restoration and failed-ownership behavior remain intact. Ordinary opening now ignores a duplicate invocation while busy. Failed starts retain explicit retry and cannot replay automatically on reload.
- Progress-read failure now displays unknown totals and permits successfully loaded questions; question-list read failure is a temporary outage rather than a fabricated empty catalog. Schedule outages/upcoming-only work still offer ordinary QBank browsing without early recommended reviews. No new session discovery API, browser evidence store, clinical content, backend/schema, scheduler, publication, dependency or infrastructure change.
- Verification: all 806 repository tests pass, npm run check and git diff --check pass. Existing Study/admin/privacy and feedback/Vault-return browser suites pass. Added responsive Study entry checks to existing CI: 390/820/1440px, one primary action, selected-duration persistence, read-only browsing, opening busy controls, new/resumed labels, successful recommended and ordinary Start followed by GET-only reload, saved-answer restore, second-device closure, progress/schedule/question outages, failed-start explicit retry and an empty recommendation window. Inspected synthetic phone/tablet/desktop previews. No production learner answer, rating, note or review was submitted. Native Safari and real authenticated hosted acceptance remain pending.
- Next best UX step: review the integrated Home → Study → Vault → results flow across the pending interface stack and align navigation/recovery states before release.


## 2026-09-30 — Integrated Aperture UX review and recovery fixes
- Reviewed pending PRs #155–#158 together against current main c7a0f85370b0657be6254015205e2923931f9a23. All four prior PRs are open, unmerged and passing CI; inspected the combined code paths and exercised the integrated learner journey rather than treating individual screen checks as whole-flow acceptance.
- Fixed six integration findings: completed-results concept detours now return to the same saved results; a question-loading outage offers a real Reload Study action; Home projection failures no longer suppress independent available study work/counts or reuse stale projection data on retry; late Vault reads cannot replace the latest selected concept; the completion label requires explicit summary confirmation of all selected answers; persistent Study messages have a keyboard-accessible Dismiss action that returns focus to feedback or the next result action. Ordinary question browsing now focuses the browser heading.
- Added the integrated journey to existing CI at 390/820/1440px: Home duration selection → one Start → reload → one accepted synthetic answer → Vault personal note save/reload → saved-answer return → one Finish → results → Vault detour → identical results → read-only next-session planning. The fixture records exactly Start/answer/note/advance writes and proves no rating, extra start, replayed answer or implicit advance on navigation/reload. Also exercises independent progress failure, question/schedule recovery, absent-browser safety, dismissal focus and reversed-order concept response handling. Inspected phone/tablet/desktop synthetic screenshots.
- Verification: all 806 repository tests, npm run check and git diff --check pass. Existing Study/admin/privacy, feedback/Vault-return, Study-entry and Vault note-persistence browser checks pass. Strengthened the closure-outage regression with a genuinely failed summary projection; it cannot undo acknowledged closure or claim full completion. No production learner answer, rating, note, correction or review was submitted. No backend/schema, clinical content, scheduler, publication, dependency or infrastructure change.
- The combined stack remains unmerged and undeployed. Added docs/UX_RELEASE_REVIEW.md with reviewed scope, fixed findings, validation, release order and concrete remaining limits. Native Safari and authenticated hosted acceptance of the new UI are still pending. FSRS remains shadow-only; no retention/clinical milestone was promoted.
- Next best step: review and release the verified frontend stack in dependency order, then verify deployed asset parity and read-only authenticated delivery.

## 2026-09-30 — Aperture stack released; Vault draft protection follow-up
- Merged UX PRs #155, #156, #157, #158 and #159 in dependency order, retargeting each dependent PR to main and pinning its head SHA. Final release commit is 77a97c20bf2c4bb6619f36493c5fc607b0b2aa06; its complete tree exactly matches tested head 14e5572ff7552e6886f4fa1f8f453afbbcd7c72b.
- Fresh local run: all 806 tests and npm run check pass. Main Foundation run 36686530859 passes both check and full responsive browser jobs. Live Render app.js, medical.js, vault.js and styles.css match the released Git bytes exactly. No API, schema, clinical-content or infrastructure changes were required.
- Hosted saved-summary acceptance encountered an expired learner session: summary read unavailable, then QBank/Account explicitly showed signed-out state. No learner answers, ratings, notes or reviews were submitted. Authenticated hosted acceptance and native iOS Safari remain open; deployed-byte verification is complete.
- Next UX defect found in actual code: render() destroyed unsaved Vault text during search, switching concepts and failed writes. The follow-up preserves page-memory drafts scoped to learner/concept/exact form target, shows unsaved/discard controls, retains original optimistic revisions, blocks stale-revision/anchor saves and recovers text if its target disappears. Successful writes clear only their own draft. The native exit guard is best-effort; no durable/offline draft claim, automatic write, storage dependency or learner inference is introduced.
- Follow-up validation: all 806 repository tests, npm run check and git diff --check pass. The new three-width draft suite proves failed-create/correction recovery, search and concept detours, edit conflicts, explicit discard, original-target removal recovery and a dismissible exit guard without implicit writes. Existing responsive Vault persistence, private correction/report-sharing and integrated UX suites pass. Phone/tablet/desktop screenshots inspected; Vault messages now have an explicit dismiss control. Chromium was obtained through the pinned CI Playwright installer after the preinstalled newer version download failed. No repository dependency was added.
- Follow-up is prepared on fix/vault-unsaved-drafts; release will follow successful CI. Next: authenticated read-only acceptance, then navigation/accessibility consistency on Account and Exams. Native Safari remains unverified; page-memory drafts cannot survive browser termination.


## 2026-09-30 — UX release and authenticated acceptance complete
- PR #160 merged at f033f51fa2a6c52d735db852777cd4e1241893b2. Its tree matches locally verified tree 3988f4ec375f9ea8e5c629d2e660041ee30e3bb1. PR Foundation run 36687798902 and main run 36688037103 passed all tests and all browser suites, including the new draft suite.
- Live vault.js, vault-drafts.js and styles.css are byte-identical to the merged source. The prior #155–#159 UX release remains deployed. No additional infrastructure or dependency cost was introduced.
- Secure browser sign-in succeeded after the expired session. Authenticated Home displayed 11 saved attempts, 7 reviewed questions and 1 due review. The existing completed six-item session restored 6/6 answered, 4 correct and 2 incorrect; its anaphylaxis concept opened the canonical Vault workspace, Return to study restored the identical results, and reload preserved them. This was read-only acceptance: no answer, memory rating, annotation, report or human review was submitted.
- A transient Account retention_probe_consent_unavailable message was observed immediately after sign-in; Home's independent projections and the saved-session/Vault reads succeeded. Account's independent-read recovery should be investigated in the next UI slice rather than treating that observation as a diagnosed backend outage.
- Saved a live results screenshot. Native iOS Safari remains unverified. Draft failure/recovery and responsive checks use synthetic fixtures; page-memory drafts do not claim durability across browser termination. M05d and FSRS gates remain unchanged.
- Next bounded task: Account projection failure isolation and consistent learner navigation, then the remaining Exams accessibility review. Keep production learning evidence separate from interface test fixtures.

## 2026-10-02 — Cloudflare Home data access repaired
- User screenshots show Home renders on `medical-learning-os-web.medicalos.workers.dev` but schedule/progress/question counts fail, while Render displays existing learner data. Live OPTIONS reproduced HTTP 403 `origin_not_allowed` for the Cloudflare origin.
- Added only the exact deployed learner origin to study-api, review-api and retention-probe-api allowlists. Existing origin configuration, JWT validation, learner identity, RLS and heartbeat configuration remain unchanged.
- Deployed study-api v45, review-api v25 and retention-probe-api v6. Each deployment used its retrieved live bundle with only the allowlist line added, preserving live dependency files and avoiding unrelated source-format drift.
- Verification: 866 tests pass, including nine executable real-handler origin/auth regressions; npm run check and git diff --check pass. Twelve live HTTP checks confirm Cloudflare and Render preflights return 200 with exact allow-origin, unauthenticated Cloudflare reads return 401, and another workers.dev origin returns 403 without allow-origin on all three APIs.
- Added Cloudflare preflights for all three APIs to the existing manual deployed-API smoke workflow.
- This repairs the confirmed API transport blocker. Authenticated counts on the user's iPad have not been independently reread; refresh Home to reissue failed reads. No learner answers, ratings, annotations or other evidence were changed. Google OAuth callback configuration is outside this observed failure.
