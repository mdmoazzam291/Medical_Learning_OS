# Admin Coverage Index — slice 1

Owner approved the integrated design in chat on 29 October 2026 and requested implementation. This slice is indexed inventory, not the later authoring, approved-master-collection or publication rollout.

## Use

Open Master Admin → Content & Quality → Coverage Index. All 19 subjects are selectable, including Unclassified. Concept subject/system/name choose concept rows. Question collection/exam/year/task/state restrict counted artifacts without hiding zero-match concepts. Gap selectors run after counting. Previous/next pages, reload and Back retain scope and snapshot. Refresh deliberately creates a new snapshot.

Each concept shows direct assessment, other linked questions (secondary/prerequisite/distractor and explicit note relationships), stored published/verified question versions, pending revisions, note-version inventory, declared PYQ appearances, staged entries, and exact linked version IDs. Counted note versions are inventory, not proof of teaching adequacy. Rejected/retired notes remain valid history but do not satisfy current availability.

A question repeated across concepts/subjects/years counts once globally. PYQ appearances deduplicate by canonical question/exam/year/session and obey the selected exam/year. Legacy provenance does not add a second appearance when the metadata already represents its exam/year. A newer pending primary link does not change the current published link. Pending candidates remain separate from resolved canonical question counts. Question-only filters do not infer note matches; — means not evaluated for that scope.

The syllabus baseline is deliberately incomplete. Approved coverage, verified PYQ occurrence counts, exam readiness and learning mastery are not inferred. Stored verified/published workflow flags are labeled as historical inventory; issue #326 remains independent source/review reconciliation work. No authoring or release button is added.

## Data and access

`owner_content_coverage_snapshot_v1` is executable only by service_role and separately validates the current singleton Admin actor. The existing owner-api Auth, runtime/session and Admin gates precede the route. Browser roles cannot read the new RLS-enabled table or call the RPC directly. No actor ID is accepted from browser filters.

A new snapshot reads all source tables in one SQL statement. It contains allowlisted concept/question/note/link/candidate metadata only: no question stems, answers, explanations, note bodies, original documents or free-text origin evidence. The metadata cache expires after five minutes and binds actor and preparation-registry version. An invalid, foreign, expired or registry-mismatched token fails; it never silently regenerates. Expired rows are lazily removed on snapshot creation, with no new scheduler. Snapshots are rebuildable and must not be restored as authoritative catalog content.

The API validates query fields, rejects duplicates/unknown fields, bounds pages to 100 rows and refuses incomplete/oversized snapshots (50,000 rows per family / 8 MB payload). Count projection uses indexed relationships rather than a concept×question scan. API responses expose metadata IDs/counts only. The UI does not fall back to a public catalog when the private API is unavailable. Loading/errors remove old results and response-generation guards discard stale replies.

## Implementation and delivery

- Domain: `src/domain/content-coverage.js`.
- Database: `supabase/migrations/20261028201126_admin_content_coverage_snapshots.sql` (UTC-generated filename; client date 29 October IST).
- API: existing `owner-api`, new shared `content-coverage.js` helper; route `GET /content-coverage`.
- Admin: isolated `owner-coverage` workspace, existing owner client/navigation, focused view/controller/boot/CSS assets.
- Sources remain in the existing canonical database and Drive workflow. No new provider, SDK, canonical catalog or active preparation registry.

This PR does not apply the migration or deploy a function/site. Future authorized release order is migration, owner-api bundle (including coverage domain/helper and preparation registry with all relative imports), then frontend. Rehearse on disposable data and verify genuine Admin read plus anonymous/learner denial before calling hosted acceptance complete. A missing backend shows Inventory unavailable; there is no compatibility path exposing protected catalog data. Rollback removes the new menu/view and route first; the derived cache can be discarded without deleting any canonical content or learner evidence.

Keep PR #318 Admin-draft work and PR #330 distribution design separate. No merge of either is implied. Current learner delivery and all clinical/source/rights evidence remain unchanged. Slices 2/3 cover checklist/concept/objective authoring, standalone notes, approved collection and controlled per-item release.

## Verification receipt

- Baseline: 1,487 Node tests passed before implementation.
- Latest code: 1,503 Node tests passed; syntax/catalog/ADR/portability checks passed (13 services / 236 reviewed coupling locations); Pages build passed (116 files); diff whitespace passed.
- Disposable PostgreSQL: actor/service/browser permissions, exact replay after canonical changes, registry mismatch, expiry, metadata redaction including private origin evidence, related-note links, and unchanged canonical data passed.
- Chromium: built phone/tablet/desktop flows passed filter/zero-row behavior, reload/Back, real pagination, stale responses, access/error/expiry, escaping and no writes. Screenshots were inspected; synthetic records are software fixtures only.
- Fresh whole-branch reviewer identified rejected-note handling and unscoped PYQ claims; both reproduced RED and passed GREEN. Origin evidence projection was tightened with a RED→GREEN SQL test; explicit note-question relationships gained a regression. Broader initial native-WebKit navigation CI found a duplicate workspace heading (two matches); a browser regression reproduced it, and the panel heading was changed to Indexed concepts while preserving the single Coverage Index page title.
- Native macOS WebKit coverage phone/tablet/desktop scenarios passed on earlier source7217b914. Initial full CI40762777180 failed the duplicate-heading navigation case; corrected source81d87c88 is awaiting fresh Foundation40763850459. Read current PR #332 checks for later results; this receipt does not assert they passed.
- Local Linux WebKit dependency installation was restricted. Isolated extracted dependencies allowed launch but its page crashed during navigation; this is not recorded as passing acceptance. No local dependency workaround is shipped. Native CI remains the WebKit acceptance evidence.
- No production migration, API/site deployment, real content import, human clinical/source-rights approval, learner record change or live signed-in acceptance was performed.

## Implementation rulings

- Use one existing-store Admin projection, not another catalog. The cost of incomplete baseline/review evidence is explicit unknown coverage rather than an invented percentage.
- Count note-question relationships as other linked questions, not direct assessment. This preserves the existing separate note-link contract.
- Treat unnecessary origin-evidence caching as important to the metadata-only boundary and payload capacity; remove it with a regression rather than retain it as a deferred minor.
- Retain deployment/live acceptance and clinical/source/syllabus population as separate work, as the approved slice requires; the feature is not live until released and the baseline remains incomplete.
- The reviewer did not independently rerun the broader suite/SQL/browsers. The implementer ran them and records exact limits above; the read-only review is independent, the broader test execution is not a second independent run.
