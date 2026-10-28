# Admin canonical concept acceptance — gated engineering receipt

**State:** feature branch PR #334 stacked on PR #333 (stacked on PR #332). Unmerged and undeployed.
**Scope:** concept identity and classification only. No clinical/source-rights approval, syllabus certification, PYQ verification, or content/learner publication.

## Exact change

An owner-authenticated Admin chooses a saved immutable concept proposal, reviews its name, aliases, concept meaning, subject/system/organ/domain/task classification, and source locator, supplies substantive review notes and explicitly attests to identity/classification review. The protected API validates an exact request ID, proposal ID, revision, digest and attestation. Only the singleton Admin actor taken from the verified session is sent to the service-role-only database RPC.

The transaction locks the proposal and canonical catalog, verifies that the submitted revision is the latest and not stale, rejects a conflicting canonical name or alias, creates the exact stable canonical concept ID and classification, increments the catalog version, and appends one immutable actor/time/review/digest receipt. All work commits or rolls back together. Retry with the same request and payload returns the same receipt. Reuse with changed content fails. After a confirmed save, the Admin UI reads back persisted acceptance status before showing success. An unknown network outcome keeps the original request identity and reviewer evidence.

**Deliberate safety restriction:** First acceptance version supports **new canonical concepts only**, including concepts with no questions. Existing-concept revisions remain saved drafts and cannot be accepted until a version-safe learner distribution contract exists, because changing existing labels/subjects could alter current learner-facing content. No publication or review API is invoked. No learner events, notes, question stems/answers, sources or exam objectives are modified.

## Security and correctness checks

- Forward-only timestamped SQL migration, with no historical migration/hash replacements.
- Browser roles have no table/RPC grants; all writes originate from the existing owner Auth/runtime/Admin boundary.
- Draft version and accepted decision ledger are immutable; duplicate, stale, mismatched, changed-request, wrong-actor and name collisions fail closed.
- Current source code includes unit, isolated PostgreSQL and responsive Chromium/WebKit test paths. Record verified exact-head CI evidence in the PR before considering merge.
- No production migration, owner function/site deployment, live reviewer, true multi-connection load test, backup/restore rehearsal, or real clinical-source review was carried out by this feature branch.

## Release order and next dependencies

1. Review and land/deploy parent PR #332, then PR #333 with their own migration/API/site and authenticated access-denial acceptance. Treat each production change separately.
2. Review PR #334 and only authorize deployment after exact-head Node/SQL/browser/native-WebKit checks, permission/security review and rollback preparation.
3. Apply the new migration, deploy the complete owner API import bundle, then Admin frontend; verify a real Admin create/accept on a deliberately synthetic nonclinical concept, guest/learner denial and no new learner-visible artifacts.
4. Existing concept revisions, independent syllabus baseline, objective review, accepted collection and per-item learner release remain separate increments. Maintain the unresolved source-rights incident #326 as a hard independent gate.

**Do not confuse a stored canonical concept with a medically reviewed item or an approved exam objective.**
