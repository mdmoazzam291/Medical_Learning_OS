# Admin concept draft editor

Implemented 29 October 2026 as the first authoring increment of the accepted Coverage Index design. Stacked PR #333 is based on PR #332; neither change has been merged or deployed by this task. PR #332 final0775a683 passes all Foundation40764606041 jobs, including native WebKit, and is ready for review.

## What Admin can do

Inside Coverage Index, use Concept drafts to start a new concept without questions or select an existing canonical target for a revision proposal. Enter name, aliases, subject/system/organ/domain/task classifications, a source locator and change reason. Save creates an immutable draft revision and confirms its exact content by readback. Saved draft IDs and history remain separate from accepted coverage; no clinical approval or learner publication is inferred.

New concepts receive stable server IDs. Existing targets bind an exact fingerprint of both the canonical record and classification. A changed canonical base or draft predecessor conflicts rather than overwriting history. Label/alias matches are advisory, not automatic merges. Older revisions are read-only; open the latest revision before editing. Draft lists are paginated in 50-row pages, history shows the latest50 revisions, and canonical selection refuses more than5000 records or4MB instead of pretending to be complete. Canonical selection is projected in one query.

The editor is a separate sibling of the inventory view, so inventory filters do not erase an unsaved concept form. Deliberate target/proposal replacement and unload prompt for dirty input. No private draft bodies are stored in browser persistence. Network/readback failures retain typed content and frozen retry identity. Newer typing may remain unsaved while an earlier revision is confirmed; it is never silently overwritten.

## Persistence and access

The immutable content_concept_draft_versions table stores proposed identity, operation, exact canonical-base/predecessor digests, document, server actor/time and request fingerprint. Request and proposal advisory transaction locks serialize retries/revisions. Same key/body returns the original receipt, including after newer revisions; changed payload under the key fails. Browser/public roles have no table/RPC access. Existing owner Auth/runtime/singleton Admin checks supply the actor; payloads cannot supply approval status, reviewer identity or timestamps.

Only a definitely noncommitting request rejection can release a retry identity. A known successful write or earlier uncertain write retains its identity even if a later POST or exact GET returns403/404. Pending retries bypass native validation of newer incomplete form fields, because the separately frozen document is already validated; new saves retain required-field/domain/SQL checks.

No SQL function updates the canonical catalog, concept metadata, question/note versions, preparation registry, learner records or publication state. This is not a second canonical catalog. Concept acceptance, baseline/objective authoring/activation, standalone notes and approved release remain later increments.

## Engineering receipt

Remote runtime code 2af00ae693d18668a12f57cff1b319443c64eb85; source tree be4464b8ecd5d9ebe9886154fd94bf7f5d0d5c6b. Final documentation may follow that runtime commit.

- 1,511 Node tests pass; check passes (13 services /240 reviewed coupling locations);118-file Pages build and diff whitespace pass.
- Disposable PostgreSQL checks pass: zero-question creation, revision history/exact readback, stable IDs, same/conflicting retries, stale canonical target/predecessor, advisory duplicate names, strict input types/facet bounds, browser/service isolation and unchanged canonical inventory.
- Chromium phone/tablet/desktop editor and inventory regressions pass. Explicit editor scenarios cover committed-but-unconfirmed writes,403/404 readbacks, denied retries after uncertain writes, incomplete newer typing, normal required-field validation, readonly history, conflicts, escaping and independent inventory navigation.
- Fresh read-only review identified lost retry identity across write/readback errors. A browser regression failed before the fix and passes afterward. The native-validation recovery issue was treated as important to the same retry guarantee and fixed/tested in the same pass. No unaddressed Critical/Important findings and no deferred minor findings remain from that review.
- Full new-branch native CI is tracked in PR #333 and is not asserted passing in this source receipt. Parent PR #332 native acceptance is separate evidence. Hosted authentication, migration application, live API/browser behavior, production-volume latency, actual backup/restore and true simultaneous multi-connection load were not performed. Advisory lock behavior was inspected and stale requests/retries tested in disposable SQL; this is not a concurrency stress test.

## Release and remaining work

Do not merge or deploy through this engineering receipt. After explicit release authorization, land/reconcile #332 first, apply the new migration, deploy the owner API with its complete relative-import bundle, then frontend, and verify real Admin access plus learner/anonymous denial. Keep all concept records as drafts and preserve the immutable request/history mappings. Private source notes belong in protected backups/exports; restore proposals as drafts, never accepted concepts. The service register records these ownership/export limits.

Reviewer exclusions were retained deliberately: production operations and material/clinical acceptance are separate work; volume/concurrency/restore acceptance is unclaimed; source tests and browser execution are by the implementer rather than a second independent run. The cost is that this source branch is not a hosted acceptance or approved syllabus. No source material, Drive governance, learner data or production setting was changed.

