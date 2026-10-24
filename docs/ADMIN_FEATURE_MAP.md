# Master Admin: implemented feature map and stability recommendations

Checked 24 October 2026. Source-backed inventory of current navigation and browser controllers; not a claim that every tool has approved live content, configured telemetry or completed authenticated production acceptance. The owner selected top-row Master Admin on tablet/iPad/desktop and phone avatar entry; its tools stay inside Admin. Broader changes below are proposals, not implemented by this placement task.

## Complete current navigation map

There are five groups and 19 destinations, counting the Overview landing tool.

| Group | Destination | Implemented work |
| --- | --- | --- |
| Overview | Overview | Summary learner/question counts, urgent reports/rights/alerts and shortcuts; no embedded mutation forms. |
| Overview | Action Inbox | Prioritized existing infrastructure alerts, learner-reported issues, unresolved rights and Medical/References/Rights review counts; links to authoritative tools. Read-only triage. |
| Overview | Platform Snapshot | Learners, recent/active/beta/suspended accounts, questions/catalog version, database size/table counts, snapshot timestamp and audit count. |
| Content & Quality | Content Intake | Paste/import JSON file, stage immutable draft, inspect original content/provenance/duplicate targets and proposed placements, record source permission evidence and exact-target review, atomic Review & publish receipt. |
| Content & Quality | Medical Relationships | Stage external assertion JSON, inspect exact source/concept bindings and gates, publish after real authority/rights/attestation, prepare linked correction, retire, inspect immutable lifecycle history. Latest 100 saved versions; pagination remains an open gap. |
| Content & Quality | Content Snapshot | Question/note lifecycle counts, canonical concepts/sources/questions, pending reviews, learner reports, unresolved rights and review evidence. |
| Content & Quality | Catalog Integrity | Explicit read-only audit of canonical question versions, PYQ metadata, sources and linked notes. Diagnostic findings do not approve or repair content automatically. |
| Content & Quality | Source Change Watch | Record possible source-version/retirement sightings and inspect affected exact question/note versions. Owner-operated evidence, not autonomous surveillance or automatic clinical edits. |
| Content & Quality | Review Workspace | Questions/canonical notes, selected authorized review gate, exact immutable target inspection, approve/reject, structured/bulk decisions, learner-report triage and correction routing. Review evidence is distinct from publication. |
| Content & Quality | Reference Review | Same review application preselecting References; source-focused/claim-first views, visual-target inspection, source-grounding assistance, experimental comparison/batch controls and measurement summaries where available. These do not confer clinical authority. |
| Content & Quality | Source Rights | Same review application preselecting Rights; source-first backlog, record verified source permission/evidence, inspect linked targets and gate decisions. Source permission alone does not approve question accuracy. |
| Learners & Access | Learner Accounts | Find account by email/exact ID, recent accounts, inspect detail, grant/revoke expiring beta access, suspend for bounded duration, restore account and inspect immutable audit history. Owner account is protected. |
| Learners & Access | Reviewer Authority | Display owner Medical/References/Rights grant state, granted time and expiry. This screen is an authority/status view, not a general staff/role-management application. |
| Learning & Research | Observed Learning | Recorded attempts/sessions/exam activity, seven-day and total counts, open sessions and latest attempt. Activity/accuracy is not validated mastery. |
| Learning & Research | Research Readiness | Protocol/content/pair/opt-in blockers, exact human pair validation, bounded feasibility authorization/revocation where eligible, eligibility/readiness and descriptive feasibility summaries. This is not an automatic scheduler launch or learner-consent override. |
| System Operations | Provider Health | Database/API/storage/Cloudflare/R2/email/error-monitoring signals; evidence sources vary between live probes, snapshots and configuration state. Includes read-only backup, storage-audit and restore-drill workflow evidence/links. |
| System Operations | Infrastructure Alerts | Open provider alerts, severity, status and first/last-seen timestamps. Missing data must remain unavailable rather than an all-clear. |
| System Operations | Feature Gates | Existing registered feature audiences: all learners, beta learners or off, with reason/typed confirmation and server enforcement. Beta access is separate from review authority. |
| System Operations | AI Usage | Telemetry readiness or available canonical AI-ledger status. A foundation/unwired screen is not a complete live AI cost/usage dashboard. |

Cross-cutting behavior: server-verified Admin access; independent review grants; exact version/digest bindings; immutable receipts; loading/retry/denial states; responsive local tools; independent group expansion; draft-safe same-document navigation. Existing Admin shortcut pins are isolated from learner menus. None of these converts software verification into medical/source-rights approval.

## Logical workflow boundaries

- Imported batch: stage draft → inspect exact content/rights/placements → genuine Review & publish → publication receipt.
- Canonical review targets: Medical/References/Rights judgments advance their own gates; verified and published are distinct states.
- Medical relationship: eligible exact concepts/source/evidence → staged assertion → genuine review/publication → correction version or retirement. Ordinary question publication does not require relationship JSON.
- Learner administration: account/beta/suspension authority is separate from reviewer authority.
- Research: readiness and human judgments do not activate research, create consent or imply validated learning effects.

## Recommended next changes (not implemented)

| Priority | Change | Purpose and scope |
| --- | --- | --- |
| P0 | Complete Action Inbox coverage | Existing inbox derives catalog-review, reports, rights and infrastructure signals. Add authoritative import-draft and relationship-draft counts/links so those pending workflows cannot be overlooked; avoid duplicate totals across gates. |
| P0 | Consistent workflow status and blockers | One presentation contract for Draft/In review/Verified/Published/Blocked/Retired, adapted to each real backend workflow. Explain required current grants, source evidence and exact-version changes; never merge the authority paths. |
| P0 | Draft safety across full-page navigation | Preserve or explicitly confirm unsaved intake/review changes across tool switches, reload/back and failed writes. Existing in-page preservation is already tested; full-page draft recovery should be designed separately with private data/account boundaries. |
| P0 | Actionable errors and deterministic retries | Translate raw error codes into the failed gate, retained work and exact next action. Keep authoritative receipts, digest checks, disabled pending mutations and idempotent retry behavior. |
| P0 before bulk ingestion | Pagination/search of Admin inboxes | Relationship inbox currently exposes latest 100 versions. Add cursor pagination and exact-ID/status/source filters without silently truncating history. Apply bounded list contracts to other inboxes as needed. |
| P1 | Guided Medical Relationship editor | Select existing concepts/source/version/type; enter claim and evidence locator. Generate validated JSON internally; retain JSON under Advanced. Preserve source bindings and real human review. |
| P1 | Separate daily work from experimental tools | Keep ordinary review clear; put reference workflow experiments, AI preflight/comparisons and research controls behind explicit Advanced/Research entry and honest readiness labels. Audit stale explanatory copy against actual released capability. |
| P1 | One read-only governance activity view | Filter/link existing review, rights, publication, relationship and learner-admin receipts. Do not create a competing audit ledger or broaden access. |
| P1 | Consistent data-health labels | Distinguish Observed/live, Snapshot/stale, Configured, Unavailable and Experimental. Missing telemetry must not read as zero or successful recovery. |
| Release gate | Genuine authenticated end-to-end acceptance | After actual clinical/rights review, verify a small real batch from Admin publication through learner Library/Study/Notes/Graph on phone/iPad/desktop. Existing synthetic browser/SQL checks remain valuable but distinct. |

Suggested implementation order: Action Inbox coverage + status/blockers + errors + draft safety; inbox pagination; guided relationship editor; simplify experimental/analytics panels; governance activity view. Keep current five top-level Admin groups rather than growing new overlapping modules. The authorized entry-placement change is separate and does not implement these proposals.

## Code references

Navigation: src/domain/app-navigation.js, web/navigation-view.js. Overview/account/content/health: web/owner-console.js, web/admin-workspace-view.js, src/domain/admin-action-inbox.js. Alerts/features: web/owner-v3-console.js. Intake: web/content-import.js. Relationships: web/medical-relationship-admin.js. Review: web/review.js and web/references-panel.js. Research: web/admin.js. Recovery evidence: src/domain/operational-recovery.js. Backend authority is enforced by the corresponding existing authenticated APIs/RPCs; this map is not a replacement contract.
