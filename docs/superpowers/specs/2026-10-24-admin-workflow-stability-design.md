# Admin workflow stability

Owner authorizes the next recommended Admin stability task and exclusion of unnecessary Admin features where appropriate. Preserve tablet/desktop top Admin entry, phone avatar entry, five groups, learner isolation, current review/source-rights authority and immutable evidence. Scope is pending-work visibility, workflow/blocker clarity, draft safety/errors and routine-screen simplification. No clinical publication, fabricated reviewer, content deletion, research activation, new persistent cache, general role manager or unrelated learner feature is authorized.

## Approach and bounds

Extend the existing shell/controllers and protected Library API. A new small read-only count RPC is preferable to deriving totals from the latest100 list or inventing a new Admin service. Use SECURITY INVOKER, existing service SELECT privileges, empty search_path, actual Admin identity check and service-only EXECUTE. No table, persistent record or public/browser grant is added. Existing list pagination is a separate bounded follow-up; the UI must state that list views remain latest100 and counts cover full history.

Protect drafts with in-memory form/default comparison and native leave warnings, not persistent storage. This avoids new private-content retention/account-isolation requirements. Warning/discard confirmation is the accepted minimum here; automatic recovery after the user confirms leaving is not promised. Existing exact-version forms/receipts remain the source of truth. Move experimental comparison/batch panels behind a collapsed Advanced disclosure, retaining routes/evidence and normal review controls.

## Pending-work contract

RPC public.admin_workflow_summary_v1(p_actor uuid) returns contractId=admin-workflow-summary-v1, asOf timestamp, draftImportBatches and draftRelationshipAssertions. All counts are exact nonnegative counts from the full current database snapshot. Imports count status=draft. Relationships count only the highest version per relationship identity with no published/retired event for that exact version. An older draft, a published version, or a retired latest version must never count; retiring a correction never revives older work. This counts need for inspection, not clinical publishability.

Expose GET /admin-workflow on content-library-api, after existing Auth/runtime/actual Admin checks, passing only the server-derived actor to the RPC. Reject query/actor injection and non-GET methods. Return no clinical bodies, actor identifiers or rights evidence. Summary failure/malformed payload is unknown/unavailable, never zero. Existing owner dashboard and other tools remain usable when this independent source fails.

Owner overview and Action Inbox display the two separate pending families, separate timestamps, a read-only Refresh pending work action and explicit missing evidence. Do not sum overlapping review-gate counts. Refresh updates only read-only summary/inbox DOM, not loaded mutation forms. Guard overlapping/late reads by request generation and current main identity. Current list limits are disclosed, not presented as totals or silently removed.

## Workflow clarity and errors

Keep persisted lifecycle and computed blockers distinct. Batch draft is not published; publication receipt is authoritative. Canonical verified is not published. Relationship superseded/retired versions cannot be treated as current pending work; an existing publication receipt is not proof that current bindings/rights/grants are eligible.

Import inspection returns actual current reviewKinds from the existing Admin status helper. Display missing current Medical/References/Rights authority; absent/malformed authority is unknown and publication controls fail closed. Show actual source permission/evidence and attestation completeness separately; do not infer rights from declared source text or invent human approval. Server always rechecks on write.

Shared Admin error presentation maps authentication, expired review authority, malformed JSON, unresolved rights, stale digest/binding, conflict and unavailable/network cases to a readable reason and next action, retaining bounded technical codes for diagnosis. Say fields are retained only for failing writes whose form is still mounted. Do not retry publication automatically or turn a failed read into approval.

## Draft and mutation safety

Cover import manifest/file input, import publication evidence/notes, relationship stage/review/retirement, canonical review/rights/report forms and owner mutation reason/confirmation forms. Search/filter-only forms are not unsaved mutation drafts. Compare editable controls to their server-rendered/default baseline; editing then restoring the default is clean. Treat programmatic imported/correction JSON as dirty until successfully staged. Skip disabled/hidden transport fields when assessing user draft content, but do not lose pending mutation warnings.

Warn before document unload and confirm before an internal switch/filter/reload that would replace dirty form DOM. Cancel must restore the previous filter/selection and avoid requests/writes. Existing same-document Admin navigation keeps mounted forms and does not prompt needlessly. Successful staging marks only the saved stage form clean; failures preserve input, notes, choices and attestations.

During a write, lock the relevant controls (or review workspace where a global reload follows), restore previous disabled state on failure, and never replace dirty form DOM merely to show a pending state. Before a successful action can replace other dirty forms, obtain the ordinary in-app discard confirmation first. Runtime authorization loss may remove protected controls immediately; no persistent draft cache or recovered cross-account content is introduced.

## Simpler daily review

Keep ordinary exact-target Medical/References/Rights review and necessary source evidence visible. Put reference workflow comparison/measurement pilot controls and their experimental batch forms under a clearly labeled collapsed Advanced review tools disclosure. Preserve the chosen disclosure during in-page review redraws when possible. Do not delete historical evidence, disable clinical gates, remove current tools or add new navigation groups. Replace routine engineering milestone badges with ordinary Review wording where touched. Research remains in its existing separate group; do not activate experiments or create a new AI dashboard.

## Verification and release

Use synthetic-only Node/SQL/browser fixtures. RED tests cover full-count >100 and relationship latest-version/event semantics, unauthorized RPC/API, unknown count handling and independent failures, actual form preservation and cancel/restore paths, pending locks, safe error escaping, Advanced disclosure reachability, and unchanged learner/nav authority. Run full suite/check/build, exact SQL replay and Chromium/native WebKit phone/iPad/desktop journeys. Preserve baseline/failed states in checkpoints and obtain a fresh independent code review. Apply only reviewed committed migration and deploy the exact additive Library API bundle; preserve its current JWT/runtime checks. Verify ledger/function ACL/volatility, deployed source and real aggregate state without invoking hosted publication or inventing an actor. Production authenticated/human clinical acceptance remains separate.
