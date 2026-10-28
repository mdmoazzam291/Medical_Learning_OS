# Medical Learning OS Coverage Index — Admin integration

Status: proposed design for owner review. This document does not implement, deploy, import, approve, or publish content.

Prepared: 29 October 2026, Asia/Kolkata. Engineering evidence: main `02e499b897b83f669d421dc80e6722a0c3901483`. Target: `docs/superpowers/specs/2026-10-29-coverage-index-design.md`.

## Intent and authority

The owner wants one place to track concepts, teaching content, PYQs and QBank questions across all 19 subjects; browse by subject, system and clinical concept; manually or agent-assist additions and revisions; identify gaps; and keep an approved master collection before controlled learner publication or export to Medretica. Preparation and verification happen before approval. An empty concept must remain discoverable.

The owner chose to continue after the recommendation to integrate this into the existing admin and canonical database. The exact records, API paths, metrics and delivery phases below are engineering proposals. Approval of this design is separate from genuine clinical/source-rights review, population of a syllabus, or a production visibility cutover. No new service or separate catalog is proposed.

## Current implementation evidence

- `src/domain/content-library.js`: 19 controlled subjects; independent subjects/systems/organs/domains/tasks facets; canonical question identity, source appearances and primary/secondary/prerequisite/distractor concept roles. `projectLibrary` is learner-facing and excludes unconnected concepts. It cannot serve as the complete admin coverage inventory.
- The same module rejects imports with neither questions nor notes, and requires every imported note to have a note/question link. A future concept-only or standalone-note authoring route needs an explicit contract extension. Do not weaken the current manifest validator as a shortcut.
- `web/admin-workspace-view.js` and `web/owner-console.js`: isolated tool workspaces, Content Snapshot and Catalog Integrity. These are aggregate/integrity tools, not a syllabus coverage editor. Add one focused workspace and reuse navigation/access conventions.
- `web/content-import.js` and `content-library-api`: immutable draft imports and a combined batch Review & publish operation. Do not call this operation from an approval-only control.
- `data/preparation-curriculum.js`: versioned NEET-PG and INI-CET pathways with zero objectives, mappings or bindings. `src/domain/preparation-pathways.js` already models exact objective versions, evidence, review and teaching/assessment bindings. Reuse it; no second exam-objective model.
- The preceding read-only database audit found catalog v446, 10 concepts, 8 sources, 6 unique published questions, 6 published note versions, one published import, no draft imports, and zero rows in the separate exam-occurrences table. These are dated inventory observations, not a seed, acceptance target or proof that question metadata contains no PYQ claims. Re-read before implementation acceptance.
- PR #330 is a documentation-only proposal for Admin-only intake and per-item learner distribution. PR #318 contains unfinished Admin workflow/draft safety work. Neither is an implemented dependency. Preserve their ownership and reconcile exact contracts before overlapping implementation. Issue #326 records unresolved source/review discrepancies; a saved published flag must not be relabeled fresh verification.

## Approaches

| Approach | Tradeoff | Outcome |
|---|---|---|
| Spreadsheet as authoritative master | Convenient manual bulk editing, but separate copies and version/link reconciliation | Use only optional exports/import previews |
| Separate coverage application/database | Independent release schedule, but duplicates identity, access and review logic | Rejected for this project |
| Extend existing Admin and canonical store | Reuses IDs, access, source lineage and review; requires careful separation of approval from distribution | Recommended direction continued by the owner |

Engineering size: a project, delivered in three independently verifiable slices. Slice 1 is an inventory view; it is not the complete final approved-content workflow.

## Storage and ownership

Existing Supabase holds authoritative application records. Drive retains originals, private material governance, review packages and immutable content release packages. Git holds code, schemas and non-sensitive structural configuration; no private medical text, answer bank, rights packets or learner data enters this documentation PR. The HTML interface is a view/editor over those records, not another data store. No automatic Drive sync or watcher is implied.

Concept identity remains owned by the canonical catalog. Draft changes live in versioned proposals targeting canonical IDs, not a second independently editable set of concepts/questions. Coverage summaries are rebuildable projections. Source and exam appearances remain distinct from unique questions. Learning attempts, scores, personal annotations and progress are untouched.

## Admin experience

Add Coverage Index under the existing content tools, with its own Admin view and server authorization. Use existing opaque Sage/Lavender styling, phone/tablet/desktop layout and isolated tool navigation. Do not introduce another public navigation destination.

1. Overview: all 19 subjects, inventory totals, unclassified records, named syllabus-baseline version/status and pending work. A zero subject count is current indexed inventory, not proof the subject lacks questions globally.
2. Concepts: a searchable table/list. Each row shows canonical name/ID, subjects/systems, primary-assessment question count, other question connections, teaching-content count, PYQ claims/verified occurrences, review state, learner availability and gap flags. Concepts with no linked artifacts stay visible.
3. Concept detail: one dossier linking its exact content/question versions, source locations, objective coverage, pending revisions and history. Use the existing review and item detail tools for protected bodies and decisions; avoid a second reviewer console or competing Publish button.
4. Objectives: reuse exact task/context/depth objective records and show teaching and assessment independently. Shared subject or concept tags alone never grant an approved objective binding.
5. Approved collection: in slice 3, show exact eligible accepted versions ready for release. Review state and learner visibility are separate columns. A candidate does not qualify merely because an import receipt says published.

Initially expose subject, system, concept, question home (PYQ/platform/original), lifecycle and gap selectors plus search. Advanced filters cover organ/domain/task, concept-link role, source, exam/year/session, supported presentation/response format, and review/rights status. Terms are controlled IDs with aliases. Unknown classification is visible as Unclassified, never guessed. Counts and result lists use the same active scope. Shareable filter state excludes private payloads and credentials.

Filter semantics: baseline, concept ID, concept name/alias search and concept subject/system/organ/domain selectors choose concept rows. Question home, exam/year/session, platform/source, lifecycle, task, question-text search, presentation/response format and link-role selectors restrict the artifacts counted within those rows; they never remove a baseline concept merely because it has zero matches. If a question-classification facet is offered, label it explicitly as a question filter rather than silently coupling it to the concept classification selector. A gap selector filters the resulting concept rows after counting. Defaults leave all indexed concepts visible. For example, PYQ + a selected year must show an included concept with zero matching PYQs, not hide it.

Drafts, pending and approved records can be inspected in coverage views, but only eligible accepted versions enter Approved collection. Loading, error, incomplete snapshot, no results and a confirmed zero must render differently. Browser Back/Forward and reload preserve filters; stale responses cannot replace a newer selection. Existing active review drafts must survive workspace navigation.

## Concept checklist and syllabus baseline

The denominator is an independently maintained, versioned baseline. It is never generated from existing questions alone.

Baseline version fields: stable baseline ID, exact version ID, label, intended scope/exam where applicable, source references/locators, membership digest, predecessor, draft/accepted/retired state, real actor/time/review evidence, and declaration of included scope. Membership identifies canonical concepts and optional exact objective versions. Classification and topic relationships reference canonical IDs; a concept can be in several subject/system views. Membership acceptance is classification/scope review, not clinical approval or official syllabus certification. Official, expert-defined and historical scope evidence stay labeled.

Slice 1 has no fabricated baseline: show all existing catalog concepts as Current indexed inventory and Baseline incomplete. No whole-syllabus percentage or zero-question syllabus list is asserted. Once accepted, a baseline provides frozen membership for reproducible gaps; proposed concepts/membership remain in a separate pending view until accepted. Report retired/inactive/out-of-baseline records separately, without deleting their history.

An accepted local checklist may support a clearly labeled fraction within that named scope. It does not establish that all 19 subjects or an official exam syllabus have been exhaustively enumerated. Empty/unaccepted denominators produce null/unknown, never 0% or 100% completeness.

## Counting and gap rules

Every response pins a server snapshot identifier, as-of time, catalog version, baseline version/digest, preparation-registry version and filter contract version. Page rows, facets, summaries and exports must use that same snapshot. Use a read-only database transaction for DB-backed inputs; bind the bundled preparation registry explicitly in slice 1. Later writes invalidate/rebuild derived snapshots rather than silently mixing versions.

| Metric | Definition |
|---|---|
| Unique assessed questions | Distinct canonical question IDs with an exact current primary assessment link in the selected state/scope |
| Other linked questions | Distinct IDs linked as secondary, prerequisite, distractor or note relationship, labeled by role; not counted as direct assessment |
| Question versions | Separate history/detail metric; never silently summed into unique questions |
| Source appearances | Distinct evidenced appearances; exact repeats do not create new canonical questions |
| PYQ occurrences | Distinct canonical question + exam + year + session with evidence; declared/recalled/verified status distinguished |
| Teaching availability | Accepted eligible teaching versions linked to a concept; exact approved objective teaching bindings for objective coverage |
| Assessment availability | Exact eligible question versions with approved assessment bindings for the objective; a concept association alone is insufficient |
| Question families | Distinct explicitly reviewed family IDs; absent family tags yield unknown variety, not six independent families |

Canonical totals deduplicate across subjects, concepts, years and platforms. A multi-concept question can appear on several rows; row sums are not the grand total. One real appearance represented in both metadata and the occurrence registry is reconciled through an explicit identity/evidence mapping; unresolved duplicates remain flagged and excluded from verified-occurrence totals, not heuristically merged. This design does not migrate or consolidate those stores automatically. No verified status is inferred from a PYQ display home.

Gap flags are separate, composable facts: no direct assessment; no linked questions of any role; no teaching content; no verified PYQ occurrence; pending review; missing classification; objective lacks teaching; objective lacks assessment; variety unknown. Add a low-count threshold only as an explicit filter parameter, not a claim of adequacy. Generated, QBank and recalled questions retain their provenance.

All-material mode shows staged candidates separately. A candidate can share an ID across imports without becoming multiple canonical questions. Unresolved identities are labeled candidate counts and excluded from canonical approved counts. Approval and learner-visible modes report exact effective versions independently. A blocked or superseded version cannot satisfy approved coverage. A clinical/rights conflict warning remains separate from historical stored status; where eligibility cannot be established, approved coverage is unknown or blocked, never fabricated.

Version selection: choose the newest unresolved draft/in-review version per canonical question for the Pending column; the newest eligible accepted version for the Approved column; and the exact currently effective learner version for the Learner-visible column. A newer pending revision does not replace the accepted/learner version. Bind concept links and objective bindings to the version actually counted in each column, including the existing version-bound secondary-link metadata rule. All-material presence is the union of those representative versions, deduplicated by canonical question ID globally and within each concept row, and is labeled inventory rather than approved coverage. A question may therefore appear against different concepts in different state columns without contaminating approved results. Retired/superseded history is optional detail, excluded from current gap satisfaction. If new drafts are not individually persisted outside an import yet, show them as staged candidates until resolved rather than inventing canonical versions. Filter/snapshot receipts identify this selection policy so list and totals agree.

## Additions, edits and review

Slice 2 adds protected structured authoring: create a concept without a question, propose classification/alias changes, create a baseline, and propose objective mappings. Stable canonical IDs are assigned once; a submission uses an idempotency key, expected predecessor/digest, schema version, provenance and change reason. The server binds real actor/time and validates references, cycles and duplicate candidates. Never merge similar names automatically. No hard delete, canonical merge/redirect or bulk clinical auto-tagging is included in the first authoring release.

Concept proposals start draft. Acceptance atomically records exact review evidence and updates the canonical concept projection/classification; unchanged identities and dependent version bindings persist. A new concept can enter an accepted checklist with zero questions. Concept acceptance grants no question/note publication or exam suitability. Edits to meaning that would invalidate existing content links require a new concept identity and explicit follow-up review, not a silent semantic replacement.

Content/question edits append drafts through the existing version workflows. Do not mutate immutable imports, overwrite approved bodies, or inherit old review evidence onto changed content. Standalone teaching notes need an explicit new authoring schema that permits zero note-question links while preserving concept ownership, source evidence and normal review gates; legacy manifest v1/v2 behavior stays compatible. Missing questions then become a real coverage gap.

Reuse preparation objective/version semantics for syllabus assessment. In slice 2, protected draft authoring can persist versioned preparation-registry proposals, but the currently deployed registry remains authoritative for learner decisions. Activating a DB-backed registry requires one exact-version server resolver shared by Library and Study, coordinated rollout, parity/rollback tests and removal of any competing mutable runtime authority. Until then the UI can save proposals but must say Not active in learner preparation. Do not silently turn admin mapping edits into exam-approved recommendations.

Manual Admin forms and agent/API operations use the same validation, revision and authority boundaries. Agents may stage proposals via authorized APIs; they cannot supply reviewer identity, manufacture attestations or gain approval by supplying a status string. Network failure preserves form input. Conflict responses retain the proposal and show the changed predecessor; retries with the same request/content return the original receipt, while conflicting reuse fails. Readback confirms every save.

## Approval and release integration

Approval and learner distribution are independent dimensions. Slice 3 implements the final accepted collection and versioned release preparation by reconciling the exact approved design for PR #330. This design neither approves PR #330's existing-note visibility cutover nor duplicates its release ledger. Keep current learner delivery unchanged until that separate cutover is explicitly authorized and tested.

The approved collection checks exact content, medical/references/rights evidence, source versions, identity mappings and current holds. It records why an item is eligible or blocked; a green published badge alone is insufficient. New revisions remain private while the old approved/published version remains effective unless separately withdrawn. The final atomic release switches the eligible exact version without prematurely retiring an existing learner version.

Coverage Index links to the single canonical per-item Publish to learners control. It may prepare a frozen approved release selection/export, but must never invoke the current batch Review & publish API from an Approve or Export button. One item action cannot publish sibling questions, notes or linked dependencies. Snapshot/export generation confers no clinical or distribution authority.

For material handoff, retain readable Markdown and schema-versioned structured records/assets, manifest, validation and exact ID/version change mapping in the existing Drive release workflow before an authorized content import/publication handoff. Private full-content exports require explicit server authority; spreadsheet views must escape formula-like cells. An inventory-only export is labeled as such and cannot be passed off as a ready ingestion package. No Drive write or release creation is performed by this design task.

## Technical boundaries and rollout

Reuse existing Admin authorization and no-store API conventions. Add an authenticated coverage read endpoint with validated allowlisted filters, cursor pagination, server-enforced page bounds and deterministic ordering. Admin coverage is distinct from the published learner `/library` projection and never accepts a browser actor ID as authority. Snapshot tokens bind actor/access scope and filter versions; inaccessible/expired snapshots fail explicitly. Protected answers/review evidence are fetched on demand in authorized detail tools, not embedded in public scripts or dashboard URLs. Anonymous and learner roles cannot access admin rows through UI, HTTP, SQL, RPC, media or export paths.

Put counting and filter logic in pure domain functions with adapter-supplied snapshots. Proposed files include `src/domain/content-coverage.js`, an Admin coverage view/client, and the existing protected API/SQL adapter extensions. Exact filenames, index strategy and snapshot retention are builder decisions; retain bounded snapshot lifetimes and predictable expiration/reload semantics. New schema changes must follow current migration/permissions workflows and update export/restore and service-register coverage. No new SDK, vendor or infrastructure is needed. Do not change the coupling baseline just to pass checks.

Delivery slices:

1. Read-only inventory: Admin workspace, coherent server snapshot and role-aware concept/question/note counts, filters, current baseline/registry status, gaps in indexed inventory, links to existing Intake/Review. No publishing, authoring, Drive ingestion, fabricated checklist, or learner visibility changes. Baseline remains incomplete when absent. A missing backend shows unavailable; it does not fall back to public catalog data.
2. Checklist and authoring: protected concept-only and standalone-note proposal routes, baseline and objective proposal editing, revisions/history/concurrency, genuine scope review, accepted baseline activation, and a safe common preparation-registry resolver before learner mapping activation. Preserve old manifests and learner behavior. Actual clinical content population/review is a separate task.
3. Approved collection and releases: reconcile PR #330, integrate exact review eligibility and per-item distribution, freeze approved selections, durable Drive release-package handoff, and separately authorized production release. Do not advertise this stage as complete after slice 1.

Before any implementation, refresh main/open PR ownership and re-read PR #318/#330; serialize overlapping navigation/review/schema edits. These slices may be implemented on separate branches after design approval. Reuse current IDs and do not restore content removed by the permanent 4 October reset.

## Acceptance evidence required

- Synthetic empty concept is visible with zero direct questions, including when other concepts have questions. Unknown checklist yields Baseline incomplete and null completeness.
- One canonical question repeated in years/platforms counts once globally; occurrences remain distinct; metadata/registry duplicates do not inflate verified counts. Secondary-only links never masquerade as direct assessment. Cross-subject sums are labeled non-additive.
- Drafts, pending candidates, blocked approvals, historical published flags, current accepted versions and learner-visible versions remain distinguishable. Unknown family/verification state is not a zero or an adequacy claim.
- Filtering, facets, pagination, rows, totals and export stay on the same snapshot during concurrent writes. Unknown tags, malformed filters, expiration and stale responses have explicit safe outcomes.
- Selecting PYQ/year or any artifact-only filter preserves zero-match concept rows. A published question on concept A with a newer draft on concept B credits the corresponding columns independently; all-material totals deduplicate the identity and never credit approved B coverage from that draft.
- Concept-only addition and standalone-note addition succeed through their new authorized routes without weakening old manifests; a stale concurrent edit fails without loss. Repeated saves are idempotent. Renaming does not remap old attempts or question versions.
- Objective mapping proposals do not affect learner preparation until accepted exact-registry activation. Library/Study use the same activated registry and retain historical recommendation receipts.
- Unauthorized UI/API/SQL/RPC/export access fails; special characters cannot inject markup or spreadsheet formulas; errors do not expose answers, source documents or credentials.
- An approved item remains unpublished until explicit release; an edited item cannot inherit approvals or release dependencies. No actual clinical approvals are created by tests or agents.
- Phone, iPad/tablet and desktop flows support search/filter/detail/return, readable zero/error states and preserved drafts. Run appropriate domain/API/PostgreSQL checks, `npm test`, `npm run check`, portability/build checks and real responsive synthetic Chromium/WebKit journeys for implementation changes. Verify deployment and authenticated live behavior separately.

For this documentation task, validation is builder review, internal-link/source checks, whitespace checks and exact remote readback. No runtime tests, hosted acceptance, schema deployment, medical review, import or publication are claimed.

## Remaining decisions and scope limits

Owner review requested: approve this integrated design and the three delivery slices. Actual syllabus membership/sources and real clinical review cannot be guessed and remain future material work; no additional hosting choice is needed. Existing learner notes/questions remain unchanged by this proposal. Builder may settle file organization, bounded pagination limits, indexes and layout details within existing contracts; record material implementation choices. Do not treat design acceptance as publication, visibility-cutover or content-review authority.
