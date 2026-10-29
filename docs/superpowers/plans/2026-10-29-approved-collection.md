# Approved Collection evidence preflight implementation plan

> Execute inline under the existing owner-approved Coverage Index design and current instruction to implement the next major task.

**Goal:** Give Admin a read-only exact-version collection with current review/source evidence, blockers and separate stored publication state.
**Architecture:** One bounded service-only PostgreSQL snapshot RPC computes existing gate fingerprints in a single read transaction. Pure domain projection filters/paginates metadata; existing Owner API authorizes the server actor. No new authoritative store or publication control.
**Spec:** docs/superpowers/specs/2026-10-29-coverage-index-design.md, Approval and release integration.

## Constraints and rulings
- Based on PR332 exact head 0775a683, isolated feature branch; no dependency on unmerged concept/syllabus writes. No production deployment or canonical/learner writes.
- Evidence-current is necessary, not sufficient, for release: unresolved external issue326 and unimplemented per-item distribution mean release readiness remains not assessed and publicationAuthority=false.
- Include each version separately; newer pending revisions cannot replace existing learner versions. Stored published status is labeled historical state, not a verified new distribution ledger.
- Block all unresolved/correction-required reports matching the question version or note version; conservative history may require manual reconciliation.
- Bounds: 2,000 total question/note versions, 8 MB result, 100 rows/page. Reject incomplete/oversized inputs rather than truncate. No full content, reviewer identity/notes, source evidence or learner reports leave SQL.

## Tasks
- [ ] Domain tests RED→GREEN: exact gate states, stale/missing/rejected evidence, source rights, lifecycle, duplicate identities, separate pending/published, filtering/pagination and malformed snapshots.
- [ ] SQL/API tests RED→GREEN: existing fingerprints, singleton actor, browser denial, source-count mismatch, source restriction/staleness, open reports, metadata-only projection and no writes. API accepts allowlisted filters only and retains server actor.
- [ ] Admin read-only UI: focused workspace, safe markup, loading/error/zero states, search/status filters, page selection, stale request protection and no publication action. Synthetic Chromium phone/tablet/desktop acceptance.
- [ ] Verify full Node/check/build, isolated SQL, browser scenarios; record actual limitations; preserve branch and open draft PR against PR332.

## Review focus
Missing source arrays cannot count as clearance. Same-ID duplicate versions fail closed. Unavailable fingerprints cannot create green states. Content bodies/private evidence never appear in response or errors. Existing routes and current learner visibility remain unchanged.
