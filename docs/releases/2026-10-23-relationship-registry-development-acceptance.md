# Relationship registry development acceptance — 23 October 2026

PR309 implements issue299's protected registry for the existing Medical graph. It is a release candidate, not a live deployment or clinical signoff. Preserve the existing empty production catalog until real content passes its actual review gates.

## Reviewable release

Base main: `d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60`.
Product implementation: `026d2eb642827a9ffebe765f0250ce6aa4b9d41d`.
Final tested code/test head: `3f9c112f3b93073bca77a07ba27d7e0e4585e29c`, tree `b414a7deff2006fa3df1e868fe74048cb236c086`.

| Artifact | SHA-256 |
| --- | --- |
| `supabase/migrations/20261023091436_medical_relationship_registry.sql` | `69493ff4704ca3488b87c6a4ae8f09eb7f0ccb9ed2ccae87269a3fb7491ae74b` |
| `supabase/functions/content-library-api/_shared/handler.js` | `9c7b3e5a5f25c243d8fa89de0e49211ac5ce04dc5d684eab3c3007d64b04d85f` |
| `web/medical-relationship-admin.js` | `3d025c9aa2877acf94cd4a57ab10fddac055c42eda125c20cd07ff617a909def` |

The migration creates two governed-content tables, immutable lifecycle triggers, service-only RPCs and extends the existing snapshot. It creates no claims, sources, grants or human attestations, and does not update catalog data. Source permissions come from the existing source-rights events. Publication still requires the actual human's current Admin plus Medical/References/Rights grants. External-curator-only intake preserves ADR-097's native self-review boundary.

The API keeps its existing8-file bundle; no new backend import is introduced. Static delivery adds one allowlisted controller for110 total build files. Release order: authorized transactional migration → inspect RLS/ACL/security and unchanged catalog counts → existing API bundle with changed handler → static bundle → anonymous/learner/Admin empty-state checks. Actual clinician publication is never performed by the release agent. See [registry lifecycle, privacy, export and fail-closed rollback](../MEDICAL_RELATIONSHIP_REGISTRY.md).

## Evidence

- Clean baseline1441/1441; final local1453/1453 Node tests, no failures. Focused controller/route/adjacent-draft15/15; independent reviewer also passed22focused tests and PGlite before the material fix.
- Exact new migration in disposable PostgreSQL: genuine current singleton-Admin/reviewer/source fingerprint helpers with minimal platform shapes; target digests, grants/expiry/rotation, rights, source/endpoint drift, latest suppression, retirement, idempotency, immutable rows, role denials and rollback. Not a full hosted migration replay or multi-connection contention rehearsal.
- Existing ACL replay needed a chronology correction: future table shapes are now created at their migration boundary rather than before earlier audits. Final71tables/195statements with explicit negative controls pass. Existing privacy scope, access manifest, recovered baseline and question-intelligence PostgreSQL checks also pass.
- npm check passes13services/229reviewed coupling locations,110-file static build and whitespace check pass.
- Fresh independent whole-branch review: no Critical/Minor; one Important pending-edit loss. Four new regression tests failed first. Fix locks all editors across mutation and subsequent inspection, retains failed drafts and confirms discard of another form's edits. Five UI regressions and full1453 suite pass after the fix. No second independent review claimed.
- Hosted Foundation39931728460 deliberately observed missing-panel RED in Chromium/WebKit. First implementation39932206590 reached publication then exposed a fixture-only interception gap for the second tab. After context-wide routing,39933229293 reached corrected-draft suppression; its expectation incorrectly assumed a published concept would remain when the sole eligible claim disappeared. Corrected the assertion to the truthful empty-concept prompt, zero edges and no draft claim leakage. No product graph fix was inferred from either fixture defect.
- Final Foundation39933609853 at3f9c112: check, Chromium and WebKit ALL SUCCESS. Protected relationship phone/tablet/desktop journey and all adjacent navigation/library/preparation/retention/review journeys passed. Final phone/tablet/desktop relationship screenshots from responsive-preview artifact12493172036 were inspected: escaped claim markup, readable wrapping and no horizontal overflow. This is synthetic browser acceptance, not a new signed-in production acceptance. Hosted static artifact12493215522 exactly matches all110local build files; ZIP SHA256dd1451d8cd8a02fbe2761337a55c7d980ea74ed8426da91645d7643e1b2123dd.

## Limits and pending authorization

No production DDL, merge, API/static deployment, clinical content ingestion/publication, human attestation, grants, research enrollment, learner responses or provider settings changed. The existing production release remains live; software acceptance does not establish medical correctness or populated-content acceptance301.

The current Admin inbox lists latest100 versions. Pagination300 remains separate; older identities may require a known exact version ID. Advisory/catalog locks and stale-predecessor rejection are reviewed and exercised on one PGlite connection, not with simultaneous PostgreSQL sessions. A full hosted restore of the new schema is unverified; backups must include both new ledgers and their canonical/Auth/reviewer/source dependencies. Private material remains unapproved and outside Git.
