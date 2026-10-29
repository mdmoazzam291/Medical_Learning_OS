# Admin-private concept identity acceptance — gated engineering receipt

**State:** feature branch PR #334 stacked on PR #333 (stacked on PR #332). Unmerged and undeployed.
**Scope:** concept identity and classification only. No clinical/source-rights approval, syllabus certification, PYQ verification, or content/learner publication.

## Exact change

An owner-authenticated Admin chooses a saved immutable concept proposal, reviews its name, aliases, concept meaning, subject/system/organ/domain/task classification, and source locator, supplies substantive review notes and explicitly attests to identity/classification review. The protected API validates an exact request ID, proposal ID, revision, digest and attestation. Only the singleton Admin actor taken from the verified session is sent to the service-role-only database RPC.

The transaction locks the proposal and canonical catalog, verifies that the submitted revision is the latest and not stale, rejects conflicting names/aliases against both existing learner-catalog concepts and previously accepted private identities, stores a private immutable identity/classification document with its stable concept ID, and appends one immutable actor/time/review/digest receipt **without changing the learner catalog or its version**. All work commits or rolls back together. Retry with the same request and payload returns the same receipt. Reuse with changed content fails. After a confirmed save, the Admin UI reads back persisted acceptance status before showing success. An unknown network outcome keeps the original request identity and reviewer evidence.

**Deliberate safety restriction:** First acceptance version supports **new Admin-private identity records only**, including concepts with no questions. Existing-concept revisions remain saved drafts and cannot be accepted until a version-safe learner distribution contract exists, because changing existing labels/subjects could alter current learner-facing content. No publication or clinical review API is invoked. No shared `study_catalog` or `content_library_concept_metadata` write occurs, and no learner events, notes, question stems/answers, sources or exam objectives are modified. A separate future governed publication transaction is required to make this identity visible to learners.

## Security and correctness checks

- Forward-only timestamped SQL migration, with no historical migration/hash replacements.
- Browser roles have no table/RPC grants; all writes originate from the existing owner Auth/runtime/Admin boundary.
- Draft versions and accepted identity/decision records are immutable; duplicate, stale, mismatched, changed-request, wrong-actor and name/alias collisions (including across private acceptances) fail closed. A trigger prevents new revisions after acceptance but preserves idempotent request replays.
- Current source code includes unit, isolated PostgreSQL and responsive Chromium/WebKit test paths. Record verified exact-head CI evidence in the PR before considering merge.
- No production migration, owner function/site deployment, live reviewer, true multi-connection load test, backup/restore rehearsal, or real clinical-source review was carried out by this feature branch.

## Release order and next dependencies

1. Review and land/deploy parent PR #332, then PR #333 with their own migration/API/site and authenticated access-denial acceptance. Treat each production change separately.
2. Review PR #334 and only authorize deployment after exact-head Node/SQL/browser/native-WebKit checks, permission/security review and rollback preparation.
3. After the parent is released, separately stage this migration and Owner API import bundle, then the Admin frontend. Verify genuine Admin authority and anonymous/learner denial, an isolated or rollback-only synthetic acceptance, unchanged learner catalog digest/version, and invisible identity in `/vault/concepts`, `/vault/search` and other learner outputs. **Never persist a synthetic concept into production**.
4. Existing concept revisions, independent syllabus baseline, objective review, accepted collection and per-item learner release remain separate increments. Maintain the unresolved source-rights incident #326 as a hard independent gate.

## Privacy repair: private identity registry

Earlier draft code appended an accepted concept directly to `study_catalog.body.concepts`, which would expose the identity through production Study API `/vault/concepts` and `/vault/search`. This was identified before PR #334 was deployed. **The repaired acceptance path stores a frozen identity document and SHA-256 digest in the service-only, RLS-protected `content_concept_acceptances` registry.** The receipt includes `identityDigest`, `catalogVersionAtAcceptance` and explicit `learnerPublished: false`; Admin may inspect acceptance through the verified Owner API. This is *not* learner publication.

The acceptance transaction still takes the catalog publisher's advisory lock and reads the catalog for conflict detection. It does not UPDATE the catalog or concept classification metadata. The independent future learner-publication operation—not this feature—will decide whether and when a private accepted identity can enter the learner graph, after rights/review/governance requirements. There is no automated promotion from acceptance.

Isolated PostgreSQL tests must assert that acceptance does not change catalog content or version, does not write learner-facing metadata, rejects aliases colliding with another private accepted identity, prevents post-acceptance revisions and refuses direct browser-role reads. Chromium and WebKit tests must confirm private wording and readback of exact frozen identity digest.

**Do not confuse a private accepted identity with a medically reviewed or learner-published concept.**
